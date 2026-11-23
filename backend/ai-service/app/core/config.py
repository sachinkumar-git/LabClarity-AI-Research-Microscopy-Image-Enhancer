"""Environment-driven settings, validated once at startup."""
from __future__ import annotations

import os
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

SERVICE_ROOT = Path(__file__).resolve().parents[2]


def load_env_file(path: Path = SERVICE_ROOT / ".env") -> None:
    """Minimal KEY=VALUE loader (no python-dotenv dependency). Real env vars take precedence."""
    if not path.is_file():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip("'\""))


def _int(name: str, default: int, minimum: int = 0) -> int:
    raw = os.getenv(name, "")
    value = int(raw) if raw.strip() else default
    if value < minimum:
        raise ValueError(f"{name} must be >= {minimum}")
    return value


def _bool(name: str, default: bool) -> bool:
    raw = os.getenv(name, "").strip().lower()
    return default if not raw else raw in {"1", "true", "yes", "on"}


@dataclass(frozen=True)
class Settings:
    environment: str
    internal_token: str
    weights_dir: Path
    device: str  # auto | cpu | cuda
    use_fp16: bool
    tile_size: int
    tile_overlap: int
    max_upload_bytes: int
    max_input_pixels: int
    max_concurrent_jobs: int
    model_cache_size: int
    log_level: str

    @property
    def is_production(self) -> bool:
        return self.environment == "production"


def load_settings() -> Settings:
    weights = Path(os.getenv("WEIGHTS_DIR", "") or SERVICE_ROOT / "weights")
    settings = Settings(
        environment=os.getenv("ENVIRONMENT", "development"),
        internal_token=os.getenv("AI_SERVICE_TOKEN", ""),
        weights_dir=weights if weights.is_absolute() else (SERVICE_ROOT / weights).resolve(),
        device=os.getenv("DEVICE", "auto").lower(),
        use_fp16=_bool("USE_FP16", True),
        tile_size=_int("TILE_SIZE", 256, minimum=0),
        tile_overlap=_int("TILE_OVERLAP", 16),
        max_upload_bytes=_int("MAX_UPLOAD_MB", 25, minimum=1) * 1024 * 1024,
        max_input_pixels=_int("MAX_INPUT_PIXELS", 2_000_000, minimum=1),
        max_concurrent_jobs=_int("MAX_CONCURRENT_JOBS", 1, minimum=1),
        model_cache_size=_int("MODEL_CACHE_SIZE", 1, minimum=1),
        log_level=os.getenv("LOG_LEVEL", "INFO").upper(),
    )
    _validate(settings)
    return settings


def _validate(settings: Settings) -> None:
    if settings.device not in {"auto", "cpu", "cuda"}:
        raise ValueError("DEVICE must be one of: auto, cpu, cuda")
    if settings.is_production and len(settings.internal_token) < 32:
        raise ValueError("AI_SERVICE_TOKEN must be at least 32 characters in production")
    if settings.tile_size and settings.tile_overlap * 2 >= settings.tile_size:
        raise ValueError("TILE_OVERLAP must be less than half of TILE_SIZE")


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    load_env_file()
    return load_settings()
