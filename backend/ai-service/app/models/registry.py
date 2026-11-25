"""Model availability on this host, plus weight fingerprints for the audit trail."""
from __future__ import annotations

import hashlib
from functools import lru_cache
from pathlib import Path

from app.core.errors import ModelUnavailableError, UnknownModelError
from app.models.catalog import MODEL_SPECS, ModelSpec

ALLOWED_SCALES = (2, 4)

__all__ = ["ALLOWED_SCALES", "ModelRegistry", "ModelSpec"]


@lru_cache(maxsize=16)
def _sha256(path: str, mtime_ns: int) -> str:  # mtime in the key: re-hash if the file changes
    digest = hashlib.sha256()
    with open(path, "rb") as fh:
        for chunk in iter(lambda: fh.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


class ModelRegistry:
    def __init__(self, weights_dir: Path, ml_available: bool, specs=MODEL_SPECS):
        self._weights_dir = weights_dir
        self._ml_available = ml_available
        self._specs = {spec.id: spec for spec in specs}

    def get(self, model_id: str, task: str | None = None) -> ModelSpec:
        spec = self._specs.get(model_id)
        if spec is None:
            raise UnknownModelError(f"Unknown model '{model_id}'")
        if task and spec.task != task:
            raise UnknownModelError(f"Model '{model_id}' cannot be used for {task}")
        return spec

    def weights_path(self, spec: ModelSpec) -> Path:
        return self._weights_dir / spec.weights_file

    def weights_sha256(self, spec: ModelSpec) -> str | None:
        if spec.kind != "ai":
            return None
        path = self.weights_path(spec)
        return _sha256(str(path), path.stat().st_mtime_ns) if path.is_file() else None

    def unavailable_reason(self, spec: ModelSpec) -> str | None:
        if spec.kind == "baseline":
            return None
        if not self._ml_available:
            return "PyTorch/spandrel not installed on the AI service"
        if not self.weights_path(spec).is_file():
            return f"Weights file '{spec.weights_file}' not found"
        return None

    def is_available(self, model_id: str) -> bool:
        spec = self._specs.get(model_id)
        return spec is not None and self.unavailable_reason(spec) is None

    def ensure_available(self, spec: ModelSpec) -> None:
        reason = self.unavailable_reason(spec)
        if reason:
            raise ModelUnavailableError(f"Model '{spec.id}' is unavailable: {reason}")

    def provenance(self, spec: ModelSpec) -> dict:
        """What the audit trail records about a model used in a run."""
        return {
            "id": spec.id,
            "name": spec.name,
            "kind": spec.kind,
            "version": spec.version,
            "weightsFile": spec.weights_file,
            "weightsSha256": self.weights_sha256(spec),
            "source": spec.source_url,
        }

    def describe(self) -> list[dict]:
        return [
            {
                "id": spec.id,
                "name": spec.name,
                "description": spec.description,
                "kind": spec.kind,
                "task": spec.task,
                "version": spec.version,
                "weightsFile": spec.weights_file,
                "source": spec.source_url,
                "scales": list(ALLOWED_SCALES) if spec.task == "super_resolution" else [1],
                "available": self.unavailable_reason(spec) is None,
                "unavailableReason": self.unavailable_reason(spec),
            }
            for spec in self._specs.values()
        ]
