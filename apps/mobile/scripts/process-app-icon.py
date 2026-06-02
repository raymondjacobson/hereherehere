#!/usr/bin/env python3
"""
Build platform icon assets from two source plates.

  ICON_SRC  A full-bleed gradient square (no margin, no rounded corners). The
            OS applies its own corner mask, so the art must run edge-to-edge.
  FAVI_SRC  A rounded tile with transparent corners (and a soft shadow). The
            web does no masking, so the favicon keeps the rounded silhouette.

Outputs:
  assets/images/icon.png                   iOS: full-bleed 1024, no alpha.
  assets/images/android-icon-foreground.png  Android: the art scaled into the
                                           adaptive safe zone (Android shows only
                                           the center ~66%) on a transparent
                                           canvas; pair with the backgroundColor
                                           printed at the end.
  assets/images/favicon.png                Web: rounded tile, transparent corners.

Requires: Pillow, numpy
Usage:    python3 apps/mobile/scripts/process-app-icon.py ICON_SRC.png FAVI_SRC.png
"""
import os
import sys
import numpy as np
from PIL import Image

ICON_SRC = sys.argv[1]
FAVI_SRC = sys.argv[2]
OUT = os.path.join(os.path.dirname(__file__), "..", "assets", "images")
ICON_PX = 1024
ANDROID_PX = 1024
ANDROID_SAFE = 0.84          # fill most of the frame; figures stay inside even a
                             # strict circular mask, gradient corners may be cropped
FAVICON_PX = 256


def main():
    os.makedirs(OUT, exist_ok=True)

    # iOS: full-bleed, flatten any alpha onto itself (source has none), no alpha out
    icon = Image.open(ICON_SRC).convert("RGB")
    icon.resize((ICON_PX, ICON_PX), Image.LANCZOS).save(os.path.join(OUT, "icon.png"))

    # Android: scale the full-bleed art into the safe zone on a transparent canvas
    inner = int(ANDROID_PX * ANDROID_SAFE)
    tile = icon.resize((inner, inner), Image.LANCZOS).convert("RGBA")
    canvas = Image.new("RGBA", (ANDROID_PX, ANDROID_PX), (0, 0, 0, 0))
    off = (ANDROID_PX - inner) // 2
    canvas.paste(tile, (off, off))
    canvas.save(os.path.join(OUT, "android-icon-foreground.png"))

    # Web favicon: trim to the rounded tile (alpha>0.6 drops the faint shadow),
    # square it, keep transparent corners.
    fav = Image.open(FAVI_SRC).convert("RGBA")
    a = np.asarray(fav)[..., 3]
    ys, xs = np.where(a > 153)
    x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
    fav = fav.crop((x0, y0, x1, y1))
    side = max(fav.size)
    sq = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    sq.paste(fav, ((side - fav.size[0]) // 2, (side - fav.size[1]) // 2))
    sq.resize((FAVICON_PX, FAVICON_PX), Image.LANCZOS).save(os.path.join(OUT, "favicon.png"))

    avg = np.asarray(icon).reshape(-1, 3).mean(0).round().astype(int)
    print(f"icon.png, android-icon-foreground.png, favicon.png written to {OUT}")
    print(f"suggested adaptiveIcon.backgroundColor: #{avg[0]:02X}{avg[1]:02X}{avg[2]:02X}")


if __name__ == "__main__":
    main()
