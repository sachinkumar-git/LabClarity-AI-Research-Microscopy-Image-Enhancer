"""FastAPI application factory for the LabClarity AI inference service."""
from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from PIL import Image

from app import __version__
from app.api import routes_enhance, routes_health, routes_models, routes_pipeline
from app.core.config import Settings, get_settings
from app.core.errors import register_error_handlers
from app.models.loader import ModelCache
from app.models.registry import ModelRegistry
from app.models.runtime import ml_stack_available, resolve_device, runtime_info
from app.services.enhancer import EnhancementService

logger = logging.getLogger("labclarity")


def build_services(app: FastAPI, settings: Settings) -> None:
    # Hard ceiling against decompression bombs, above the configured soft limit.
    Image.MAX_IMAGE_PIXELS = settings.max_input_pixels * 4
    device = resolve_device(settings.device)
    registry = ModelRegistry(settings.weights_dir, ml_stack_available())
    cache = ModelCache(device, settings.use_fp16, settings.model_cache_size)

    app.state.runtime = runtime_info(device)
    app.state.registry = registry
    app.state.enhancer = EnhancementService(settings, registry, cache, device)

    if not settings.internal_token:
        logger.warning("AI_SERVICE_TOKEN is empty: internal auth disabled (development only)")
    available = [m["id"] for m in registry.describe() if m["available"]]
    logger.info("AI service ready on %s; available models: %s", device, available)


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or get_settings()
    logging.basicConfig(level=settings.log_level, format="%(asctime)s %(levelname)s %(name)s: %(message)s")

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        build_services(app, settings)
        yield

    app = FastAPI(
        title="LabClarity AI Inference Service",
        version=__version__,
        lifespan=lifespan,
        docs_url=None if settings.is_production else "/docs",
        redoc_url=None,
        openapi_url=None if settings.is_production else "/openapi.json",
    )
    app.dependency_overrides[get_settings] = lambda: settings
    register_error_handlers(app)
    app.include_router(routes_health.router)
    app.include_router(routes_models.router)
    app.include_router(routes_enhance.router)
    app.include_router(routes_pipeline.router)
    return app
