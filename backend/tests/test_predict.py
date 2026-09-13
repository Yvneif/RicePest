"""Tests for POST /api/predict and GET /api/scans (device-scoped history)."""

from __future__ import annotations

import io

import pytest

from app.ml.predictor import UnavailablePredictor
from tests.helpers import DEVICE_ID, make_image


def post_predict(client, buf, filename):
    return client.post(
        "/api/predict",
        data={"image": (buf, filename)},
        content_type="multipart/form-data",
        headers={"X-Device-Id": DEVICE_ID},
    )


def test_predict_success_saves_scan_and_file(client, app):
    buf, name = make_image()
    res = post_predict(client, buf, name)
    assert res.status_code == 200, res.get_data(as_text=True)
    body = res.get_json()

    assert body["label"] == "Green Leafhopper"
    assert body["confidence"] == pytest.approx(0.70, abs=1e-3)
    assert len(body["top3"]) == 3
    assert body["model"]["version"] == "stub-1"
    assert body["imageUrl"].startswith("/media/uploads/")

    with app.app_context():
        from app.extensions import db
        from app.models import Scan

        scans = db.session.query(Scan).all()
        assert len(scans) == 1
        assert scans[0].device_id == DEVICE_ID
        saved = app.config["UPLOAD_DIR"] / scans[0].image
        assert saved.exists()


def test_predict_normalizes_upload_to_jpeg(client, app):
    buf, name = make_image(fmt="PNG", ext="png")
    res = post_predict(client, buf, name)
    assert res.status_code == 200
    with app.app_context():
        from app.extensions import db
        from app.models import Scan

        scan = db.session.query(Scan).one()
        assert scan.image.endswith(".jpg")


def test_predict_rejects_bad_extension(client):
    buf, name = make_image(ext="exe")
    res = post_predict(client, buf, name)
    assert res.status_code == 400
    assert res.get_json()["error"]["code"] == "unsupported_format"


def test_predict_rejects_non_image_content(client):
    res = post_predict(client, io.BytesIO(b"not an image"), "photo.jpg")
    assert res.status_code == 400
    assert res.get_json()["error"]["code"] == "invalid_image"


def test_predict_missing_file(client):
    res = client.post("/api/predict", data={}, content_type="multipart/form-data")
    assert res.status_code == 400
    assert res.get_json()["error"]["code"] == "validation_error"


def test_predict_returns_503_when_model_unavailable(client, app):
    app.extensions["predictor"] = UnavailablePredictor("model file missing")
    buf, name = make_image()
    res = post_predict(client, buf, name)
    assert res.status_code == 503
    assert res.get_json()["error"]["code"] == "model_unavailable"


def test_scans_require_device_header(client):
    res = client.get("/api/scans")
    assert res.status_code == 400


def test_scans_return_device_history(client):
    post_predict(client, *make_image())
    res = client.get("/api/scans", headers={"X-Device-Id": DEVICE_ID})
    assert res.status_code == 200
    body = res.get_json()
    assert len(body["scans"]) == 1
    assert body["scans"][0]["label"] == "Green Leafhopper"


def test_scans_isolated_between_devices(client):
    post_predict(client, *make_image())
    res = client.get("/api/scans", headers={"X-Device-Id": "another-device-1234567890"})
    assert res.status_code == 200
    assert res.get_json()["scans"] == []
