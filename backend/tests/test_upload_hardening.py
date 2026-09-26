"""Tests for image-upload hardening: format probing and pixel limits."""

from __future__ import annotations

import io

from PIL import Image

from app.utils import MAX_IMAGE_PIXELS, UploadError, save_image
from tests.helpers import make_image
from tests.test_predict import post_predict


def _raw(fmt: str, size=(32, 32)) -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", size, (30, 130, 60)).save(buf, fmt)
    return buf.getvalue()


def test_spoofed_gif_rejected_as_unsupported_format(tmp_path):
    stream = io.BytesIO(_raw("GIF"))
    stream.filename = "photo.jpg"  # noqa: B018 - FileStorage below carries the name
    from werkzeug.datastructures import FileStorage

    try:
        save_image(FileStorage(stream=stream, filename="photo.jpg"), tmp_path)
    except UploadError as exc:
        assert exc.code == "unsupported_format"
    else:  # pragma: no cover - must not accept spoofed content
        raise AssertionError("spoofed GIF was accepted")


def test_spoofed_bmp_rejected_as_unsupported_format(tmp_path):
    from werkzeug.datastructures import FileStorage

    try:
        save_image(
            FileStorage(stream=io.BytesIO(_raw("BMP")), filename="photo.jpg"),
            tmp_path,
        )
    except UploadError as exc:
        assert exc.code == "unsupported_format"
    else:  # pragma: no cover - must not accept spoofed content
        raise AssertionError("spoofed BMP was accepted")


def test_predict_rejects_spoofed_format_with_envelope(client):
    buf = io.BytesIO(_raw("GIF"))
    res = post_predict(client, buf, "photo.jpg")
    assert res.status_code == 400
    assert res.get_json()["error"]["code"] == "unsupported_format"


def test_oversized_dimensions_rejected(tmp_path):
    from werkzeug.datastructures import FileStorage

    side = int(MAX_IMAGE_PIXELS**0.5) + 500  # comfortably over the pixel budget
    try:
        save_image(
            FileStorage(stream=io.BytesIO(_raw("JPEG", (side, side))), filename="big.jpg"),
            tmp_path,
        )
    except UploadError as exc:
        assert exc.code == "invalid_image"
    else:  # pragma: no cover - must not accept decompression bombs
        raise AssertionError("oversized image was accepted")


def test_valid_png_still_accepted(tmp_path):
    from werkzeug.datastructures import FileStorage

    name = save_image(
        FileStorage(stream=io.BytesIO(_raw("PNG")), filename="photo.png"),
        tmp_path,
    )
    assert name.endswith(".jpg")
    assert (tmp_path / name).exists()


def test_predict_accepts_webp(client, app):
    buf, name = make_image(fmt="WEBP", ext="webp")
    res = post_predict(client, buf, name)
    assert res.status_code == 200, res.get_data(as_text=True)
