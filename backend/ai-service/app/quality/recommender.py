"""Transparent, rule-based pipeline recommendation. Every suggested step comes with the
measurement that triggered it, so researchers can judge (and override) the advice."""
from __future__ import annotations

from app.models.registry import ModelRegistry

NOISE_HIGH = 0.02
BLUR_LOW = 0.004
CONTRAST_LOW = 0.05
DYNAMIC_RANGE_LOW = 0.2
SR_X4_MAX_SIDE = 384
SR_X2_MAX_SIDE = 1024

SR_PREFERENCE = {4: ["swinir-real-x4", "realesrgan-x4plus"], 2: ["realesrgan-x2plus", "swinir-real-x4"]}
GAN_MODELS = {"realesrgan-x4plus", "realesrgan-x2plus", "swinir-real-x4"}


def _denoise(analysis: dict, registry: ModelRegistry):
    sigma = analysis["noiseSigma"]
    if sigma <= NOISE_HIGH:
        return None
    if registry.is_available("scunet-real-psnr"):
        step = {"op": "denoise", "method": "ai", "model": "scunet-real-psnr"}
    else:
        step = {"op": "denoise", "method": "nlm", "strength": 1.0}
    return step, f"Estimated noise sigma {sigma:.3f} exceeds {NOISE_HIGH}; denoise before upscaling."


def _deblur(analysis: dict):
    if analysis["sharpness"] >= BLUR_LOW or analysis["noiseSigma"] > 0.05:
        return None  # deconvolution amplifies heavy noise, so skip it
    reason = (
        f"Low high-frequency content (sharpness {analysis['sharpness']:.4f} < {BLUR_LOW}); "
        "may indicate defocus blur, or naturally smooth structures. Mild deconvolution suggested."
    )
    return {"op": "deblur", "method": "richardson_lucy", "psf_sigma": 1.0, "iterations": 10}, reason


def _contrast(analysis: dict):
    if analysis["rmsContrast"] >= CONTRAST_LOW and analysis["dynamicRangeUse"] >= DYNAMIC_RANGE_LOW:
        return None
    reason = (
        f"Low contrast (RMS {analysis['rmsContrast']:.3f}, dynamic-range use "
        f"{analysis['dynamicRangeUse']:.0%}); CLAHE improves visibility."
    )
    return {"op": "contrast", "method": "clahe", "clip_limit": 0.01}, reason


def _super_resolution(analysis: dict, registry: ModelRegistry):
    side = min(analysis["width"], analysis["height"])
    if side > SR_X2_MAX_SIDE:
        return None
    scale = 4 if side <= SR_X4_MAX_SIDE else 2
    model = next((m for m in SR_PREFERENCE[scale] if registry.is_available(m)), "bicubic")
    reason = f"Smallest side is {side}px; x{scale} upscaling with {model}."
    if model == "bicubic":
        reason += " No AI super-resolution model is installed, so the bicubic baseline is used."
    return {"op": "super_resolution", "model": model, "scale": scale}, reason


def recommend(analysis: dict, registry: ModelRegistry) -> dict:
    candidates = [
        _denoise(analysis, registry),
        _deblur(analysis),
        _super_resolution(analysis, registry),
        _contrast(analysis),  # last: intensity remapping should not feed the models
    ]
    chosen = [c for c in candidates if c]
    steps = [step for step, _ in chosen]
    warnings = []
    if any(s["op"] == "contrast" for s in steps):
        warnings.append("Contrast enhancement changes relative intensities; do not quantify intensities on the output.")
    if any(s.get("model") in GAN_MODELS for s in steps):
        warnings.append("GAN-trained models can synthesise plausible texture that is not in the sample.")
    if not steps:
        steps = [{"op": "super_resolution", "model": "bicubic", "scale": 2}]
        chosen = [(steps[0], "No significant degradation detected; showing a baseline upscale only.")]
    return {
        "steps": steps,
        "reasons": [{"op": step["op"], "reason": reason} for step, reason in chosen],
        "warnings": warnings,
        "method": "rule-based (measured noise, sharpness, contrast, size)",
    }
