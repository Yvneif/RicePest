"""GET /api/scans - device-scoped scan history."""

from __future__ import annotations

from flask import request
from sqlalchemy import select

from app.api import api_bp
from app.extensions import db
from app.models import Scan
from app.utils import UploadError, clean_device_id


@api_bp.get("/scans")
def list_scans():  # noqa: ANN202
    device = clean_device_id(request.headers.get("X-Device-Id"))
    if device == "anonymous":
        raise UploadError("validation_error", "Send an X-Device-Id header to load your history.")
    try:
        limit = min(max(int(request.args.get("limit", 50)), 1), 100)
    except ValueError:
        raise UploadError("validation_error", "limit must be an integer.") from None

    rows = db.session.scalars(
        select(Scan)
        .where(Scan.device_id == device)
        .order_by(Scan.created_at.desc(), Scan.id.desc())
        .limit(limit)
    ).all()
    return {"scans": [row.to_dict() for row in rows]}
