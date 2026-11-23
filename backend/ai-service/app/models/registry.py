"""Catalogue of supported models and their availability on this host."""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from app.core.errors import ModelUnavailableError, UnknownModelError

ALLOWED_SCALES = (2, 4)


@dataclass(frozen=True)
class ModelSpec:
    id: str
    name: str
    description: str
    kind: str  # "baseline" | "ai"
    weights_file: str | None = None
    source_url: str | None = None


MODEL_SPECS: tuple[ModelSpec, ...] = (
    ModelSpec(
        id="realesrgan-x4plus",
        name="Real-ESRGAN x4plus",
        description="GAN-based restoration; strong denoising and sharpening of real-world degradations.",
        kind="ai",
        weights_file="RealESRGAN_x4plus.pth",
        source_url="https://github.com/xinntao/Real-ESRGAN/releases/download/v0.1.0/RealESRGAN_x4plus.pth",
    ),
    ModelSpec(
        id="realesrgan-x2plus",
        name="Real-ESRGAN x2plus",
        description="Native 2x Real-ESRGAN; fewer hallucinated details at moderate magnification.",
        kind="ai",
        weights_file="RealESRGAN_x2plus.pth",
        source_url="https://github.com/xinntao/Real-ESRGAN/releases/download/v0.2.1/RealESRGAN_x2plus.pth",
    ),
    ModelSpec(
        id="swinir-real-x4",
        name="SwinIR-M Real-SR x4",
        description="Transformer-based restoration; preserves fine structures with fewer GAN artefacts.",
        kind="ai",
        weights_file="003_realSR_BSRGAN_DFO_s64w8_SwinIR-M_x4_GAN.pth",
        source_url="https://github.com/JingyunLiang/SwinIR/releases/download/v0.0/"
        "003_realSR_BSRGAN_DFO_s64w8_SwinIR-M_x4_GAN.pth",
    ),
    ModelSpec(
        id="bicubic",
        name="Bicubic (baseline)",
        description="Classical interpolation, not AI. Reference point for judging AI enhancement.",
        kind="baseline",
    ),
)


class ModelRegistry:
    def __init__(self, weights_dir: Path, ml_available: bool, specs=MODEL_SPECS):
        self._weights_dir = weights_dir
        self._ml_available = ml_available
        self._specs = {spec.id: spec for spec in specs}

    def get(self, model_id: str) -> ModelSpec:
        spec = self._specs.get(model_id)
        if spec is None:
            raise UnknownModelError(f"Unknown model '{model_id}'")
        return spec

    def weights_path(self, spec: ModelSpec) -> Path:
        return self._weights_dir / spec.weights_file

    def unavailable_reason(self, spec: ModelSpec) -> str | None:
        if spec.kind == "baseline":
            return None
        if not self._ml_available:
            return "PyTorch/spandrel not installed on the AI service"
        if not self.weights_path(spec).is_file():
            return f"Weights file '{spec.weights_file}' not found"
        return None

    def ensure_available(self, spec: ModelSpec) -> None:
        reason = self.unavailable_reason(spec)
        if reason:
            raise ModelUnavailableError(f"Model '{spec.id}' is unavailable: {reason}")

    def describe(self) -> list[dict]:
        return [
            {
                "id": spec.id,
                "name": spec.name,
                "description": spec.description,
                "kind": spec.kind,
                "scales": list(ALLOWED_SCALES),
                "available": self.unavailable_reason(spec) is None,
                "unavailableReason": self.unavailable_reason(spec),
            }
            for spec in self._specs.values()
        ]
