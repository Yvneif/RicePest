"""Tests for the `flask seed` CLI command."""

from __future__ import annotations

from app.extensions import db
from app.models import CatalogItem, User


def test_seed_creates_admin_and_catalog(app, runner, monkeypatch):
    monkeypatch.setenv("ADMIN_USERNAME", "admin")
    monkeypatch.setenv("ADMIN_PASSWORD", "correct-horse-battery")
    result = runner.invoke(args=["seed"])
    assert result.exit_code == 0, result.output

    with app.app_context():
        user = db.session.scalar(db.select(User).where(User.username == "admin"))
        assert user is not None
        assert user.check_password("correct-horse-battery")
        items = db.session.scalars(db.select(CatalogItem)).all()
        assert len(items) == 4
        slugs = {i.slug for i in items}
        assert slugs == {"green-leafhopper", "leaf-folders", "rice-bug", "stem-borer"}


def test_seed_is_idempotent(app, runner, monkeypatch):
    monkeypatch.setenv("ADMIN_PASSWORD", "pw-123456")
    assert runner.invoke(args=["seed"]).exit_code == 0
    assert runner.invoke(args=["seed"]).exit_code == 0

    with app.app_context():
        assert len(db.session.scalars(db.select(User)).all()) == 1
        assert len(db.session.scalars(db.select(CatalogItem)).all()) == 4


def test_seed_generates_password_when_unset(app, runner, monkeypatch):
    monkeypatch.delenv("ADMIN_PASSWORD", raising=False)
    result = runner.invoke(args=["seed"])
    assert result.exit_code == 0
    assert "generated" in result.output.lower()
    assert "password" in result.output.lower()
