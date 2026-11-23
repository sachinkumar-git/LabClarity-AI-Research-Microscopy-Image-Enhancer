"""Bridges numpy tiles (HxWxC float32 in [0, 1]) and a spandrel model on CPU/GPU."""
from __future__ import annotations

import numpy as np

from app.core.errors import InferenceError
from app.processing.tiling import TileFn


def make_tile_fn(descriptor, device: str) -> TileFn:
    import torch

    dtype = next(descriptor.model.parameters()).dtype

    def run(tile: np.ndarray) -> np.ndarray:
        tensor = torch.from_numpy(np.ascontiguousarray(tile)).permute(2, 0, 1).unsqueeze(0)
        tensor = tensor.to(device=device, dtype=dtype)
        try:
            with torch.inference_mode():
                output = descriptor(tensor)  # spandrel pads to the model's size requirements
        except torch.cuda.OutOfMemoryError as exc:
            torch.cuda.empty_cache()
            raise InferenceError("GPU out of memory; lower TILE_SIZE and retry") from exc
        return output.clamp_(0, 1).float().squeeze(0).permute(1, 2, 0).cpu().numpy()

    return run
