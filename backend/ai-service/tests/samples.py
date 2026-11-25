"""Synthetic fluorescence-like test images with controlled degradations."""
import numpy as np
from scipy import ndimage


def cells(size: int = 96, seed: int = 0) -> np.ndarray:
    """Clean HxWx1 float32 image of Gaussian 'cells' in [0, 1]."""
    rng = np.random.default_rng(seed)
    yy, xx = np.mgrid[0:size, 0:size]
    img = np.zeros((size, size), np.float32)
    for _ in range(size // 4):
        cy, cx, r = rng.uniform(0, size, 2).tolist() + [rng.uniform(1.5, 4)]
        img += np.exp(-(((yy - cy) / r) ** 2 + ((xx - cx) / r) ** 2)) * rng.uniform(0.4, 1)
    return (img / img.max() * 0.8 + 0.05)[..., None].astype(np.float32)


def noisy(img: np.ndarray, sigma: float, seed: int = 1) -> np.ndarray:
    rng = np.random.default_rng(seed)
    return np.clip(img + rng.normal(0, sigma, img.shape), 0, 1).astype(np.float32)


def blurred(img: np.ndarray, sigma: float) -> np.ndarray:
    return ndimage.gaussian_filter(img, (sigma, sigma, 0)).astype(np.float32)


def to_uint8(img: np.ndarray) -> np.ndarray:
    return np.rint(img[..., 0] * 255).astype(np.uint8)
