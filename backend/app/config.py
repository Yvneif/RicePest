"""Environment-driven configuration objects.

Values come from environment variables (optionally loaded from
``ricepest-app/.env``). Paths may be absolute or relative to the project
root (the parent of ``backend/``).
"""

from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv

BACKEND_DIR = Path(__file__).resolve().parent.parent
PROJECT_ROOT = BACKEND_DIR.parent

load_dotenv(PROJECT_ROOT / ".env")


def _resolve(value: str | Path) -> Path:
    path = Path(value)
    return path if path.is_absolute() else PROJECT_ROOT / path


def _database_url(data_dir: Path) -> str:
    url = os.environ.get("DATABASE_URL")
    if url:
        return url
    return f"sqlite:///{data_dir / 'app.db'}"


class Config:
    """Base configuration shared by all environments."""

    ENV_NAME = os.environ.get("FLASK_ENV", "production")
    SECRET_KEY = os.environ.get("SECRET_KEY", "")  # noqa: S105 - empty default; production validates
    DEBUG = False
    TESTING = False

    DATA_DIR = _resolve(os.environ.get("DATA_DIR", "data"))
    UPLOAD_DIR = DATA_DIR / "uploads"
    CATALOG_DIR = DATA_DIR / "catalog"
    SQLALCHEMY_DATABASE_URI = _database_url(DATA_DIR)
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    MODEL_PATH = _resolve(os.environ.get("MODEL_PATH", "models/my_trained_model6.keras"))
    MODEL_META_PATH = _resolve(os.environ.get("MODEL_META_PATH", "models/model_meta.json"))

    MAX_CONTENT_LENGTH = int(os.environ.get("MAX_UPLOAD_MB", "8")) * 1024 * 1024
    ALLOWED_IMAGE_EXTENSIONS = {"jpg", "jpeg", "png", "webp"}

    RATE_LIMIT_DEFAULT = os.environ.get("RATE_LIMIT_DEFAULT", "240/hour")
    RATE_LIMIT_PREDICT = os.environ.get("RATE_LIMIT_PREDICT", "30/hour")
    RATE_LIMIT_LOGIN = os.environ.get("RATE_LIMIT_LOGIN", "10/minute")

    # Flask-Limiter reads ``RATELIMIT_DEFAULT`` from the Flask app config on
    # init_app; keep it in sync with ``RATE_LIMIT_DEFAULT``.
    RATELIMIT_DEFAULT = RATE_LIMIT_DEFAULT

    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = "Lax"
    SESSION_COOKIE_SECURE = os.environ.get("COOKIE_SECURE", "false").lower() == "true"

    FRONTEND_DIST = _resolve(os.environ.get("FRONTEND_DIST", "frontend/dist"))
    CSP_ENABLED = os.environ.get("CSP_ENABLED", "true").lower() == "true"


class DevelopmentConfig(Config):
    ENV_NAME = "development"
    DEBUG = True


class ProductionConfig(Config):
    ENV_NAME = "production"

    # HTTPS is expected in production (see docs/DEPLOYMENT.md checklist), so
    # cookies are Secure unless explicitly disabled for local plain-HTTP runs.
    raw_cookie_secure = os.environ.get("COOKIE_SECURE")
    SESSION_COOKIE_SECURE = (
        raw_cookie_secure.lower() == "true" if raw_cookie_secure is not None else True
    )

    @staticmethod
    def validate() -> None:
        """Fail fast when production requirements are not met."""
        if not Config.SECRET_KEY:
            raise RuntimeError(
                "SECRET_KEY must be set in production. "
                'Generate one with: python -c "import secrets; print(secrets.token_hex(32))"'
            )


class TestingConfig(Config):
    ENV_NAME = "testing"
    TESTING = True
    SECRET_KEY = "test-secret"  # noqa: S105 - throwaway value, never used in production
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    RATELIMIT_ENABLED = False
    CSP_ENABLED = False
    # Tests inject a stub predictor via the PREDICTOR attribute.
    PREDICTOR = None


_CONFIGS = {
    "development": DevelopmentConfig,
    "production": ProductionConfig,
    "testing": TestingConfig,
}


def get_config(env: str | None = None) -> type[Config]:
    """Return the configuration class for *env* (defaults to FLASK_ENV)."""
    name = env or os.environ.get("FLASK_ENV", "production")
    return _CONFIGS.get(name, ProductionConfig)
