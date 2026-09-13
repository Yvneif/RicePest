"""Small shared helpers: device ids, slugs, and secure image saving."""

from __future__ import annotations

import io
import re
import uuid
from pathlib import Path

from PIL import Image, UnidentifiedImageError
from werkzeug.datastructures import FileStorage

MAX_SIDE = 1600
_SLUG_RE = re.compile(r"[^a-z0-9]+")
_DEVICE_RE = re.compile(r"[^A-Za-z0-9_-]")


class UploadError(ValueError):
    """Raised when an uploaded file is not a usable image."""

    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code
        self.message = message


def clean_device_id(raw: str | None) -> str:
    """Normalize a client device id; return 'anonymous' when unusable."""
    cleaned = _DEVICE_RE.sub("", raw or "")[:64]
    return cleaned if len(cleaned) >= 8 else "anonymous"


def slugify(text: str) -> str:
    slug = _SLUG_RE.sub("-", (text or "").lower()).strip("-")
    return slug or "item"


def save_image(file: FileStorage, folder: Path) -> str:
    """Validate, normalize to JPEG, and save an upload. Returns the filename.

    The original client filename is never trusted - the stored name is a
    random UUID, which rules out path traversal and collisions.
    """
    filename = file.filename or ""
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext not in {"jpg", "jpeg", "png", "webp"}:
        raise UploadError("unsupported_format", "Only JPG, PNG, or WebP images are allowed.")
    raw = file.read()
    if not raw:
        raise UploadError("invalid_image", "The uploaded file is empty.")

    try:
        probe = Image.open(io.BytesIO(raw))
        probe.verify()
        img = Image.open(io.BytesIO(raw)).convert("RGB")
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError):
        raise UploadError("invalid_image", "That file is not a valid image.") from None

    if max(img.size) > MAX_SIDE:
        img.thumbnail((MAX_SIDE, MAX_SIDE))

    folder.mkdir(parents=True, exist_ok=True)
    name = f"{uuid.uuid4()}.jpg"
    img.save(folder / name, "JPEG", quality=88)
    return name
