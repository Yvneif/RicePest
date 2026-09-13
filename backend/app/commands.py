"""Flask CLI commands (seed, maintenance)."""

from __future__ import annotations

import os
import secrets
import shutil
from pathlib import Path

import click
from flask import current_app
from sqlalchemy import select

from app.extensions import db
from app.models import CatalogItem, User
from app.seed_data import CATALOG_SEED

SEED_ASSETS_DIR = Path(__file__).resolve().parent / "seed_assets" / "catalog"


def _seed_admin() -> None:
    username = os.environ.get("ADMIN_USERNAME", "admin").strip() or "admin"
    password = os.environ.get("ADMIN_PASSWORD", "")
    generated = not password
    if generated:
        password = secrets.token_urlsafe(12)

    user = db.session.scalar(select(User).where(User.username == username))
    if user is None:
        user = User(username=username)
        user.set_password(password)
        db.session.add(user)
        click.echo(f"Created admin user '{username}'.")
        if generated:
            click.echo(f"Generated admin password (shown once): {password}")
    else:
        click.echo(f"Admin user '{username}' already exists - leaving password untouched.")


def _seed_catalog() -> None:
    target_dir = Path(current_app.config["CATALOG_DIR"])
    added = 0
    for entry in CATALOG_SEED:
        exists = db.session.scalar(select(CatalogItem).where(CatalogItem.slug == entry["slug"]))
        if exists is not None:
            continue
        db.session.add(CatalogItem(**entry))
        added += 1
        src = SEED_ASSETS_DIR / entry["image"]
        if src.exists():
            target_dir.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(src, target_dir / entry["image"])
        else:
            click.echo(f"Warning: seed image missing for {entry['slug']} ({src})", err=True)
    click.echo(
        f"Catalog seed complete ({added} added, {len(CATALOG_SEED) - added} already present)."
    )


def register_commands(app) -> None:  # noqa: ANN001 - Flask app
    @app.cli.command("seed")
    def seed_command():  # noqa: ANN202
        """Create tables (dev convenience) and seed admin + catalog data."""
        db.create_all()
        _seed_admin()
        _seed_catalog()
        db.session.commit()
