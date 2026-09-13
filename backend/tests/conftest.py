"""Shared pytest fixtures for the backend test suite."""

from __future__ import annotations

from pathlib import Path

import pytest

from app import create_app
from app.config import TestingConfig
from app.extensions import db


class StubPredictor:
    """Deterministic stand-in for the Keras predictor used in tests."""

    available = True

    def __init__(self, labels: list[str] | None = None, probs: list[float] | None = None):
        self.meta = {
            "labels": labels
            or ["Green Leafhopper", "Leaf Folders", "Rice Bug", "Stem Borer", "Unrecognized"],
            "input_size": 180,
            "arch": "resnet50",
            "version": "stub-1",
            "threshold": None,
        }
        self.probs = probs or [0.70, 0.12, 0.08, 0.06, 0.04]
        self.calls: list = []

    def predict(self, image) -> dict:
        self.calls.append(image)
        return {"labels": self.meta["labels"], "probs": self.probs}


def make_test_config(tmp_path: Path) -> type[TestingConfig]:
    """Build a TestingConfig whose data directories live under tmp_path."""

    attrs = {
        "DATA_DIR": tmp_path / "data",
        "UPLOAD_DIR": tmp_path / "data" / "uploads",
        "CATALOG_DIR": tmp_path / "data" / "catalog",
        "PREDICTOR": StubPredictor(),
    }
    return type("TestConfig", (TestingConfig,), attrs)


@pytest.fixture()
def app(tmp_path):
    application = create_app(make_test_config(tmp_path))
    with application.app_context():
        db.create_all()
    yield application


@pytest.fixture()
def runner(app):
    return app.test_cli_runner()


@pytest.fixture()
def client(app):
    return app.test_client()
