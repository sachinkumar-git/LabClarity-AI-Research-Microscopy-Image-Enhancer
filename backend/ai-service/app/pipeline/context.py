"""Shared dependencies handed to pipeline operators."""
from __future__ import annotations

from dataclasses import dataclass

from app.core.config import Settings
from app.models.loader import ModelCache
from app.models.registry import ModelRegistry


@dataclass(frozen=True)
class PipelineContext:
    settings: Settings
    registry: ModelRegistry
    cache: ModelCache
    device: str
