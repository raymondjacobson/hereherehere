#!/usr/bin/env python3
"""
Turn the raw claymation icon plates into transparent in-app motifs.

The source files (in `~/Downloads/hhh icons` by default) are 1254x1254 squares
with a small clay subject floating on a near-white background and a soft
grounding shadow. This script cuts the subject out of that plate so it can be
dropped onto any colored surface in the app, then writes trimmed, square,
transparent PNGs to `apps/mobile/assets/motifs/` at @1x / @2x / @3x densities.

Two strategies, chosen per file:

  * Solid subjects (heart, bluetooth, qr, new, notification, pathfind) are
    matted by flood-filling the background from the image border, keying on
    "light AND desaturated" so the white plate and its gray shadow drop out
    while colored/dark clay is kept. Flood-filling from the border (rather than
    a global color key) preserves light *interior* regions like the phone
    screen or the QR code. A final alpha curve crisps the edge to kill the faint
    light halo that a plain feather leaves on dark backgrounds.

  * Glass bottles (message, encrypted, old_message) can't be fully cut out --
    their glass is translucent and near-white, so keying it dissolves the bottle
    and leaves the cork/note floating. Instead we find the bottle silhouette from
    its edges (the glass has a closed outline; the shadow doesn't), render the
    glass as a semi-transparent frosted-white shape, and keep the solid contents
    (cork, note, chain, lock) fully opaque.

Requires: Pillow, numpy, scipy  (pip install --user Pillow numpy scipy)
Usage:    python3 apps/mobile/scripts/process-motifs.py [SRC_DIR]
"""
import os
import sys
import glob
import numpy as np
from PIL import Image
from scipy import ndimage

SRC = sys.argv[1] if len(sys.argv) > 1 else os.path.expanduser("~/Downloads/hhh icons")
DST = os.path.join(os.path.dirname(__file__), "..", "assets", "motifs")
BOTTLES = {"message", "encrypted", "old_message", "post"}
SIZES = {"": 192, "@2x": 384, "@3x": 576}


def border_bg(rgb):
    r = np.concatenate([rgb[:14].reshape(-1, 3), rgb[-14:].reshape(-1, 3),
                        rgb[:, :14].reshape(-1, 3), rgb[:, -14:].reshape(-1, 3)])
    return np.median(r, 0)


def solid_matte(rgb, sat_max=0.16, val_min=0.74):
    mx = rgb.max(2) / 255
    mn = rgb.min(2) / 255
    sat = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-6), 0)
    val = mx
    cand = (sat < sat_max) & (val > val_min)              # light + desaturated
    seed = np.zeros_like(cand)
    seed[0, :] = seed[-1, :] = seed[:, 0] = seed[:, -1] = True
    seed &= cand
    bg = ndimage.binary_propagation(seed, mask=cand)      # flood fill from border
    fg = ndimage.binary_fill_holes(~bg)
    fg = ndimage.binary_opening(fg, iterations=2)
    lbl, n = ndimage.label(fg)
    if n > 1:                                             # drop stray specks
        s = ndimage.sum(np.ones_like(lbl), lbl, range(1, n + 1))
        fg = np.isin(lbl, [i + 1 for i, v in enumerate(s) if v > 0.02 * s.max()])
    core = ndimage.binary_erosion(fg, iterations=2)       # shed white-mixed rim
    a = np.clip(ndimage.gaussian_filter(core.astype(float), 1.2), 0, 1)
    a = np.clip((a - 0.30) / (0.92 - 0.30), 0, 1)         # defringe / crisp edge
    return rgb, a * 255, a > 0.5


def bottle_matte(rgb):
    bgc = border_bg(rgb)
    gray = rgb.mean(2)
    grad = np.hypot(ndimage.sobel(gray, 0), ndimage.sobel(gray, 1))
    edges = ndimage.binary_dilation(grad > grad.max() * 0.06, iterations=3)
    sil = ndimage.binary_fill_holes(edges)
    sil = ndimage.binary_opening(ndimage.binary_erosion(sil, iterations=2), iterations=2)
    lbl, n = ndimage.label(sil)
    if n >= 1:                                            # bottle = largest blob
        s = ndimage.sum(np.ones_like(lbl), lbl, range(1, n + 1))
        sil = lbl == (1 + int(np.argmax(s)))
    # Solid clay (cork, note, ring, plus any separate element like a cross) is
    # detected across the WHOLE image, not just inside the bottle, so motifs
    # that pair a bottle with a standalone solid keep that element opaque.
    mx = rgb.max(2) / 255
    mn = rgb.min(2) / 255
    sat = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-6), 0)
    val = mx
    dist = np.sqrt(((rgb - bgc) ** 2).sum(2))
    solid = ((sat > 0.18) | (val < 0.62)) & (dist > 30)
    solid = ndimage.binary_closing(solid, iterations=2)
    lbl, n = ndimage.label(solid)                         # drop tiny specks
    if n > 1:
        s = ndimage.sum(np.ones_like(lbl), lbl, range(1, n + 1))
        solid = np.isin(lbl, [i + 1 for i, v in enumerate(s) if v > 500])
    glass = sil & ~solid
    a = np.zeros(gray.shape)
    a[glass] = 0.42                                       # frosted-glass opacity
    a[solid] = 1.0
    a = ndimage.gaussian_filter(a, 1.0)
    col = rgb.copy()
    col[glass] = 0.55 * np.array([248, 248, 250.0]) + 0.45 * rgb[glass]
    return np.clip(col, 0, 255), np.clip(a, 0, 1) * 255, (sil | solid)


def run(path):
    name = os.path.splitext(os.path.basename(path))[0]
    rgb = np.asarray(Image.open(path).convert("RGB")).astype(np.float64)
    h, w, _ = rgb.shape
    col, alpha, cover = bottle_matte(rgb) if name in BOTTLES else solid_matte(rgb)
    im = Image.fromarray(np.dstack([col, alpha]).astype(np.uint8))
    ys, xs = np.where(cover)
    x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max()
    pad = int(max(x1 - x0, y1 - y0) * 0.07)
    im = im.crop((max(0, x0 - pad), max(0, y0 - pad), min(w, x1 + pad + 1), min(h, y1 + pad + 1)))
    cw, ch = im.size
    side = max(cw, ch)
    sq = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    sq.paste(im, ((side - cw) // 2, (side - ch) // 2))
    for suf, px in SIZES.items():
        sq.resize((px, px), Image.LANCZOS).save(os.path.join(DST, f"{name}{suf}.png"))
    return name


if __name__ == "__main__":
    os.makedirs(DST, exist_ok=True)
    names = [run(p) for p in sorted(glob.glob(os.path.join(SRC, "*.png")))]
    print("processed:", ", ".join(names))
