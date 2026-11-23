import numpy as np
import pytest

from app.core.errors import ImageTooLargeError, InvalidImageError
from app.processing.channels import from_model_channels, to_model_channels
from app.processing.image_io import decode_image, to_hwc
from app.processing.normalize import from_unit_range, to_unit_range
from app.processing.resize import upscale
from app.processing.tiling import run_tiled
from tests.conftest import png_bytes, tiff_bytes


def nearest_x2(tile: np.ndarray) -> np.ndarray:
    return tile.repeat(2, axis=0).repeat(2, axis=1)


class TestNormalize:
    def test_uint8_is_linear_and_lossless(self):
        arr = np.arange(256, dtype=np.uint8).reshape(16, 16, 1)
        unit, params = to_unit_range(arr)
        assert params.bit_depth == 8
        assert np.array_equal(from_unit_range(unit, params, 8), arr)

    def test_uint16_stretch_roundtrips_within_percentile_band(self):
        arr = np.linspace(1000, 4000, 1000).astype(np.uint16).reshape(20, 50, 1)
        unit, params = to_unit_range(arr)
        assert unit.min() == 0.0 and unit.max() == 1.0
        restored = from_unit_range(unit, params, 16)
        assert np.abs(restored.astype(int) - arr.astype(int))[1:-1].max() <= 4

    def test_flat_image_does_not_divide_by_zero(self):
        unit, _ = to_unit_range(np.full((4, 4, 1), 500, dtype=np.uint16))
        assert np.isfinite(unit).all()


class TestLayouts:
    @pytest.mark.parametrize(
        ("shape", "expected"),
        [((10, 12), (10, 12, 1)), ((10, 12, 4), (10, 12, 3)), ((3, 10, 12), (10, 12, 3)),
         ((7, 10, 12), (10, 12, 1)), ((2, 5, 10, 12), (10, 12, 1))],
    )
    def test_to_hwc(self, shape, expected):
        assert to_hwc(np.zeros(shape, dtype=np.uint8)).shape == expected

    def test_two_channel_roundtrip_through_model_space(self):
        rgb = to_model_channels(np.ones((4, 4, 2), dtype=np.float32))
        assert rgb.shape == (4, 4, 3) and rgb[..., 2].max() == 0

    def test_grayscale_collapses_back(self):
        gray = np.random.default_rng(0).random((4, 4, 1)).astype(np.float32)
        assert np.allclose(from_model_channels(to_model_channels(gray), 1), gray)


class TestDecode:
    def test_decodes_16bit_tiff(self, gray16_tiff):
        image = decode_image(gray16_tiff, 10_000)
        assert (image.height, image.width, image.channels) == (32, 48, 1)
        assert image.norm.bit_depth == 16

    def test_decodes_16bit_png(self):
        image = decode_image(png_bytes(np.full((8, 8), 30000, dtype=np.uint16)), 10_000)
        assert image.norm.bit_depth == 16

    def test_rejects_garbage(self):
        with pytest.raises(InvalidImageError):
            decode_image(b"\x89PNG\r\n\x1a\nnot-really", 10_000)

    def test_rejects_oversized_before_decoding(self):
        with pytest.raises(ImageTooLargeError):
            decode_image(tiff_bytes(np.zeros((100, 100), dtype=np.uint8)), 5_000)


class TestTilingAndResize:
    def test_tiled_output_matches_untiled(self):
        pixels = np.random.default_rng(0).random((70, 90, 3)).astype(np.float32)
        expected = nearest_x2(pixels)
        tiled = run_tiled(nearest_x2, pixels, scale=2, tile=32, overlap=4)
        assert tiled.shape == expected.shape
        assert np.allclose(tiled, expected)

    def test_tiling_disabled_with_zero(self):
        pixels = np.zeros((10, 10, 3), dtype=np.float32)
        assert run_tiled(nearest_x2, pixels, 2, 0, 0).shape == (20, 20, 3)

    def test_upscale_shape_and_range(self):
        out = upscale(np.random.default_rng(0).random((5, 7, 3)).astype(np.float32), 4)
        assert out.shape == (20, 28, 3) and 0.0 <= out.min() and out.max() <= 1.0
