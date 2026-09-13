"""Admin API: authentication-protected management endpoints."""

from __future__ import annotations

from flask import Blueprint

from app.admin.auth import register_auth_routes

admin_bp = Blueprint("admin", __name__)
auth_bp = Blueprint("auth", __name__)

register_auth_routes(auth_bp)

# Import route modules so their view functions register on admin_bp.
from app.admin import catalog, stats, users  # noqa: E402,F401
