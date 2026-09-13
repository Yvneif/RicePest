"""Tests for the public catalog endpoint."""

from __future__ import annotations

from app.extensions import db
from app.models import CatalogItem


def add_item(slug="rice-bug", title="Rice Bug", status="available"):
    item = CatalogItem(
        slug=slug,
        title=title,
        scientific_name="Leptocorisa oratorius",
        description="Test description",
        status=status,
    )
    db.session.add(item)
    db.session.commit()
    return item


def test_catalog_lists_items_with_image_urls(client, app):
    with app.app_context():
        add_item()
    res = client.get("/api/catalog")
    assert res.status_code == 200
    items = res.get_json()["items"]
    assert len(items) == 1
    item = items[0]
    assert item["title"] == "Rice Bug"
    assert item["slug"] == "rice-bug"
    assert item["imageUrl"] is None
    assert "damageSigns" in item


def test_catalog_includes_seeded_content(client, app):
    """The seed command populates reference content that must be exposed."""
    runner = app.test_cli_runner()
    result = runner.invoke(args=["seed"])
    assert result.exit_code == 0
    res = client.get("/api/catalog")
    titles = {i["title"] for i in res.get_json()["items"]}
    assert {"Green Leafhopper", "Leaf Folders", "Rice Bug", "Stem Borer"} <= titles


def test_model_info_endpoint(client):
    res = client.get("/api/model/info")
    assert res.status_code == 200
    body = res.get_json()
    assert body["available"] is True
    assert body["version"] == "stub-1"
    assert "Green Leafhopper" in body["labels"]
    assert body["inputSize"] == 180
