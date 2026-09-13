"""Shared test helpers."""

from __future__ import annotations

import io

from PIL import Image


def make_image(fmt: str = "JPEG", size: tuple = (32, 32), ext: str = "jpg", color=(30, 130, 60)):
    """Return (bytes_stream, filename) for a tiny generated image."""
    buf = io.BytesIO()
    Image.new("RGB", size, color).save(buf, fmt)
    buf.seek(0)
    return buf, f"photo.{ext}"


DEVICE_ID = "test-device-0123456789abcdef"
