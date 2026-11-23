"""Optional ML runtime detection. The service starts without torch (baseline only)."""
from __future__ import annotations

import importlib.util
import logging

logger = logging.getLogger("labclarity.runtime")


def ml_stack_available() -> bool:
    return all(importlib.util.find_spec(pkg) is not None for pkg in ("torch", "spandrel"))


def resolve_device(preference: str) -> str:
    """Picks the inference device. `auto` prefers CUDA; an unavailable `cuda` falls back to CPU."""
    if not ml_stack_available() or preference == "cpu":
        return "cpu"
    import torch

    if torch.cuda.is_available():
        return "cuda"
    if preference == "cuda":
        logger.warning("DEVICE=cuda requested but CUDA is not available; using CPU")
    return "cpu"


def runtime_info(device: str) -> dict:
    info = {"device": device, "mlStack": ml_stack_available(), "torch": None, "gpu": None}
    if info["mlStack"]:
        import torch

        info["torch"] = torch.__version__
        if device == "cuda":
            info["gpu"] = torch.cuda.get_device_name(0)
    return info
