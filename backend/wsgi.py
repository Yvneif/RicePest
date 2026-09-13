"""WSGI entry point for production servers (gunicorn, waitress)."""

from __future__ import annotations

from app import create_app

app = create_app()
