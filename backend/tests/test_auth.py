"""Tests for /api/auth: login, session, current user, logout."""

from __future__ import annotations

import pytest

from app.extensions import db
from app.models import User


@pytest.fixture()
def admin_user(app):
    with app.app_context():
        user = User(username="admin")
        user.set_password("secret-123")
        db.session.add(user)
        db.session.commit()
        return user.username


def test_login_success_sets_session(client, admin_user):
    res = client.post("/api/auth/login", json={"username": "admin", "password": "secret-123"})
    assert res.status_code == 200
    body = res.get_json()
    assert body["user"]["username"] == "admin"
    assert "session" in res.headers.get("Set-Cookie", "")


def test_login_wrong_password_rejected(client, admin_user):
    res = client.post("/api/auth/login", json={"username": "admin", "password": "wrong"})
    assert res.status_code == 401
    assert res.get_json()["error"]["code"] == "invalid_credentials"


def test_login_missing_fields(client):
    res = client.post("/api/auth/login", json={"username": "admin"})
    assert res.status_code == 400


def test_me_requires_login(client):
    res = client.get("/api/auth/me")
    assert res.status_code == 401


def test_me_returns_user_after_login(client, admin_user):
    client.post("/api/auth/login", json={"username": "admin", "password": "secret-123"})
    res = client.get("/api/auth/me")
    assert res.status_code == 200
    assert res.get_json()["user"]["username"] == "admin"


def test_logout_clears_session(client, admin_user):
    client.post("/api/auth/login", json={"username": "admin", "password": "secret-123"})
    assert client.post("/api/auth/logout").status_code == 200
    assert client.get("/api/auth/me").status_code == 401
