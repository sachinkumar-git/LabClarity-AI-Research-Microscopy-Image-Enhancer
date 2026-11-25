import io
import json

import numpy as np
from PIL import Image

from tests import samples
from tests.conftest import parse_multipart, png_bytes, tiff_bytes

NOISY_PNG = png_bytes(samples.to_uint8(samples.noisy(samples.cells(96), 0.06)))


def process(client, data, steps, roi=None, reference=None, name="img.png"):
    form = {"pipeline": json.dumps({"steps": steps})}
    if roi:
        form["roi"] = json.dumps(roi)
    files = {"image": (name, data)}
    if reference is not None:
        files["reference"] = ("ref.png", reference)
    return client.post("/v1/process", data=form, files=files)


def test_models_include_operations_catalog(client):
    data = client.get("/v1/models").json()["data"]
    assert {op["op"] for op in data["operations"]} == {"denoise", "deblur", "contrast", "super_resolution"}
    scunet = next(m for m in data["models"] if m["id"] == "scunet-real-psnr")
    assert scunet["task"] == "denoise" and scunet["scales"] == [1]


def test_analyze_detects_noise_and_recommends(client):
    body = client.post("/v1/analyze", files={"image": ("n.png", NOISY_PNG)}).json()["data"]
    assert body["analysis"]["noiseSigma"] > 0.03
    assert body["recommendation"]["steps"][0]["op"] == "denoise"


def test_process_full_pipeline_returns_audited_outputs(client):
    steps = [{"op": "denoise"}, {"op": "deblur", "method": "unsharp"},
             {"op": "super_resolution", "model": "bicubic", "scale": 2}]
    res = process(client, NOISY_PNG, steps)
    assert res.status_code == 200
    parts = parse_multipart(res)
    audit = json.loads(parts["audit"])
    assert [s["op"] for s in audit["steps"]] == ["denoise", "deblur", "super_resolution"]
    assert audit["steps"][0]["derived"]["estimatedSigma"] > 0.03
    assert audit["output"]["width"] == 192 and audit["output"]["intensityPreserving"] is True
    assert audit["software"]["scikit-image"]
    assert audit["quality"]["noReference"]["output"]["noiseSigma"] < audit["quality"]["noReference"]["input"]["noiseSigma"]

    display = Image.open(io.BytesIO(parts["display"]))
    assert "Not verified scientific data" in display.text["Description"]
    assert json.loads(display.text["LabClarity-Provenance"])["steps"][2]["model"] == "bicubic"
    assert Image.open(io.BytesIO(parts["diff"])).size == (192, 192)


def test_roi_processing_crops_before_processing(client):
    res = process(client, NOISY_PNG, [{"op": "super_resolution", "model": "bicubic", "scale": 4}],
                  roi={"x": 10, "y": 20, "width": 32, "height": 24})
    audit = json.loads(parse_multipart(res)["audit"])
    assert audit["input"]["roi"] == {"x": 10, "y": 20, "width": 32, "height": 24}
    assert (audit["output"]["width"], audit["output"]["height"]) == (128, 96)


def test_contrast_suppresses_16bit_data_output(client):
    tif = tiff_bytes((samples.cells(64)[..., 0] * 4000 + 500).astype(np.uint16))
    plain = parse_multipart(process(client, tif, [{"op": "denoise"}], name="a.tif"))
    assert "data" in plain
    remapped = parse_multipart(process(client, tif, [{"op": "contrast"}], name="a.tif"))
    assert "data" not in remapped
    assert json.loads(remapped["audit"])["output"]["intensityPreserving"] is False


def test_reference_metrics_with_ground_truth(client):
    clean = samples.to_uint8(samples.cells(96))
    res = process(client, NOISY_PNG, [{"op": "denoise"}], reference=png_bytes(clean))
    reference = json.loads(parse_multipart(res)["audit"])["quality"]["reference"]
    assert reference["method"].startswith("output vs user-supplied") and reference["psnr"] > 20


def test_process_validation_errors(client):
    assert process(client, NOISY_PNG, [{"op": "nope"}]).status_code == 400
    out_of_bounds = process(client, NOISY_PNG, [{"op": "denoise"}], roi={"x": 90, "y": 0, "width": 20, "height": 20})
    assert out_of_bounds.status_code == 400
    ai = process(client, NOISY_PNG, [{"op": "denoise", "method": "ai", "model": "scunet-real-psnr"}])
    assert ai.status_code == 422 and ai.json()["error"]["code"] == "MODEL_UNAVAILABLE"
    wrong_task = process(client, NOISY_PNG, [{"op": "denoise", "method": "ai", "model": "bicubic"}])
    assert wrong_task.status_code == 404


def test_pipeline_validate_normalises_and_checks_models(client):
    ok = client.post("/v1/pipeline/validate", json={"steps": [{"op": "denoise"}, {"op": "super_resolution", "model": "bicubic", "scale": 2}]})
    assert ok.status_code == 200
    data = ok.json()["data"]
    assert data["scale"] == 2 and data["pipeline"]["steps"][0]["method"] == "nlm"
    assert client.post("/v1/pipeline/validate", json={"steps": [{"op": "deblur", "iterations": 99}]}).status_code == 400
    missing = client.post("/v1/pipeline/validate", json={"steps": [{"op": "super_resolution", "model": "realesrgan-x4plus"}]})
    assert missing.status_code == 422
