import io
import json
import re

import numpy as np
from fastapi.testclient import TestClient
from PIL import Image

from app.main import create_app
from tests.conftest import png_bytes


def enhance(client, data, model="bicubic", scale=4, name="img.png"):
    return client.post(
        "/v1/enhance", data={"model": model, "scale": str(scale)}, files={"image": (name, data)}
    )


def decode_png(content: bytes) -> Image.Image:
    return Image.open(io.BytesIO(content))


def parse_multipart(res) -> dict[str, bytes]:
    boundary = res.headers["content-type"].split("boundary=")[1].encode()
    parts = {}
    for chunk in res.content.split(b"--" + boundary)[1:-1]:
        head, body = chunk[2:].split(b"\r\n\r\n", 1)
        parts[re.search(rb'name="([^"]+)"', head).group(1).decode()] = body[:-2]
    return parts


def test_health_is_public_and_minimal(settings):
    with TestClient(create_app(settings)) as anonymous:
        body = anonymous.get("/health").json()
    assert body["data"]["status"] == "ok"
    assert set(body["data"]) == {"status", "version", "device", "mlStack"}


def test_protected_routes_require_token(settings):
    with TestClient(create_app(settings)) as anonymous:
        res = anonymous.get("/v1/models")
        wrong = anonymous.get("/v1/models", headers={"X-Internal-Token": "nope"})
    assert res.status_code == 401 and wrong.status_code == 401
    assert res.json()["error"]["code"] == "UNAUTHORIZED"


def test_models_report_availability(client):
    models = {m["id"]: m for m in client.get("/v1/models").json()["data"]["models"]}
    assert models["bicubic"]["available"] is True
    assert models["realesrgan-x4plus"]["available"] is False
    assert models["realesrgan-x4plus"]["unavailableReason"]


def test_bicubic_enhance_rgb_png(client, rgb_png):
    res = enhance(client, rgb_png, scale=4)
    assert res.status_code == 200 and res.headers["content-type"].startswith("multipart/form-data")
    parts = parse_multipart(res)
    metrics = json.loads(parts["metrics"])
    assert (metrics["outputWidth"], metrics["outputHeight"]) == (240, 160)
    img = decode_png(parts["display"])
    assert img.size == (240, 160) and img.mode == "RGB"
    assert "data" not in parts  # 8-bit input: no separate 16-bit data file


def test_16bit_tiff_returns_display_and_16bit_data(client, gray16_tiff):
    res = enhance(client, gray16_tiff, scale=2, name="cells.tif")
    assert res.status_code == 200
    parts = parse_multipart(res)
    data = decode_png(parts["data"])
    assert data.size == (96, 64) and data.mode.startswith("I")
    values = np.asarray(data)
    assert 900 <= values.min() and values.max() <= 4100  # original intensity scale preserved
    display = np.asarray(decode_png(parts["display"]))
    assert display.dtype == np.uint8 and display.max() > 200  # contrast-stretched for viewing
    assert json.loads(parts["metrics"])["bitDepth"] == 16


def test_preview_converts_tiff_to_8bit_png(client, gray16_tiff):
    res = client.post("/v1/preview", files={"image": ("a.tif", gray16_tiff)})
    assert res.status_code == 200
    img = decode_png(res.content)
    assert img.mode == "L" and img.size == (48, 32)


def test_rejects_invalid_scale_and_model(client, rgb_png):
    assert enhance(client, rgb_png, scale=3).status_code == 400
    assert enhance(client, rgb_png, model="../../x").status_code == 422
    unknown = enhance(client, rgb_png, model="does-not-exist")
    assert unknown.status_code == 404 and unknown.json()["error"]["code"] == "UNKNOWN_MODEL"


def test_unavailable_model_returns_422(client, rgb_png):
    res = enhance(client, rgb_png, model="swinir-real-x4")
    assert res.status_code == 422
    assert res.json()["error"]["code"] == "MODEL_UNAVAILABLE"


def test_rejects_corrupt_and_oversized_images(client):
    assert enhance(client, b"\x89PNG\r\n\x1a\ngarbage").json()["error"]["code"] == "INVALID_IMAGE"
    big_pixels = png_bytes(np.zeros((500, 500), dtype=np.uint8))
    assert enhance(client, big_pixels).status_code == 413
    assert enhance(client, b"x" * (3 * 1024 * 1024)).status_code == 413
    assert enhance(client, b"").status_code == 400
