"""Tests for the application factory: health, error format, security headers."""

from __future__ import annotations


def test_health_endpoint(client):
    res = client.get("/api/health")
    assert res.status_code == 200
    body = res.get_json()
    assert body["status"] == "ok"
    assert body["env"] == "testing"
    assert body["model_loaded"] is True


def test_unknown_api_route_returns_json_404(client):
    res = client.get("/api/does-not-exist")
    assert res.status_code == 404
    body = res.get_json()
    assert body["error"]["code"] == "not_found"


def test_security_headers_present(client):
    res = client.get("/api/health")
    assert res.headers["X-Content-Type-Options"] == "nosniff"
    assert res.headers["X-Frame-Options"] == "DENY"
    assert res.headers["Referrer-Policy"] == "strict-origin-when-cross-origin"


def test_predictor_is_available_on_app(app):
    predictor = app.extensions["predictor"]
    assert predictor.meta["version"] == "stub-1"
