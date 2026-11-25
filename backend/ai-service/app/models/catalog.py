"""Static catalogue of supported pretrained models. Adding a model = adding one entry here
(spandrel auto-detects the architecture from the weights)."""
from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class ModelSpec:
    id: str
    name: str
    description: str
    kind: str  # "baseline" | "ai"
    task: str  # "super_resolution" | "denoise"
    version: str = "builtin"
    weights_file: str | None = None
    source_url: str | None = None


_ESRGAN = "https://github.com/xinntao/Real-ESRGAN/releases/download"

MODEL_SPECS: tuple[ModelSpec, ...] = (
    ModelSpec(
        id="realesrgan-x4plus",
        name="Real-ESRGAN x4plus",
        description="GAN-based restoration; strong denoising and sharpening, may synthesise texture.",
        kind="ai", task="super_resolution", version="v0.1.0",
        weights_file="RealESRGAN_x4plus.pth",
        source_url=f"{_ESRGAN}/v0.1.0/RealESRGAN_x4plus.pth",
    ),
    ModelSpec(
        id="realesrgan-x2plus",
        name="Real-ESRGAN x2plus",
        description="Native 2x Real-ESRGAN; fewer hallucinated details at moderate magnification.",
        kind="ai", task="super_resolution", version="v0.2.1",
        weights_file="RealESRGAN_x2plus.pth",
        source_url=f"{_ESRGAN}/v0.2.1/RealESRGAN_x2plus.pth",
    ),
    ModelSpec(
        id="swinir-real-x4",
        name="SwinIR-M Real-SR x4",
        description="Transformer-based restoration; preserves fine structures with fewer GAN artefacts.",
        kind="ai", task="super_resolution", version="v0.0",
        weights_file="003_realSR_BSRGAN_DFO_s64w8_SwinIR-M_x4_GAN.pth",
        source_url="https://github.com/JingyunLiang/SwinIR/releases/download/v0.0/"
        "003_realSR_BSRGAN_DFO_s64w8_SwinIR-M_x4_GAN.pth",
    ),
    ModelSpec(
        id="scunet-real-psnr",
        name="SCUNet Real (PSNR)",
        description="Blind real-noise denoiser trained for fidelity (non-GAN); keeps image size.",
        kind="ai", task="denoise", version="KAIR v1.0",
        weights_file="scunet_color_real_psnr.pth",
        source_url="https://github.com/cszn/KAIR/releases/download/v1.0/scunet_color_real_psnr.pth",
    ),
    ModelSpec(
        id="bicubic",
        name="Bicubic (baseline)",
        description="Classical interpolation, not AI. Reference point for judging AI enhancement.",
        kind="baseline", task="super_resolution",
    ),
)
