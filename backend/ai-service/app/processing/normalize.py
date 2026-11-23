"""Intensity normalisation between native microscopy bit depths and model space [0, 1].

8-bit images map linearly (appearance preserved). 16-bit and float images use a robust
percentile stretch, because microscopy data rarely spans the full dynamic range.
The stretch is reversible so 16-bit outputs return to the original intensity scale.
"""
from __future__ import annotations

from dataclasses import dataclass

import numpy as np

LOW_PERCENTILE = 0.1
HIGH_PERCENTILE = 99.9


@dataclass(frozen=True)
class NormParams:
    low: float
    high: float
    bit_depth: int  # 8, 16, or 32 (float / wide-int sources)


def to_unit_range(arr: np.ndarray) -> tuple[np.ndarray, NormParams]:
    """Converts raw pixels to float32 in [0, 1] and returns the parameters to invert it."""
    if arr.dtype == np.bool_:
        arr = arr.astype(np.uint8) * 255
    if arr.dtype == np.uint8:
        return arr.astype(np.float32) / 255.0, NormParams(0.0, 255.0, 8)

    bit_depth = 16 if arr.dtype == np.uint16 else 32
    data = arr.astype(np.float32)
    finite = data[np.isfinite(data)]
    if finite.size == 0:
        return np.zeros_like(data), NormParams(0.0, 1.0, bit_depth)

    low, high = np.percentile(finite, [LOW_PERCENTILE, HIGH_PERCENTILE])
    if high <= low:  # flat or near-flat image: fall back to full range
        low, high = float(finite.min()), float(finite.max())
        high = high if high > low else low + 1.0
    unit = np.clip((np.nan_to_num(data, nan=low) - low) / (high - low), 0.0, 1.0)
    return unit.astype(np.float32), NormParams(float(low), float(high), bit_depth)


def from_unit_range(unit: np.ndarray, params: NormParams, out_bit_depth: int) -> np.ndarray:
    """Maps [0, 1] floats back to an integer image of the requested bit depth."""
    unit = np.clip(unit, 0.0, 1.0)
    if out_bit_depth == 16:
        restored = unit * (params.high - params.low) + params.low
        return np.clip(np.rint(restored), 0, 65535).astype(np.uint16)
    return np.rint(unit * 255.0).astype(np.uint8)
