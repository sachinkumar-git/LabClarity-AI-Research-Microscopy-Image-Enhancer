"""Research endpoints: degradation analysis and configurable pipeline processing.

/v1/process returns multipart/form-data with parts:
  audit   (JSON)  full provenance + quality metrics
  display (PNG)   8-bit output for viewing
  data    (PNG)   16-bit output at original intensity scale (16-bit grayscale input only)
  diff    (PNG)   difference heatmap vs bicubic upscale of the input
"""
from __future__ import annotations

import json
from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, UploadFile
from starlette.concurrency import run_in_threadpool

from app.api.deps import get_enhancer, get_registry, read_upload
from app.api.multipart import Part, multipart_response
from app.core.config import Settings, get_settings
from app.core.security import require_internal_token
from app.models.registry import ModelRegistry
from app.pipeline.schemas import parse_pipeline, parse_roi
from app.services.enhancer import EnhancementService

router = APIRouter(prefix="/v1", tags=["pipeline"], dependencies=[Depends(require_internal_token)])


@router.post("/pipeline/validate")
def validate_pipeline(payload: dict, registry: ModelRegistry = Depends(get_registry)) -> dict:
    """Validates a pipeline (and model availability) and returns its normalised form,
    so the gateway can reject bad requests before queuing any work."""
    spec = parse_pipeline(json.dumps(payload))
    for step in spec.steps:
        model_id = getattr(step, "model", None)
        if model_id:
            task = "denoise" if step.op == "denoise" else "super_resolution"
            registry.ensure_available(registry.get(model_id, task=task))
    return {"success": True, "data": {"pipeline": spec.model_dump(), "scale": spec.scale}}


@router.post("/analyze")
async def analyze(
    image: UploadFile = File(...),
    enhancer: EnhancementService = Depends(get_enhancer),
    settings: Settings = Depends(get_settings),
) -> dict:
    data = await read_upload(image, settings.max_upload_bytes)
    return {"success": True, "data": await run_in_threadpool(enhancer.analyse, data)}


@router.post("/process")
async def process(
    pipeline: Annotated[str, Form(max_length=4000)],
    roi: Annotated[str | None, Form(max_length=500)] = None,
    image: UploadFile = File(...),
    reference: UploadFile | None = File(default=None),
    enhancer: EnhancementService = Depends(get_enhancer),
    settings: Settings = Depends(get_settings),
):
    spec = parse_pipeline(pipeline)
    region = parse_roi(roi)
    data = await read_upload(image, settings.max_upload_bytes)
    ref = await read_upload(reference, settings.max_upload_bytes) if reference else None

    result = await run_in_threadpool(enhancer.process, data, spec, region, ref)
    parts = [
        Part("audit", json.dumps(result.audit).encode(), "application/json"),
        Part("display", result.display_png, "image/png", "display.png"),
        Part("diff", result.diff_png, "image/png", "diff.png"),
    ]
    if result.data_png:
        parts.append(Part("data", result.data_png, "image/png", "data16.png"))
    return multipart_response(parts)
