"""Difference visualisation: where (and how strongly) processing changed the image
relative to a plain bicubic upscale of the input, rendered with a perceptual colormap."""
from __future__ import annotations

import numpy as np

from app.processing.resize import resize

# Anchor colours of an inferno-like perceptual colormap (black -> purple -> orange -> yellow).
_ANCHORS = np.array(
    [[0, 0, 4], [87, 16, 110], [188, 55, 84], [249, 142, 9], [252, 255, 164]], dtype=np.float32
)
_LUT = np.stack(
    [np.interp(np.linspace(0, 1, 256), np.linspace(0, 1, len(_ANCHORS)), _ANCHORS[:, c]) for c in range(3)],
    axis=-1,
).astype(np.uint8)


def difference_map(input_px: np.ndarray, output_px: np.ndarray) -> tuple[np.ndarray, dict]:
    """Returns (HxWx3 uint8 heatmap at output resolution, summary statistics)."""
    height, width = output_px.shape[:2]
    baseline = resize(input_px, width, height, "bicubic")
    if baseline.shape[-1] != output_px.shape[-1]:
        baseline = baseline.mean(axis=-1, keepdims=True)
        output = output_px.mean(axis=-1, keepdims=True)
    else:
        output = output_px
    diff = np.abs(output - baseline).mean(axis=-1)
    p99 = float(np.percentile(diff, 99.5))
    scaled = np.clip(diff / p99, 0.0, 1.0) if p99 > 1e-6 else np.zeros_like(diff)
    heatmap = _LUT[np.rint(scaled * 255).astype(np.uint8)]
    stats = {
        "meanAbsDiff": round(float(diff.mean()), 5),
        "p99AbsDiff": round(p99, 5),
        "changedFraction": round(float((diff > 0.05).mean()), 4),
        "baseline": "bicubic upscale of input",
        "colorScale": "0 to p99.5 of |output - baseline|",
    }
    return heatmap, stats
