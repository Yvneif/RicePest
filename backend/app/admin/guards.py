"""Auth guards shared by admin endpoints."""

from __future__ import annotations

from functools import wraps

from flask import session
from werkzeug.exceptions import Unauthorized

from app.extensions import db
from app.models import User


def get_current_user() -> User | None:
    """Return the logged-in user from the session, or None."""
    user_id = session.get("user_id")
    if user_id is None:
        return None
    return db.session.get(User, user_id)


def admin_required(fn):
    """Decorator: respond 401 JSON unless an admin session is present."""

    @wraps(fn)
    def wrapper(*args, **kwargs):
        if get_current_user() is None:
            raise Unauthorized(description="Admin login required.")
        return fn(*args, **kwargs)

    return wrapper
