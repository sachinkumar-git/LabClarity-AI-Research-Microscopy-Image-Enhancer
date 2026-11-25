from pathlib import Path

import numpy as np

from app.models.registry import ModelRegistry
from app.processing.diffmap import difference_map
from app.processing.resize import upscale
from app.quality.metrics import assess, full_reference
from app.quality.recommender import recommend
from tests import samples

BASE = {"width": 200, "height": 200, "noiseSigma": 0.005, "sharpness": 0.02,
        "rmsContrast": 0.2, "dynamicRangeUse": 0.6}


def registry(tmp_path: Path, weights=(), ml=True) -> ModelRegistry:
    for name in weights:
        (tmp_path / name).write_bytes(b"fake-weights")
    return ModelRegistry(tmp_path, ml_available=ml)


class TestMetrics:
    def test_identical_images_score_perfectly(self):
        img = samples.cells()
        assert full_reference(img, img) == {"psnr": 99.0, "ssim": 1.0}

    def test_noise_lowers_psnr_and_ssim(self):
        img = samples.cells()
        worse = full_reference(img, samples.noisy(img, 0.1))
        assert worse["psnr"] < 25 and worse["ssim"] < 0.8

    def test_assess_reports_consistency_and_skips_mismatched_reference(self):
        img = samples.cells(64)
        out = upscale(img, 2)
        report = assess(img, out, reference_px=np.zeros((10, 10, 1), np.float32))
        assert report["consistency"]["psnr"] > 30
        assert "skipped" in report["reference"]
        assert report["noReference"]["measuredAt"] == "input resolution"

    def test_assess_with_matching_reference(self):
        img = samples.cells(64)
        out = upscale(img, 2)
        assert assess(img, out, reference_px=out)["reference"]["ssim"] == 1.0


class TestRecommender:
    def test_clean_large_image_gets_baseline_only(self, tmp_path):
        result = recommend({**BASE, "width": 2000, "height": 2000}, registry(tmp_path))
        assert result["steps"] == [{"op": "super_resolution", "model": "bicubic", "scale": 2}]

    def test_noisy_small_image_without_models(self, tmp_path):
        result = recommend({**BASE, "noiseSigma": 0.04, "width": 256, "height": 300}, registry(tmp_path, ml=False))
        ops = [s["op"] for s in result["steps"]]
        assert ops == ["denoise", "super_resolution"]
        assert result["steps"][0]["method"] == "nlm"
        assert result["steps"][1] == {"op": "super_resolution", "model": "bicubic", "scale": 4}
        assert "0.040" in result["reasons"][0]["reason"]

    def test_prefers_installed_ai_models(self, tmp_path):
        reg = registry(tmp_path, ["scunet_color_real_psnr.pth", "RealESRGAN_x2plus.pth"])
        result = recommend({**BASE, "noiseSigma": 0.04, "width": 600, "height": 800}, reg)
        assert result["steps"][0]["model"] == "scunet-real-psnr"
        assert result["steps"][1]["model"] == "realesrgan-x2plus"
        assert any("GAN" in w for w in result["warnings"])

    def test_blur_and_low_contrast_rules(self, tmp_path):
        result = recommend({**BASE, "sharpness": 0.001, "rmsContrast": 0.02}, registry(tmp_path))
        ops = [s["op"] for s in result["steps"]]
        assert ops == ["deblur", "super_resolution", "contrast"]
        assert any("intensities" in w for w in result["warnings"])


def test_difference_map_highlights_changes():
    img = samples.cells(32)
    out = upscale(img, 2).copy()
    out[:8, :8] = 1.0  # a deliberate local change
    heatmap, stats = difference_map(img, out)
    assert heatmap.shape == (64, 64, 3) and heatmap.dtype == np.uint8
    assert heatmap[:8, :8].mean() > heatmap[32:, 32:].mean()
    assert 0 < stats["changedFraction"] < 0.1


def test_consistency_note_explains_expected_departures():
    img = samples.cells(32)
    assert assess(img, img, None, ops=["super_resolution"])["consistency"]["note"] is None
    assert "by design" in assess(img, img, None, ops=["contrast"])["consistency"]["note"]
    assert "intentionally" in assess(img, img, None, ops=["denoise"])["consistency"]["note"]
