"""Degradation analysis of an input image (drives model recommendations)."""
from __future__ import annotations

import numpy as np

from app.processing.image_io import DecodedImage
from app.quality.metrics import no_reference

ANALYSIS_MAX_PIXELS = 1_000_000  # analyse a centre crop of huge images for speed


def _centre_crop(pixels: np.ndarray) -> np.ndarray:
    height, width = pixels.shape[:2]
    if height * width <= ANALYSIS_MAX_PIXELS:
        return pixels
    side = int(ANALYSIS_MAX_PIXELS**0.5)
    y0, x0 = max((height - side) // 2, 0), max((width - side) // 2, 0)
    return pixels[y0 : y0 + side, x0 : x0 + side]


def analyse(image: DecodedImage) -> dict:
    pixels = _centre_crop(image.pixels)
    norm = image.norm
    if norm.bit_depth == 8:
        lo, hi = np.percentile(pixels, [0.5, 99.5])
        dynamic_range = float(hi - lo)
        saturated = float((pixels >= 1.0).mean())
    else:  # percentile window already measured during normalisation
        full_scale = 65535.0 if norm.bit_depth == 16 else max(norm.high, 1.0)
        dynamic_range = float((norm.high - norm.low) / full_scale)
        saturated = None
    return {
        "width": image.width,
        "height": image.height,
        "channels": image.channels,
        "bitDepth": norm.bit_depth,
        "dynamicRangeUse": round(min(dynamic_range, 1.0), 4),
        "saturatedFraction": None if saturated is None else round(saturated, 5),
        **no_reference(pixels),
        "analysedRegion": "full image" if pixels is image.pixels else "centre crop (1 MP)",
    }
