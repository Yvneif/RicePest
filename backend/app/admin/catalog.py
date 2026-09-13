"""Admin catalog CRUD."""

from __future__ import annotations

from pathlib import Path

from flask import current_app, request
from sqlalchemy import select
from werkzeug.exceptions import NotFound

from app.admin import admin_bp
from app.admin.guards import admin_required
from app.extensions import db
from app.models import CatalogItem
from app.utils import UploadError, save_image, slugify


def _get_or_404(uid: str) -> CatalogItem:
    item = db.session.scalar(select(CatalogItem).where(CatalogItem.uid == uid))
    if item is None:
        raise NotFound(description="Catalog item not found.")
    return item


def _unique_slug(base: str) -> str:
    slug = base
    suffix = 2
    while db.session.scalar(select(CatalogItem).where(CatalogItem.slug == slug)) is not None:
        slug = f"{base}-{suffix}"
        suffix += 1
    return slug


@admin_bp.get("/catalog")
@admin_required
def admin_list_catalog():  # noqa: ANN202
    items = db.session.scalars(select(CatalogItem).order_by(CatalogItem.date_created.desc())).all()
    return {"items": [item.to_dict() for item in items]}


@admin_bp.post("/catalog")
@admin_required
def admin_create_catalog():  # noqa: ANN202
    title = (request.form.get("title") or "").strip()
    if not title:
        raise UploadError("validation_error", "Title is required.")
    item = CatalogItem(
        slug=_unique_slug(slugify(request.form.get("slug") or title)),
        title=title,
        scientific_name=(request.form.get("scientificName") or "").strip() or None,
        description=(request.form.get("description") or "").strip(),
        damage_signs=(request.form.get("damageSigns") or "").strip() or None,
        status=request.form.get("status")
        if request.form.get("status") in ("available", "unavailable")
        else "available",
    )
    image = request.files.get("image")
    if image is not None and image.filename:
        item.image = save_image(image, Path(current_app.config["CATALOG_DIR"]))
    db.session.add(item)
    db.session.commit()
    return {"item": item.to_dict()}, 201


@admin_bp.post("/catalog/<uid>")
@admin_required
def admin_update_catalog(uid: str):  # noqa: ANN202
    item = _get_or_404(uid)
    if "title" in request.form:
        title = (request.form.get("title") or "").strip()
        if not title:
            raise UploadError("validation_error", "Title cannot be empty.")
        item.title = title
    for form_key, attr in (
        ("description", "description"),
        ("damageSigns", "damage_signs"),
        ("scientificName", "scientific_name"),
    ):
        if form_key in request.form:
            setattr(item, attr, (request.form.get(form_key) or "").strip() or None)
    if request.form.get("status") in ("available", "unavailable"):
        item.status = request.form["status"]

    image = request.files.get("image")
    if image is not None and image.filename:
        catalog_dir = Path(current_app.config["CATALOG_DIR"])
        old = item.image
        item.image = save_image(image, catalog_dir)
        if old and old != item.image:
            (catalog_dir / old).unlink(missing_ok=True)
    db.session.commit()
    return {"item": item.to_dict()}


@admin_bp.post("/catalog/<uid>/delete")
@admin_required
def admin_delete_catalog(uid: str):  # noqa: ANN202
    item = _get_or_404(uid)
    if item.image:
        (Path(current_app.config["CATALOG_DIR"]) / item.image).unlink(missing_ok=True)
    db.session.delete(item)
    db.session.commit()
    return {"ok": True}
