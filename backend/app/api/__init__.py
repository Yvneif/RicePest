"""Public API blueprint: identification, recommendations, catalog, scans."""

from __future__ import annotations

from flask import Blueprint

api_bp = Blueprint("api", __name__)

# Import route modules so their view functions register on api_bp.
from app.api import catalog, predict, recommend, scans  # noqa: E402,F401
