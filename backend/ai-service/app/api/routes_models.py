"""Model catalogue with per-host availability."""
from fastapi import APIRouter, Depends, Request

from app.api.deps import get_registry
from app.core.security import require_internal_token
from app.models.registry import ModelRegistry

router = APIRouter(prefix="/v1", tags=["models"], dependencies=[Depends(require_internal_token)])


@router.get("/models")
def list_models(request: Request, registry: ModelRegistry = Depends(get_registry)) -> dict:
    return {
        "success": True,
        "data": {"models": registry.describe(), "runtime": request.app.state.runtime},
    }
