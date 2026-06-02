#!/usr/bin/env python3
"""
Cut the near-white backdrop out of the onboarding scene plates so the clay
crowd can float on the site's pastel gradient.

Source plates (apps/mobile/assets/onboarding/*.png) are 1254x1254 squares with
the crowd on a light, slightly-gray background plus soft ground shadows and a
few light dashed path marks. We:

  1. Key the background as "light AND desaturated" pixels.
  2. Flood-fill that key from the image border so light *interior* regions
     (the glass lock-bottles, pale clothing) are preserved.
  3. Drop tiny stray foreground specks (the dashed path marks).
  4. Feather + crisp the alpha edge to kill the white halo.

Outputs transparent WebP at ~1000px to apps/web/public/.
"""
import os
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

HERE = os.path.dirname(__file__)
SRC = os.path.normpath(os.path.join(HERE, "..", "..", "mobile", "assets", "onboarding"))
DST = os.path.normpath(os.path.join(HERE, "..", "public"))

# friends-crowd -> scene1, carry-private -> scene (hero / step 2), refresh-crowd -> scene3
PLATES = {
    "friends-crowd": "scene1",
    "carry-private": "scene",
    "refresh-crowd": "scene3",
}

L_THRESH = 218   # >= this lightness counts as "light"
S_THRESH = 30    # <= this saturation counts as "desaturated"
OUT_W = 1000
MIN_SPECK = 900  # foreground blobs smaller than this (px) are dropped


def matte(path: str) -> Image.Image:
    img = Image.open(path).convert("RGB")
    arr = np.asarray(img).astype(np.int16)
    r, g, b = arr[..., 0], arr[..., 1], arr[..., 2]
    mx = np.maximum(np.maximum(r, g), b)
    mn = np.minimum(np.minimum(r, g), b)
    light = mx >= L_THRESH
    desat = (mx - mn) <= S_THRESH
    bg_key = light & desat

    # Flood from the border: only background connected to the edge is removed.
    lbl, n = ndimage.label(bg_key)
    border = set(lbl[0, :]) | set(lbl[-1, :]) | set(lbl[:, 0]) | set(lbl[:, -1])
    border.discard(0)
    bg = np.isin(lbl, list(border))

    fg = ~bg
    # Drop tiny stray foreground specks (e.g. the dashed path marks).
    flbl, fn = ndimage.label(fg)
    sizes = ndimage.sum(np.ones_like(flbl), flbl, index=np.arange(1, fn + 1))
    keep = {i + 1 for i, s in enumerate(sizes) if s >= MIN_SPECK}
    fg = np.isin(flbl, list(keep))
    # Close pinholes inside the kept subject.
    fg = ndimage.binary_fill_holes(fg)

    alpha = Image.fromarray((fg * 255).astype(np.uint8), "L")
    # Feather then crisp: blur the matte, then push the curve so edges stay tight
    # and the pale halo disappears.
    alpha = alpha.filter(ImageFilter.GaussianBlur(1.4))
    a = np.asarray(alpha).astype(np.float32) / 255.0
    a = np.clip((a - 0.45) / 0.30, 0.0, 1.0)  # contrast curve around the edge
    alpha = Image.fromarray((a * 255).astype(np.uint8), "L")

    out = img.convert("RGBA")
    out.putalpha(alpha)
    return out


def main():
    for src_name, out_name in PLATES.items():
        src = os.path.join(SRC, f"{src_name}.png")
        out = matte(src)
        w, h = out.size
        out = out.resize((OUT_W, round(h * OUT_W / w)), Image.LANCZOS)
        dst = os.path.join(DST, f"{out_name}.webp")
        out.save(dst, "WEBP", quality=86, method=6)
        kb = os.path.getsize(dst) / 1024
        print(f"{src_name} -> {out_name}.webp  ({kb:.0f} KB)")


if __name__ == "__main__":
    main()
