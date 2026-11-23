"""Decoding of PNG / JPEG / TIFF (8/16-bit, grayscale, multichannel, stacks) and PNG encoding."""
from __future__ import annotations

import io
from dataclasses import dataclass

import numpy as np
import tifffile
from PIL import Image, UnidentifiedImageError

from app.core.errors import ImageTooLargeError, InvalidImageError
from app.processing.normalize import NormParams, to_unit_range

TIFF_MAGIC = (b"II*\x00", b"MM\x00*")
PIL_MODE_MAP = {"1": "L", "LA": "L", "P": "RGB", "RGBA": "RGB", "CMYK": "RGB", "YCbCr": "RGB"}


@dataclass(frozen=True)
class DecodedImage:
    pixels: np.ndarray  # float32, HxWxC, C in {1, 2, 3}, values in [0, 1]
    norm: NormParams

    @property
    def height(self) -> int:
        return int(self.pixels.shape[0])

    @property
    def width(self) -> int:
        return int(self.pixels.shape[1])

    @property
    def channels(self) -> int:
        return int(self.pixels.shape[2])


def decode_image(data: bytes, max_pixels: int) -> DecodedImage:
    raw = _read_tiff(data, max_pixels) if data[:4] in TIFF_MAGIC else _read_pillow(data, max_pixels)
    pixels, norm = to_unit_range(to_hwc(raw))
    return DecodedImage(pixels=pixels, norm=norm)


def to_hwc(arr: np.ndarray) -> np.ndarray:
    """Coerces arbitrary microscopy layouts into HxWxC with at most 3 channels."""
    arr = np.squeeze(arr)
    while arr.ndim > 3:  # time / z / series axes: keep the first plane
        arr = arr[0]
    if arr.ndim == 2:
        arr = arr[..., np.newaxis]
    elif arr.ndim == 3 and arr.shape[-1] > 4:
        # Channel-first (C,H,W) when the leading axis is small, otherwise a z-stack.
        arr = np.moveaxis(arr, 0, -1) if arr.shape[0] <= 4 else arr[0][..., np.newaxis]
    if arr.ndim != 3 or min(arr.shape[:2]) < 1:
        raise InvalidImageError("Unsupported image layout")
    if arr.shape[-1] == 4:  # drop alpha
        arr = arr[..., :3]
    return np.ascontiguousarray(arr)


def _check_pixels(width: int, height: int, max_pixels: int) -> None:
    if width * height > max_pixels:
        raise ImageTooLargeError(
            f"Image is {width}x{height}; the maximum is {max_pixels:,} pixels"
        )


def _read_tiff(data: bytes, max_pixels: int) -> np.ndarray:
    try:
        with tifffile.TiffFile(io.BytesIO(data)) as tif:
            page = tif.pages[0]
            _check_pixels(int(page.imagewidth), int(page.imagelength), max_pixels)
            return page.asarray()
    except ImageTooLargeError:
        raise
    except Exception as exc:  # tifffile raises many error types for corrupt input
        raise InvalidImageError("Could not decode TIFF image") from exc


def _read_pillow(data: bytes, max_pixels: int) -> np.ndarray:
    try:
        with Image.open(io.BytesIO(data)) as img:
            _check_pixels(img.width, img.height, max_pixels)  # before decoding pixels
            img.load()
            if img.mode in PIL_MODE_MAP:
                img = img.convert(PIL_MODE_MAP[img.mode])
            arr = np.asarray(img)
    except ImageTooLargeError:
        raise
    except (UnidentifiedImageError, OSError, ValueError, Image.DecompressionBombError) as exc:
        raise InvalidImageError("Could not decode image") from exc
    if arr.dtype == np.int32 and arr.size and 0 <= arr.min() and arr.max() <= 65535:
        arr = arr.astype(np.uint16)  # 16-bit PNGs decode as mode "I"
    return arr


def encode_png(arr: np.ndarray, compress_level: int = 3) -> bytes:
    """Encodes HxWx{1,3} uint8/uint16 to PNG. 16-bit is kept for grayscale only (PNG/Pillow limit)."""
    if arr.shape[-1] == 1:
        img = Image.fromarray(arr[..., 0])  # uint8 -> "L", uint16 -> "I;16"
    elif arr.shape[-1] == 3:
        img = Image.fromarray((arr >> 8).astype(np.uint8) if arr.dtype == np.uint16 else arr)
    else:
        raise InvalidImageError("Cannot encode image with this channel count")
    buffer = io.BytesIO()
    img.save(buffer, format="PNG", compress_level=compress_level)
    return buffer.getvalue()
