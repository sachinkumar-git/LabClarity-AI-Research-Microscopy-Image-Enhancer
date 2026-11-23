"""Request-scoped dependency accessors for services built at startup."""
from __future__ import annotations

from fastapi import Request, UploadFile

from app.core.errors import BadRequestError, ImageTooLargeError
from app.models.registry import ModelRegistry
from app.services.enhancer import EnhancementService

CHUNK_SIZE = 1024 * 1024


def get_registry(request: Request) -> ModelRegistry:
    return request.app.state.registry


def get_enhancer(request: Request) -> EnhancementService:
    return request.app.state.enhancer


async def read_upload(file: UploadFile, max_bytes: int) -> bytes:
    """Reads an upload in chunks, aborting as soon as it exceeds `max_bytes`."""
    chunks, total = [], 0
    while chunk := await file.read(CHUNK_SIZE):
        total += len(chunk)
        if total > max_bytes:
            raise ImageTooLargeError(f"File exceeds {max_bytes // (1024 * 1024)} MB limit")
        chunks.append(chunk)
    if total == 0:
        raise BadRequestError("Uploaded file is empty")
    return b"".join(chunks)
