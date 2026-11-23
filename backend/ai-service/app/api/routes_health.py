"""Unauthenticated liveness probe. Exposes no sensitive details."""
from fastapi import APIRouter, Request

from app import __version__

router = APIRouter(tags=["health"])


@router.get("/health")
def health(request: Request) -> dict:
    runtime = request.app.state.runtime
    return {
        "success": True,
        "data": {
            "status": "ok",
            "version": __version__,
            "device": runtime["device"],
            "mlStack": runtime["mlStack"],
        },
    }
