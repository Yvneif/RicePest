"""Tests for POST /api/recommend (eradication technique engine)."""

from __future__ import annotations

import pytest


def recommend(client, pest="Rice Bug", season="sunny", count=10):
    return client.post(
        "/api/recommend",
        json={"pestType": pest, "season": season, "pestCount": count},
    )


CASES = [
    ("Rice Bug", "sunny", 3, "Physical + Mechanical 1"),
    ("Rice Bug", "rainy", 30, "Cultural 1"),
    ("Rice Bug", "sunny", 100, "Chemical 1"),
    ("Rice Bug", "rainy", 200, "None"),
    ("Stem Borer", "sunny", 3, "Physical + Mechanical 2"),
    ("Stem Borer", "rainy", 30, "Cultural 2"),
    ("Green Leafhopper", "sunny", 30, "Physical + Mechanical 3"),
    ("Green Leafhopper", "rainy", 3, "Cultural 3"),
    ("Leaf Folder", "sunny", 3, "Cultural 4"),
    ("Leaf Folder", "rainy", 30, "Physical + Mechanical 4"),
    ("Leaf Folder", "rainy", 100, "Chemical 4"),
]


@pytest.mark.parametrize(("pest", "season", "count", "technique"), CASES)
def test_recommendation_table(client, pest, season, count, technique):
    res = recommend(client, pest, season, count)
    assert res.status_code == 200
    body = res.get_json()
    assert body["technique"]["name"] == technique
    assert isinstance(body["technique"]["steps"], list)


def test_plural_pest_label_normalized(client):
    res = recommend(client, "Leaf Folders", "rainy", 30)
    assert res.status_code == 200
    assert res.get_json()["technique"]["name"] == "Physical + Mechanical 4"


def test_density_buckets_reported(client):
    res = recommend(client, "Rice Bug", "sunny", 3)
    assert res.get_json()["density"] == "Maritak"
    res = recommend(client, "Rice Bug", "sunny", 30)
    assert res.get_json()["density"] == "Marakal"
    res = recommend(client, "Rice Bug", "sunny", 100)
    assert res.get_json()["density"] == "Sobra Karakal"
    res = recommend(client, "Rice Bug", "sunny", 200)
    assert res.get_json()["density"] == "Ali na Abilang"


def test_invalid_pest_rejected(client):
    res = recommend(client, "Armyworm", "sunny", 10)
    assert res.status_code == 400


def test_invalid_season_rejected(client):
    res = recommend(client, "Rice Bug", "winter", 10)
    assert res.status_code == 400


def test_non_numeric_count_rejected(client):
    res = recommend(client, "Rice Bug", "sunny", "many")
    assert res.status_code == 400


def test_negative_count_rejected(client):
    res = recommend(client, "Rice Bug", "sunny", -5)
    assert res.status_code == 400
