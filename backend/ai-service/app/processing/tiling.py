"""Overlapping tiled inference so large microscopy images fit in limited GPU memory.

Each tile is processed with `overlap` pixels of context on every side; only the tile's
centre is written back, which removes visible seams at tile borders.
"""
from __future__ import annotations

from collections.abc import Callable

import numpy as np

TileFn = Callable[[np.ndarray], np.ndarray]


def run_tiled(fn: TileFn, pixels: np.ndarray, scale: int, tile: int, overlap: int) -> np.ndarray:
    """Applies `fn` (HxWxC -> sH x sW x C) over `pixels` in tiles. `tile=0` disables tiling."""
    height, width, channels = pixels.shape
    if tile <= 0 or (height <= tile and width <= tile):
        return fn(pixels)

    output = np.zeros((height * scale, width * scale, channels), dtype=np.float32)
    for y0 in range(0, height, tile):
        for x0 in range(0, width, tile):
            y1, x1 = min(y0 + tile, height), min(x0 + tile, width)
            py0, px0 = max(y0 - overlap, 0), max(x0 - overlap, 0)
            py1, px1 = min(y1 + overlap, height), min(x1 + overlap, width)

            result = fn(pixels[py0:py1, px0:px1])
            oy, ox = (y0 - py0) * scale, (x0 - px0) * scale
            output[y0 * scale : y1 * scale, x0 * scale : x1 * scale] = result[
                oy : oy + (y1 - y0) * scale, ox : ox + (x1 - x0) * scale
            ]
    return output
