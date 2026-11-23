"""Shared fixtures: settings factory, API client, and synthetic microscopy images."""
from __future__ import annotations

import io
from dataclasses import replace

import numpy as np
import pytest
import tifffile
from fastapi.testclient import TestClient
from PIL import Image

from app.core.config import load_settings
from app.main import create_app

TOKEN = "t" * 40


@pytest.fixture
def settings(tmp_path):
    base = load_settings()
    return replace(
        base,
        internal_token=TOKEN,
        weights_dir=tmp_path,
        device="cpu",
        max_input_pixels=200_000,
        max_upload_bytes=2 * 1024 * 1024,
        tile_size=64,
        tile_overlap=8,
    )


@pytest.fixture
def client(settings):
    with TestClient(create_app(settings), headers={"X-Internal-Token": TOKEN}) as test_client:
        yield test_client


def png_bytes(arr: np.ndarray) -> bytes:
    buffer = io.BytesIO()
    Image.fromarray(arr).save(buffer, format="PNG")
    return buffer.getvalue()


def tiff_bytes(arr: np.ndarray) -> bytes:
    buffer = io.BytesIO()
    tifffile.imwrite(buffer, arr)
    return buffer.getvalue()


@pytest.fixture
def rgb_png() -> bytes:
    rng = np.random.default_rng(0)
    return png_bytes(rng.integers(0, 256, (40, 60, 3), dtype=np.uint8))


@pytest.fixture
def gray16_tiff() -> bytes:
    """Dim 16-bit fluorescence-like image occupying a narrow intensity band."""
    rng = np.random.default_rng(1)
    return tiff_bytes(rng.integers(1000, 4000, (32, 48), dtype=np.uint16))
