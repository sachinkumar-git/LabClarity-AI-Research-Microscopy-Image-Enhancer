"""Runs a validated pipeline step by step and records an audit entry for each step."""
from __future__ import annotations

import time

import numpy as np

from app.core.errors import BadRequestError
from app.pipeline import ops_ai, ops_classical
from app.pipeline.context import PipelineContext
from app.pipeline.schemas import PipelineSpec, Roi


def crop_roi(pixels: np.ndarray, roi: Roi | None) -> np.ndarray:
    if roi is None:
        return pixels
    height, width = pixels.shape[:2]
    if roi.x + roi.width > width or roi.y + roi.height > height:
        raise BadRequestError(f"ROI exceeds image bounds ({width}x{height})")
    return np.ascontiguousarray(pixels[roi.y : roi.y + roi.height, roi.x : roi.x + roi.width])


def _apply(step, pixels: np.ndarray, ctx: PipelineContext):
    """Returns (pixels, recorded parameters, model spec or None)."""
    if step.op == "denoise":
        if step.method == "ai":
            return ops_ai.ai_denoise(pixels, step.model, ctx)
        out, info = ops_classical.denoise(pixels, step.method, step.strength)
        return out, info, None
    if step.op == "deblur":
        out, info = ops_classical.deblur(
            pixels, step.method, step.psf_sigma, step.iterations, step.amount
        )
        return out, info, None
    if step.op == "contrast":
        out, info = ops_classical.contrast(
            pixels, step.method, step.clip_limit, step.low_pct, step.high_pct
        )
        return out, info, None
    return ops_ai.super_resolve(pixels, step.model, step.scale, ctx)


def execute(pixels: np.ndarray, spec: PipelineSpec, ctx: PipelineContext):
    """Executes all steps in order. Returns (output pixels, list of per-step audit records)."""
    records = []
    for index, step in enumerate(spec.steps):
        started = time.perf_counter()
        pixels, derived, model_spec = _apply(step, pixels, ctx)
        records.append(
            {
                "index": index,
                "op": step.op,
                "method": getattr(step, "method", "model"),
                "params": step.model_dump(exclude={"op"}),
                "derived": derived,
                "model": ctx.registry.provenance(model_spec) if model_spec else None,
                "outputShape": list(pixels.shape),
                "durationMs": round((time.perf_counter() - started) * 1000),
            }
        )
    return pixels, records
