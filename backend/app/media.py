"""Media serving for uploaded scans and catalog images.

Filenames are always server-generated UUIDs, but the route still validates
the name strictly as defense in depth.
"""

from __future__ import annotations

import re
from pathlib import Path

from flask import Blueprint, abort, current_app, send_from_directory

media_bp = Blueprint("media", __name__, url_prefix="/media")

_SAFE_NAME = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]{0,120}$")


def _safe(name: str) -> str:
    if not _SAFE_NAME.fullmatch(name) or ".." in name:
        abort(404)
    return name


def _folder(kind: str) -> Path:
    key = {"uploads": "UPLOAD_DIR", "catalog": "CATALOG_DIR"}[kind]
    return Path(current_app.config[key])


@media_bp.get("/<kind>/<name>")
def serve_media(kind: str, name: str):  # noqa: ANN202
    if kind not in ("uploads", "catalog"):
        abort(404)
    return send_from_directory(_folder(kind), _safe(name))
