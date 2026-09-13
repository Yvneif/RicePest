"""Rice Pest Identifier backend - application factory."""

from __future__ import annotations

import logging
from pathlib import Path

from flask import Flask, abort, jsonify, send_file

from app.config import get_config
from app.errors import register_error_handlers, register_security_headers
from app.extensions import db, limiter, migrate

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")


def _ensure_dirs(app: Flask) -> None:
    for attr in ("DATA_DIR", "UPLOAD_DIR", "CATALOG_DIR"):
        Path(app.config[attr]).mkdir(parents=True, exist_ok=True)


def _init_predictor(app: Flask) -> None:
    from app.ml.predictor import load_predictor

    override = app.config.get("PREDICTOR")
    if override is not None:
        predictor = override
    else:
        predictor = load_predictor(app.config["MODEL_PATH"], app.config["MODEL_META_PATH"])
    app.extensions["predictor"] = predictor


def _register_spa_serving(app: Flask) -> None:
    """Serve the built React app from frontend/dist when it exists.

    Keeps API and media responses intact and falls back to index.html so
    client-side routing works on refresh.
    """
    dist: Path = app.config["FRONTEND_DIST"]
    if not dist.is_dir():
        app.logger.info("Frontend dist not found at %s - API-only mode", dist)
        return

    index_file = dist / "index.html"

    @app.get("/", defaults={"path": ""})
    @app.get("/<path:path>")
    def spa(path: str):  # noqa: ANN202
        if path.startswith(("api/", "media/")):
            abort(404)
        candidate = (dist / path).resolve()
        if candidate.is_file() and candidate.is_relative_to(dist.resolve()):
            return send_file(candidate)
        return send_file(index_file)


def create_app(config_object=None) -> Flask:
    cfg = config_object or get_config()
    if getattr(cfg, "ENV_NAME", "") == "production":
        cfg.validate()

    app = Flask(__name__, static_folder=None)
    app.config.from_object(cfg)
    _ensure_dirs(app)

    db.init_app(app)
    migrate.init_app(app, db)
    limiter.init_app(app)

    with app.app_context():
        _init_predictor(app)

    from app.admin import admin_bp, auth_bp
    from app.api import api_bp
    from app.commands import register_commands
    from app.media import media_bp

    app.register_blueprint(api_bp, url_prefix="/api")
    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(admin_bp, url_prefix="/api/admin")
    app.register_blueprint(media_bp)
    register_commands(app)

    register_error_handlers(app)
    register_security_headers(app)
    _register_spa_serving(app)

    @app.get("/api/health")
    def health():  # noqa: ANN202
        predictor = app.extensions["predictor"]
        return jsonify(
            {
                "status": "ok",
                "env": app.config["ENV_NAME"],
                "model_loaded": bool(getattr(predictor, "available", False)),
                "model_version": predictor.meta.get("version"),
            }
        )

    return app
