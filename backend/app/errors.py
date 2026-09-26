"""JSON error responses and security headers."""

from __future__ import annotations

import logging

from flask import Flask, jsonify, request
from werkzeug.exceptions import HTTPException

from app.ml.predictor import PredictorUnavailableError
from app.utils import UploadError

log = logging.getLogger(__name__)

DEFAULT_CSP = (
    "default-src 'self'; "
    "script-src 'self'; "
    "style-src 'self' 'unsafe-inline'; "
    "img-src 'self' data: blob:; "
    "media-src 'self' blob:; "
    "font-src 'self' data:; "
    "connect-src 'self' blob:; "
    "frame-ancestors 'none'; "
    "base-uri 'self'"
)


def _wants_json() -> bool:
    return request.path.startswith(("/api/", "/media/"))


def register_error_handlers(app: Flask) -> None:
    @app.errorhandler(UploadError)
    def handle_upload_error(exc: UploadError):
        return jsonify({"error": {"code": exc.code, "message": exc.message}}), 400

    @app.errorhandler(PredictorUnavailableError)
    def handle_model_unavailable(exc: PredictorUnavailableError):
        app.logger.error("Prediction requested but model unavailable: %s", exc)
        return (
            jsonify(
                {
                    "error": {
                        "code": "model_unavailable",
                        "message": "The identification model is not available right now.",
                    }
                }
            ),
            503,
        )

    @app.errorhandler(HTTPException)
    def handle_http_exception(exc: HTTPException):
        if _wants_json() or request.accept_mimetypes.best == "application/json":
            code = (exc.name or "error").lower().replace(" ", "_")
            message = exc.description if exc.code < 500 else "Something went wrong."
            if exc.code == 413:
                code = "payload_too_large"
                limit_mb = app.config["MAX_CONTENT_LENGTH"] // (1024 * 1024)
                message = f"Image exceeds the {limit_mb} MB upload limit."
            return jsonify({"error": {"code": code, "message": message}}), exc.code
        return exc

    @app.errorhandler(Exception)
    def handle_unexpected(exc: Exception):
        log.exception("Unhandled error on %s %s", request.method, request.path)
        if _wants_json():
            return jsonify(
                {"error": {"code": "internal_error", "message": "Something went wrong."}}
            ), 500
        raise exc


def register_security_headers(app: Flask) -> None:
    @app.after_request
    def set_headers(response):
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("X-Frame-Options", "DENY")
        response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
        if request.path.startswith("/api/"):
            # API responses carry auth/session state and scan data; never allow
            # shared or browser caches to store them.
            response.headers.setdefault("Cache-Control", "no-store")
        if app.config.get("CSP_ENABLED") and not request.path.startswith("/api/"):
            response.headers.setdefault("Content-Security-Policy", DEFAULT_CSP)
        return response
