"""Neural operators (super-resolution, AI denoising) and the bicubic baseline."""
from __future__ import annotations

import numpy as np

from app.models.catalog import ModelSpec
from app.pipeline.context import PipelineContext
from app.processing.channels import from_model_channels, to_model_channels
from app.processing.resize import resize, upscale
from app.processing.tiling import run_tiled


def run_model(pixels: np.ndarray, spec: ModelSpec, ctx: PipelineContext, scale: int) -> np.ndarray:
    """Runs a registered model and returns an image `scale` times larger (1 = same size)."""
    if spec.kind == "baseline":
        return upscale(pixels, scale, "bicubic") if scale > 1 else pixels

    from app.models.inference import make_tile_fn

    channels = pixels.shape[-1]
    rgb = to_model_channels(pixels)
    descriptor = ctx.cache.get(spec.id, ctx.registry.weights_path(spec))
    native = int(descriptor.scale)
    tile_fn = make_tile_fn(descriptor, ctx.device)
    output = run_tiled(tile_fn, rgb, native, ctx.settings.tile_size, ctx.settings.tile_overlap)
    if native != scale:  # e.g. x4 model asked for x2: high-quality resample to the target size
        height, width = pixels.shape[:2]
        output = resize(output, width * scale, height * scale, "lanczos")
    return from_model_channels(output, channels)


def super_resolve(pixels: np.ndarray, model_id: str, scale: int, ctx: PipelineContext):
    spec = ctx.registry.get(model_id, task="super_resolution")
    ctx.registry.ensure_available(spec)
    return run_model(pixels, spec, ctx, scale), {"scale": scale}, spec


def ai_denoise(pixels: np.ndarray, model_id: str, ctx: PipelineContext):
    spec = ctx.registry.get(model_id, task="denoise")
    ctx.registry.ensure_available(spec)
    return run_model(pixels, spec, ctx, 1), {}, spec
