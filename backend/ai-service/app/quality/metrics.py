"""Image quality metrics.

Full-reference metrics (PSNR/SSIM) need a reference. Two honest variants are offered:
  * consistency - the output downsampled back to the input grid vs. the input itself.
    High values mean the enhancement did not contradict the measured data; they do NOT
    prove that added detail is real.
  * reference  - vs. a user-supplied ground-truth image at output resolution.
No-reference metrics describe the image itself (sharpness, noise, contrast, entropy).
"""
from __future__ import annotations

import numpy as np
from scipy import ndimage
from skimage.measure import shannon_entropy
from skimage.metrics import peak_signal_noise_ratio, structural_similarity

from app.pipeline.ops_classical import estimate_noise
from app.processing.resize import resize


def _gray(pixels: np.ndarray) -> np.ndarray:
    return pixels.mean(axis=-1, dtype=np.float32) if pixels.ndim == 3 else pixels


_SMOOTH = 0.7
PSNR_CAP = 99.0  # reported for identical images (true PSNR is infinite)


def _noise_gain() -> float:
    """Variance that unit white noise retains after the smoothing+Laplacian used below."""
    noise = np.random.default_rng(0).standard_normal((256, 256)).astype(np.float32)
    return float(ndimage.laplace(ndimage.gaussian_filter(noise, _SMOOTH)).var())


_NOISE_GAIN = _noise_gain()


def sharpness(pixels: np.ndarray) -> float:
    """Contrast-normalised high-frequency energy with the expected white-noise contribution
    removed, so a noisy image is not mistaken for a sharp one."""
    gray = _gray(pixels)
    sigma2 = estimate_noise(gray) ** 2
    smooth = ndimage.gaussian_filter(gray, _SMOOTH)
    signal_hf = max(float(ndimage.laplace(smooth).var()) - _NOISE_GAIN * sigma2, 0.0)
    signal_var = float(gray.var()) - sigma2
    return signal_hf / signal_var if signal_var > 1e-10 else 0.0


def no_reference(pixels: np.ndarray) -> dict:
    gray = _gray(pixels)
    return {
        "sharpness": round(sharpness(pixels), 5),
        "noiseSigma": round(estimate_noise(pixels), 5),
        "rmsContrast": round(float(gray.std()), 5),
        "entropy": round(float(shannon_entropy(np.rint(gray * 255).astype(np.uint8))), 4),
    }


def full_reference(reference: np.ndarray, test: np.ndarray) -> dict:
    if reference.shape != test.shape:
        raise ValueError(f"shape mismatch {reference.shape} vs {test.shape}")
    min_side = min(reference.shape[:2])
    win = min(7, min_side if min_side % 2 else min_side - 1)
    ssim = structural_similarity(
        reference, test, data_range=1.0, channel_axis=-1, win_size=max(win, 3)
    )
    identical = float(np.mean((reference - test) ** 2)) == 0.0
    psnr = PSNR_CAP if identical else min(peak_signal_noise_ratio(reference, test, data_range=1.0), PSNR_CAP)
    return {"psnr": round(float(psnr), 3), "ssim": round(float(ssim), 4)}


def to_grid(pixels: np.ndarray, width: int, height: int) -> np.ndarray:
    """Area-preserving resample used to compare images on the same pixel grid."""
    if pixels.shape[1] == width and pixels.shape[0] == height:
        return pixels
    return resize(pixels, width, height, "lanczos")


def match_channels(pixels: np.ndarray, channels: int) -> np.ndarray:
    if pixels.shape[-1] == channels:
        return pixels
    gray = pixels.mean(axis=-1, keepdims=True, dtype=np.float32)
    return gray if channels == 1 else np.repeat(gray, channels, axis=-1)


def consistency_note(ops: list[str]) -> str | None:
    """Explains when a low consistency score is expected rather than a sign of failure."""
    if "contrast" in ops:
        return "Contrast remapping changes intensities by design; consistency is not a fidelity measure here."
    if "denoise" in ops or "deblur" in ops:
        return "Denoising/deblurring intentionally departs from the degraded input, which lowers consistency."
    return None


def assess(input_px: np.ndarray, output_px: np.ndarray, reference_px: np.ndarray | None,
           ops: list[str] | None = None) -> dict:
    """Full quality report for one run. No-reference metrics for the output are measured on
    the input grid so before/after numbers are directly comparable."""
    height, width = input_px.shape[:2]
    channels = output_px.shape[-1]
    source = match_channels(input_px, channels)
    on_input_grid = to_grid(output_px, width, height)

    report = {
        "consistency": {
            **full_reference(source, on_input_grid),
            "method": "output resampled to input grid vs input",
            "note": consistency_note(ops or []),
        },
        "noReference": {
            "input": no_reference(source),
            "output": no_reference(on_input_grid),
            "measuredAt": "input resolution",
        },
        "reference": None,
    }
    if reference_px is not None:
        report["reference"] = _reference_metrics(reference_px, output_px)
    return report


def _reference_metrics(reference_px: np.ndarray, output_px: np.ndarray) -> dict:
    if reference_px.shape[:2] != output_px.shape[:2]:
        rh, rw = reference_px.shape[:2]
        oh, ow = output_px.shape[:2]
        return {"skipped": f"reference is {rw}x{rh} but output is {ow}x{oh}; sizes must match"}
    ref = match_channels(reference_px, output_px.shape[-1])
    return {**full_reference(ref, output_px), "method": "output vs user-supplied ground truth"}
