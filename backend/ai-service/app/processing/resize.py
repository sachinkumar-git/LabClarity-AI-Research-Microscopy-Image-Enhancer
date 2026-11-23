"""Float-precision resizing (per channel, Pillow mode "F"), used by the bicubic baseline
and to adapt a model's native scale to the requested one."""
from __future__ import annotations

import numpy as np
from PIL import Image

RESAMPLE = {"bicubic": Image.Resampling.BICUBIC, "lanczos": Image.Resampling.LANCZOS}


def resize(pixels: np.ndarray, width: int, height: int, method: str = "bicubic") -> np.ndarray:
    """Resizes an HxWxC float32 image to (height, width) and clips to [0, 1]."""
    resample = RESAMPLE[method]
    planes = []
    for c in range(pixels.shape[-1]):
        plane = Image.fromarray(np.ascontiguousarray(pixels[..., c], dtype=np.float32))  # mode "F"
        planes.append(np.asarray(plane.resize((width, height), resample)))
    return np.clip(np.stack(planes, axis=-1), 0.0, 1.0).astype(np.float32)


def upscale(pixels: np.ndarray, scale: int, method: str = "bicubic") -> np.ndarray:
    height, width = pixels.shape[:2]
    return resize(pixels, width * scale, height * scale, method)
