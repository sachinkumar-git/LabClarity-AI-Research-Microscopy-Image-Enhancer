"""Loads pretrained weights with spandrel and keeps a small LRU cache of models in memory.

spandrel auto-detects the architecture (RRDBNet for Real-ESRGAN, SwinIR, ...) from the
state dict and loads checkpoints with torch's safe `weights_only` unpickler.
"""
from __future__ import annotations

import logging
import threading
from collections import OrderedDict
from pathlib import Path

from app.core.errors import InferenceError

logger = logging.getLogger("labclarity.loader")


class ModelCache:
    def __init__(self, device: str, use_fp16: bool, capacity: int = 1):
        self._device = device
        self._use_fp16 = use_fp16 and device == "cuda"
        self._capacity = capacity
        self._models: OrderedDict[str, object] = OrderedDict()
        self._lock = threading.Lock()

    def get(self, model_id: str, weights_path: Path):
        with self._lock:
            if model_id in self._models:
                self._models.move_to_end(model_id)
                return self._models[model_id]
            descriptor = self._load(weights_path)
            self._models[model_id] = descriptor
            while len(self._models) > self._capacity:
                evicted, _ = self._models.popitem(last=False)
                logger.info("Evicted model %s from cache", evicted)
                self._free_gpu_memory()
            return descriptor

    def _load(self, weights_path: Path):
        from spandrel import ImageModelDescriptor, ModelLoader

        logger.info("Loading weights %s on %s", weights_path.name, self._device)
        try:
            descriptor = ModelLoader(device=self._device).load_from_file(str(weights_path))
        except Exception as exc:
            raise InferenceError(f"Failed to load weights '{weights_path.name}'") from exc
        if not isinstance(descriptor, ImageModelDescriptor):
            raise InferenceError("Weights are not an image-to-image model")
        descriptor.eval()
        if self._use_fp16 and descriptor.supports_half:
            descriptor.half()
        return descriptor

    def _free_gpu_memory(self) -> None:
        if self._device == "cuda":
            import torch

            torch.cuda.empty_cache()
