"""GET /api/catalog - public pest library."""

from __future__ import annotations

from flask import current_app
from sqlalchemy import select

from app.api import api_bp
from app.extensions import db
from app.models import CatalogItem


@api_bp.get("/catalog")
def list_catalog():  # noqa: ANN202
    items = db.session.scalars(select(CatalogItem).order_by(CatalogItem.title)).all()
    return {"items": [item.to_dict() for item in items]}


@api_bp.get("/model/info")
def model_info():  # noqa: ANN202
    predictor = current_app.extensions["predictor"]
    return {
        "available": bool(predictor.available),
        "version": predictor.meta.get("version"),
        "labels": predictor.meta.get("labels", []),
        "inputSize": predictor.meta.get("input_size"),
    }
