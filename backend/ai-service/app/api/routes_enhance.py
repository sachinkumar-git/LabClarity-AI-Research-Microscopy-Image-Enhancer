"""Image endpoints.

/preview returns a PNG (metrics in a header). /enhance returns multipart/form-data with
`metrics` (JSON), `display` (8-bit PNG) and, for 16-bit grayscale input, `data` (16-bit PNG).
"""
from __future__ import annotations

import json
from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, UploadFile
from fastapi.responses import Response
from starlette.concurrency import run_in_threadpool

from app.api.deps import get_enhancer, read_upload
from app.api.multipart import Part, multipart_response
from app.core.config import Settings, get_settings
from app.core.errors import BadRequestError
from app.core.security import require_internal_token
from app.models.registry import ALLOWED_SCALES
from app.services.enhancer import EnhancementResult, EnhancementService

router = APIRouter(prefix="/v1", tags=["enhance"], dependencies=[Depends(require_internal_token)])

METRICS_HEADER = "X-Enhance-Metrics"
ModelId = Annotated[str, Form(pattern=r"^[a-z0-9][a-z0-9_-]{1,63}$")]


def _png_response(result: EnhancementResult) -> Response:
    return Response(
        content=result.png,
        media_type="image/png",
        headers={METRICS_HEADER: json.dumps(result.metrics, separators=(",", ":"))},
    )


@router.post("/preview")
async def preview(
    image: UploadFile = File(...),
    enhancer: EnhancementService = Depends(get_enhancer),
    settings: Settings = Depends(get_settings),
) -> Response:
    data = await read_upload(image, settings.max_upload_bytes)
    return _png_response(await run_in_threadpool(enhancer.preview, data))


@router.post("/enhance")
async def enhance(
    model: ModelId,
    scale: Annotated[int, Form()] = 4,
    image: UploadFile = File(...),
    enhancer: EnhancementService = Depends(get_enhancer),
    settings: Settings = Depends(get_settings),
) -> Response:
    if scale not in ALLOWED_SCALES:
        raise BadRequestError(f"scale must be one of {list(ALLOWED_SCALES)}")
    data = await read_upload(image, settings.max_upload_bytes)
    # Inference is CPU/GPU-bound: run it off the event loop.
    result = await run_in_threadpool(enhancer.enhance, data, model, scale)
    parts = [
        Part("metrics", json.dumps(result.metrics).encode(), "application/json"),
        Part("display", result.png, "image/png", "display.png"),
    ]
    if result.data_png:
        parts.append(Part("data", result.data_png, "image/png", "data16.png"))
    return multipart_response(parts)
