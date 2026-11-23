"""Enhancement use cases: preview generation and super-resolution with any registered model."""
from __future__ import annotations

import threading
import time
from dataclasses import dataclass

import numpy as np

from app.core.config import Settings
from app.models.loader import ModelCache
from app.models.registry import ModelRegistry, ModelSpec
from app.processing.channels import from_model_channels, to_model_channels
from app.processing.image_io import DecodedImage, decode_image, encode_png
from app.processing.normalize import from_unit_range
from app.processing.resize import resize, upscale
from app.processing.tiling import run_tiled


@dataclass(frozen=True)
class EnhancementResult:
    png: bytes  # 8-bit, contrast-normalised: safe for browser display
    metrics: dict
    data_png: bytes | None = None  # 16-bit grayscale at original intensity scale (analysis)


class EnhancementService:
    def __init__(self, settings: Settings, registry: ModelRegistry, cache: ModelCache, device: str):
        self._settings = settings
        self._registry = registry
        self._cache = cache
        self._device = device
        self._slots = threading.BoundedSemaphore(settings.max_concurrent_jobs)

    def preview(self, data: bytes) -> EnhancementResult:
        """Browser-displayable 8-bit PNG of the (normalised) original."""
        image = decode_image(data, self._settings.max_input_pixels)
        pixels = to_model_channels(image.pixels) if image.channels == 2 else image.pixels
        png = encode_png(from_unit_range(pixels, image.norm, out_bit_depth=8))
        return EnhancementResult(png, {"width": image.width, "height": image.height})

    def enhance(self, data: bytes, model_id: str, scale: int) -> EnhancementResult:
        spec = self._registry.get(model_id)
        self._registry.ensure_available(spec)
        image = decode_image(data, self._settings.max_input_pixels)

        with self._slots:
            started = time.perf_counter()
            output = self._super_resolve(spec, to_model_channels(image.pixels), scale)
            duration_ms = round((time.perf_counter() - started) * 1000)

        output = from_model_channels(output, image.channels)
        display = encode_png(from_unit_range(output, image.norm, out_bit_depth=8))
        keeps_16bit = image.norm.bit_depth == 16 and output.shape[-1] == 1
        data = encode_png(from_unit_range(output, image.norm, out_bit_depth=16)) if keeps_16bit else None
        metrics = self._metrics(image, output, 16 if keeps_16bit else 8, duration_ms)
        return EnhancementResult(display, metrics, data)

    def _super_resolve(self, spec: ModelSpec, pixels: np.ndarray, scale: int) -> np.ndarray:
        if spec.kind == "baseline":
            return upscale(pixels, scale, "bicubic")

        from app.models.inference import make_tile_fn

        descriptor = self._cache.get(spec.id, self._registry.weights_path(spec))
        native = int(descriptor.scale)
        tile_fn = make_tile_fn(descriptor, self._device)
        output = run_tiled(
            tile_fn, pixels, native, self._settings.tile_size, self._settings.tile_overlap
        )
        if native != scale:  # e.g. x4 model asked for x2: high-quality downsample
            height, width = pixels.shape[:2]
            output = resize(output, width * scale, height * scale, "lanczos")
        return output

    def _metrics(self, image: DecodedImage, output, bit_depth: int, duration_ms: int) -> dict:
        return {
            "inputWidth": image.width,
            "inputHeight": image.height,
            "outputWidth": int(output.shape[1]),
            "outputHeight": int(output.shape[0]),
            "bitDepth": bit_depth,
            "device": self._device,
            "durationMs": duration_ms,
        }
