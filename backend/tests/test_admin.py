"""Tests for admin endpoints: catalog CRUD, users, stats."""

from __future__ import annotations

import pytest

from app.extensions import db
from app.models import CatalogItem, User
from tests.helpers import DEVICE_ID, make_image


@pytest.fixture()
def auth_client(app, client):
    with app.app_context():
        user = User(username="admin")
        user.set_password("secret-123")
        db.session.add(user)
        db.session.commit()
    client.post("/api/auth/login", json={"username": "admin", "password": "secret-123"})
    return client


# ---------------------------------------------------------------- guard ----


@pytest.mark.parametrize(
    ("method", "path"),
    [
        ("GET", "/api/admin/catalog"),
        ("GET", "/api/admin/users"),
        ("GET", "/api/admin/stats"),
    ],
)
def test_admin_routes_require_login(client, method, path):
    res = getattr(client, method.lower())(path)
    assert res.status_code == 401


# -------------------------------------------------------------- catalog ----


def test_admin_can_create_catalog_item(auth_client, app):
    buf, name = make_image()
    res = auth_client.post(
        "/api/admin/catalog",
        data={
            "title": "Black Bug",
            "description": "New pest",
            "damageSigns": "Damaged stems",
            "status": "available",
            "image": (buf, name),
        },
        content_type="multipart/form-data",
    )
    assert res.status_code == 201, res.get_data(as_text=True)
    body = res.get_json()["item"]
    assert body["slug"] == "black-bug"
    assert body["imageUrl"].startswith("/media/catalog/")
    saved = app.config["CATALOG_DIR"] / body["imageUrl"].rsplit("/", 1)[1]
    assert saved.exists()


def test_admin_create_requires_title(auth_client):
    res = auth_client.post(
        "/api/admin/catalog", data={"description": "no title"}, content_type="multipart/form-data"
    )
    assert res.status_code == 400


def test_admin_can_update_catalog_item(auth_client, app):
    with app.app_context():
        item = CatalogItem(slug="rice-bug", title="Rice Bug", description="old")
        db.session.add(item)
        db.session.commit()
        uid = item.uid

    res = auth_client.post(
        f"/api/admin/catalog/{uid}",
        data={"title": "Rice Bug", "description": "updated"},
        content_type="multipart/form-data",
    )
    assert res.status_code == 200
    with app.app_context():
        assert db.session.get(CatalogItem, 1).description == "updated"


def test_admin_can_delete_catalog_item(auth_client, app):
    with app.app_context():
        item = CatalogItem(slug="rice-bug", title="Rice Bug")
        db.session.add(item)
        db.session.commit()
        uid = item.uid

    res = auth_client.post(f"/api/admin/catalog/{uid}/delete")
    assert res.status_code == 200
    with app.app_context():
        assert db.session.query(CatalogItem).count() == 0


# ---------------------------------------------------------------- users ----


def test_admin_can_list_and_create_users(auth_client):
    res = auth_client.post(
        "/api/admin/users", json={"username": "tech1", "password": "longpass123"}
    )
    assert res.status_code == 201
    res = auth_client.get("/api/admin/users")
    usernames = {u["username"] for u in res.get_json()["users"]}
    assert {"admin", "tech1"} <= usernames


def test_admin_create_user_rejects_short_password(auth_client):
    res = auth_client.post("/api/admin/users", json={"username": "tech2", "password": "short"})
    assert res.status_code == 400


def test_admin_create_user_rejects_duplicate(auth_client):
    auth_client.post("/api/admin/users", json={"username": "tech1", "password": "longpass123"})
    res = auth_client.post(
        "/api/admin/users", json={"username": "tech1", "password": "longpass123"}
    )
    assert res.status_code == 400


# ---------------------------------------------------------------- stats ----


def test_stats_shape_with_scan_data(auth_client, client):
    buf, name = make_image()
    client.post(
        "/api/predict",
        data={"image": (buf, name)},
        content_type="multipart/form-data",
        headers={"X-Device-Id": DEVICE_ID},
    )
    res = auth_client.get("/api/admin/stats")
    assert res.status_code == 200
    body = res.get_json()
    assert body["totals"]["scans"] == 1
    assert body["totals"]["users"] == 1
    assert body["pestMix"][0]["label"] == "Green Leafhopper"
    assert len(body["perDay"]) == 14
    assert body["recentScans"][0]["label"] == "Green Leafhopper"
