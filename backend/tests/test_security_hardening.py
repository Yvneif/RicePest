"""Tests for login throttling and API cache-control hardening."""

from __future__ import annotations

from app import create_app
from app.extensions import db
from app.models import User
from tests.conftest import StubPredictor


def test_login_is_rate_limited(tmp_path):
    from app.config import TestingConfig

    attrs = {
        "DATA_DIR": tmp_path / "data",
        "UPLOAD_DIR": tmp_path / "data" / "uploads",
        "CATALOG_DIR": tmp_path / "data" / "catalog",
        "PREDICTOR": StubPredictor(),
        # Enable the limiter just for this app with a tiny login budget.
        "RATELIMIT_ENABLED": True,
        "RATE_LIMIT_LOGIN": "3/minute",
    }
    config = type("RateLimitedConfig", (TestingConfig,), attrs)
    application = create_app(config)
    with application.app_context():
        db.create_all()
        user = User(username="admin2")
        user.set_password("secret-123")
        db.session.add(user)
        db.session.commit()
    client = application.test_client()

    for _ in range(3):
        res = client.post(
            "/api/auth/login",
            json={"username": "admin2", "password": "wrong"},
        )
        assert res.status_code == 401
    res = client.post(
        "/api/auth/login",
        json={"username": "admin2", "password": "wrong"},
    )
    assert res.status_code == 429
    assert res.get_json()["error"]["code"] == "too_many_requests"


def test_api_responses_are_not_cacheable(client):
    res = client.get("/api/health")
    assert res.status_code == 200
    assert res.headers["Cache-Control"] == "no-store"


def test_api_404_is_not_cacheable(client):
    res = client.get("/api/does-not-exist")
    assert res.status_code == 404
    assert res.headers["Cache-Control"] == "no-store"
