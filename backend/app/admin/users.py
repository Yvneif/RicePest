"""Admin user management."""

from __future__ import annotations

from flask import request
from sqlalchemy import select
from werkzeug.exceptions import NotFound

from app.admin import admin_bp
from app.admin.guards import admin_required, get_current_user
from app.extensions import db
from app.models import User
from app.utils import UploadError


@admin_bp.get("/users")
@admin_required
def list_users():  # noqa: ANN202
    users = db.session.scalars(select(User).order_by(User.date_created)).all()
    return {"users": [u.to_dict() for u in users]}


@admin_bp.post("/users")
@admin_required
def create_user():  # noqa: ANN202
    data = request.get_json(silent=True) or {}
    username = (data.get("username") or "").strip()
    password = data.get("password") or ""
    if not 3 <= len(username) <= 80:
        raise UploadError("validation_error", "Username must be 3-80 characters.")
    if len(password) < 8:
        raise UploadError("validation_error", "Password must be at least 8 characters.")
    if db.session.scalar(select(User).where(User.username == username)) is not None:
        raise UploadError("username_taken", "That username already exists.")

    user = User(username=username)
    user.set_password(password)
    db.session.add(user)
    db.session.commit()
    return {"user": user.to_dict()}, 201


@admin_bp.post("/users/<int:user_id>/delete")
@admin_required
def delete_user(user_id: int):  # noqa: ANN202
    current = get_current_user()
    if current is not None and current.id == user_id:
        raise UploadError("self_delete", "You cannot delete the account you are logged in with.")
    user = db.session.get(User, user_id)
    if user is None:
        raise NotFound(description="User not found.")
    db.session.delete(user)
    db.session.commit()
    return {"ok": True}
