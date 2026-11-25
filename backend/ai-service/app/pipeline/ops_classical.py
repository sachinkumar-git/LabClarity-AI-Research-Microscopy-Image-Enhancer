"""Classical (non-AI) restoration operators. All take/return HxWxC float32 in [0, 1] and
operate per channel, so grayscale data stays grayscale and nothing is invented."""
from __future__ import annotations

import numpy as np
from scipy import ndimage
from skimage import exposure, restoration


def _per_channel(pixels: np.ndarray, fn) -> np.ndarray:
    planes = [fn(np.ascontiguousarray(pixels[..., c])) for c in range(pixels.shape[-1])]
    return np.clip(np.stack(planes, axis=-1), 0.0, 1.0).astype(np.float32)


_IMMERKAER = np.array([[1, -2, 1], [-2, 4, -2], [1, -2, 1]], dtype=np.float32)


def estimate_noise(pixels: np.ndarray) -> float:
    """Gaussian noise sigma (in [0, 1] units) via Immerkaer's fast estimator (1996):
    a Laplacian-difference kernel cancels image structure, leaving mostly noise."""
    gray = pixels.mean(axis=-1, dtype=np.float32) if pixels.ndim == 3 else pixels
    height, width = gray.shape
    if height < 3 or width < 3:
        return 0.0
    response = np.abs(ndimage.convolve(gray, _IMMERKAER, mode="reflect"))[1:-1, 1:-1]
    sigma = np.sqrt(np.pi / 2.0) * response.sum() / (6.0 * (width - 2) * (height - 2))
    return float(np.nan_to_num(sigma))


def denoise(pixels: np.ndarray, method: str, strength: float) -> tuple[np.ndarray, dict]:
    sigma = estimate_noise(pixels)
    if method == "tv":
        weight = max(sigma * strength, 1e-3)
        out = _per_channel(pixels, lambda p: restoration.denoise_tv_chambolle(p, weight=weight))
        return out, {"estimatedSigma": round(sigma, 5), "weight": round(weight, 5)}
    h = max(0.8 * sigma * strength, 1e-3)
    out = _per_channel(
        pixels,
        lambda p: restoration.denoise_nl_means(
            p, h=h, sigma=sigma, patch_size=5, patch_distance=6, fast_mode=True
        ),
    )
    return out, {"estimatedSigma": round(sigma, 5), "h": round(h, 5)}


def _gaussian_psf(sigma: float) -> np.ndarray:
    radius = max(1, int(np.ceil(3 * sigma)))
    ax = np.arange(-radius, radius + 1, dtype=np.float32)
    kernel = np.exp(-(ax[:, None] ** 2 + ax[None, :] ** 2) / (2 * sigma**2))
    return kernel / kernel.sum()


def deblur(pixels: np.ndarray, method: str, psf_sigma: float, iterations: int, amount: float):
    if method == "unsharp":
        def unsharp(p):
            return p + amount * (p - ndimage.gaussian_filter(p, psf_sigma))

        return _per_channel(pixels, unsharp), {"psfSigma": psf_sigma, "amount": amount}
    psf = _gaussian_psf(psf_sigma)
    pad = psf.shape[0] * 2  # reflect-pad so deconvolution does not ring at image borders

    def deconvolve(p):
        padded = np.pad(p, pad, mode="reflect")
        return restoration.richardson_lucy(padded, psf, num_iter=iterations, clip=True)[pad:-pad, pad:-pad]

    out = _per_channel(pixels, deconvolve)
    return out, {"psfSigma": psf_sigma, "iterations": iterations, "psf": "gaussian", "boundary": "reflect-padded"}


def contrast(pixels: np.ndarray, method: str, clip_limit: float, low_pct: float, high_pct: float):
    if method == "stretch":
        lo, hi = np.percentile(pixels, [low_pct, high_pct])
        hi = hi if hi > lo else lo + 1e-6
        out = np.clip((pixels - lo) / (hi - lo), 0.0, 1.0).astype(np.float32)
        return out, {"low": float(lo), "high": float(hi), "lowPct": low_pct, "highPct": high_pct}
    out = _per_channel(pixels, lambda p: exposure.equalize_adapthist(p, clip_limit=clip_limit))
    return out, {"clipLimit": clip_limit}
