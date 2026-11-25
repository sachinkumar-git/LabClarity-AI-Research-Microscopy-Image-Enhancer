"""Use cases: preview, degradation analysis + recommendation, and full pipeline processing."""
from __future__ import annotations

import threading
import time
from dataclasses import dataclass

from app.core.config import Settings
from app.models.loader import ModelCache
from app.models.registry import ModelRegistry
from app.pipeline.context import PipelineContext
from app.pipeline.executor import crop_roi, execute
from app.pipeline.schemas import PipelineSpec, Roi, SuperResolutionStep
from app.processing.channels import to_model_channels
from app.processing.diffmap import difference_map
from app.processing.image_io import decode_image, encode_png
from app.processing.normalize import from_unit_range
from app.quality.analysis import analyse
from app.quality.metrics import assess
from app.quality.recommender import recommend
from app.services.audit import build_audit, intensity_preserving, png_label


@dataclass(frozen=True)
class EnhancementResult:
    png: bytes  # 8-bit, contrast-normalised: safe for browser display
    metrics: dict
    data_png: bytes | None = None  # 16-bit grayscale at original intensity scale (analysis)


@dataclass(frozen=True)
class ProcessResult:
    display_png: bytes
    data_png: bytes | None
    diff_png: bytes
    audit: dict


class EnhancementService:
    def __init__(self, settings: Settings, registry: ModelRegistry, cache: ModelCache, device: str):
        self._settings = settings
        self._ctx = PipelineContext(settings, registry, cache, device)
        self._slots = threading.BoundedSemaphore(settings.max_concurrent_jobs)

    def _decode(self, data: bytes):
        return decode_image(data, self._settings.max_input_pixels)

    def preview(self, data: bytes) -> EnhancementResult:
        """Browser-displayable 8-bit PNG of the (normalised) original."""
        image = self._decode(data)
        pixels = to_model_channels(image.pixels) if image.channels == 2 else image.pixels
        png = encode_png(from_unit_range(pixels, image.norm, out_bit_depth=8))
        return EnhancementResult(png, {"width": image.width, "height": image.height})

    def analyse(self, data: bytes) -> dict:
        analysis = analyse(self._decode(data))
        return {"analysis": analysis, "recommendation": recommend(analysis, self._ctx.registry)}

    def process(self, data: bytes, spec: PipelineSpec, roi: Roi | None = None,
                reference: bytes | None = None) -> ProcessResult:
        image = self._decode(data)
        source = crop_roi(image.pixels, roi)
        reference_px = self._decode(reference).pixels if reference else None

        with self._slots:
            started = time.perf_counter()
            output, steps = execute(source, spec, self._ctx)
            duration_ms = round((time.perf_counter() - started) * 1000)

        keeps_16bit = image.norm.bit_depth == 16 and output.shape[-1] == 1 and intensity_preserving(steps)
        quality = assess(source, output, reference_px, ops=[s["op"] for s in steps])
        heatmap, diff_stats = difference_map(source, output)
        audit = build_audit(
            image=image, roi=roi, steps=steps, output=output,
            output_bit_depth=16 if keeps_16bit else 8, quality=quality,
            diff_stats=diff_stats, device=self._ctx.device, duration_ms=duration_ms,
        )
        label = png_label(audit)
        display = encode_png(from_unit_range(output, image.norm, 8), metadata=label)
        data_png = encode_png(from_unit_range(output, image.norm, 16), metadata=label) if keeps_16bit else None
        return ProcessResult(display, data_png, encode_png(heatmap, metadata=label), audit)

    def enhance(self, data: bytes, model_id: str, scale: int) -> EnhancementResult:
        """Legacy single-model API, implemented on top of the pipeline engine."""
        spec = PipelineSpec(steps=[SuperResolutionStep(op="super_resolution", model=model_id, scale=scale)])
        result = self.process(data, spec)
        audit = result.audit
        metrics = {
            "inputWidth": audit["input"]["width"],
            "inputHeight": audit["input"]["height"],
            "outputWidth": audit["output"]["width"],
            "outputHeight": audit["output"]["height"],
            "bitDepth": audit["output"]["dataBitDepth"],
            "device": audit["device"],
            "durationMs": audit["durationMs"],
        }
        return EnhancementResult(result.display_png, metrics, result.data_png)
