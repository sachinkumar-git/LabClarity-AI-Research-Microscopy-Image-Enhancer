"""Channel adaptation: SR models expect RGB, microscopy data is often 1 or 2 channels."""
from __future__ import annotations

import numpy as np


def to_model_channels(pixels: np.ndarray) -> np.ndarray:
    """HxWx{1,2,3} -> HxWx3. Grayscale is replicated; 2-channel data gets an empty third channel."""
    channels = pixels.shape[-1]
    if channels == 3:
        return pixels
    if channels == 1:
        return np.repeat(pixels, 3, axis=-1)
    if channels == 2:
        zeros = np.zeros(pixels.shape[:2] + (1,), dtype=pixels.dtype)
        return np.concatenate([pixels, zeros], axis=-1)
    raise ValueError(f"Unsupported channel count: {channels}")


def from_model_channels(output: np.ndarray, original_channels: int) -> np.ndarray:
    """HxWx3 -> grayscale again when the source was grayscale; otherwise stays RGB."""
    if original_channels == 1:
        return output.mean(axis=-1, keepdims=True, dtype=np.float32)
    return output
