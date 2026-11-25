import json

import numpy as np
import pytest

from app.core.errors import BadRequestError
from app.pipeline import ops_classical
from app.pipeline.executor import crop_roi
from app.pipeline.schemas import Roi, parse_pipeline, parse_roi
from app.quality.metrics import sharpness
from tests import samples


def spec(*steps):
    return json.dumps({"steps": list(steps)})


class TestSchemas:
    def test_applies_defaults_and_scale(self):
        parsed = parse_pipeline(spec({"op": "denoise"}, {"op": "super_resolution", "model": "bicubic", "scale": 2}))
        assert parsed.steps[0].method == "nlm" and parsed.steps[0].strength == 1.0
        assert parsed.scale == 2

    @pytest.mark.parametrize(
        "steps",
        [
            [],
            [{"op": "explode"}],
            [{"op": "deblur", "iterations": 500}],
            [{"op": "denoise", "method": "ai"}],  # ai requires a model
            [{"op": "denoise", "rogue": 1}],  # unknown fields rejected
            [{"op": "super_resolution", "model": "bicubic"}] * 2,
            [{"op": "contrast"}] * 7,
        ],
    )
    def test_rejects_invalid_pipelines(self, steps):
        with pytest.raises(BadRequestError):
            parse_pipeline(json.dumps({"steps": steps}))

    def test_rejects_malformed_json_and_small_roi(self):
        with pytest.raises(BadRequestError):
            parse_pipeline("{not json")
        with pytest.raises(BadRequestError):
            parse_roi('{"x":0,"y":0,"width":4,"height":4}')


class TestClassicalOps:
    def test_denoise_reduces_estimated_noise(self):
        img = samples.noisy(samples.cells(), 0.05)
        for method in ("nlm", "tv"):
            out, info = ops_classical.denoise(img, method, 1.0)
            assert ops_classical.estimate_noise(out) < 0.5 * info["estimatedSigma"]
            assert out.shape == img.shape and out.dtype == np.float32

    def test_noise_estimate_is_accurate(self):
        assert abs(ops_classical.estimate_noise(samples.noisy(samples.cells(128), 0.03)) - 0.03) < 0.005

    def test_deblur_restores_sharpness(self):
        clean = samples.cells()
        soft = samples.blurred(clean, 1.5)
        for method in ("richardson_lucy", "unsharp"):
            out, _ = ops_classical.deblur(soft, method, 1.5, 15, 1.5)
            assert sharpness(out) > sharpness(soft) * 1.3

    def test_contrast_methods_expand_range(self):
        dull = samples.cells() * 0.1 + 0.45
        for method in ("clahe", "stretch"):
            out, _ = ops_classical.contrast(dull, method, 0.01, 0.5, 99.5)
            assert out.std() > dull.std() * 2
            assert 0.0 <= out.min() and out.max() <= 1.0


class TestRoi:
    def test_crops_exact_region(self):
        img = np.arange(100 * 80, dtype=np.float32).reshape(80, 100, 1)
        out = crop_roi(img, Roi(x=10, y=20, width=30, height=40))
        assert out.shape == (40, 30, 1) and out[0, 0, 0] == img[20, 10, 0]

    def test_rejects_out_of_bounds(self):
        with pytest.raises(BadRequestError):
            crop_roi(np.zeros((50, 50, 1), np.float32), Roi(x=40, y=0, width=20, height=20))


def test_deconvolution_does_not_ring_at_borders():
    img = samples.blurred(samples.cells(96), 1.5)
    out, info = ops_classical.deblur(img, "richardson_lucy", 1.0, 10, 1.0)
    change = np.abs(out - img)[..., 0]
    border = np.r_[change[:3].ravel(), change[-3:].ravel(), change[:, :3].ravel(), change[:, -3:].ravel()]
    assert border.mean() < 2 * change[10:-10, 10:-10].mean()
    assert info["boundary"] == "reflect-padded"
