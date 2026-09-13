"""Database models."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import JSON, DateTime, Float, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column
from werkzeug.security import check_password_hash, generate_password_hash

from app.extensions import db


def _uuid() -> str:
    return str(uuid.uuid4())


def _now() -> datetime:
    return datetime.now(timezone.utc)


class User(db.Model):
    """Administrator or staff account."""

    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    username: Mapped[str] = mapped_column(String(80), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(256), nullable=False)
    date_created: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    def set_password(self, raw: str) -> None:
        self.password_hash = generate_password_hash(raw)

    def check_password(self, raw: str) -> bool:
        return check_password_hash(self.password_hash, raw)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "username": self.username,
            "date_created": self.date_created.isoformat() if self.date_created else None,
        }


class CatalogItem(db.Model):
    """A pest in the public catalog / pest library."""

    __tablename__ = "catalog_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    uid: Mapped[str] = mapped_column(String(36), unique=True, default=_uuid)
    slug: Mapped[str] = mapped_column(String(80), unique=True, nullable=False)
    title: Mapped[str] = mapped_column(String(120), nullable=False)
    scientific_name: Mapped[str | None] = mapped_column(String(160))
    description: Mapped[str] = mapped_column(Text, default="")
    damage_signs: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(20), default="available")
    image: Mapped[str | None] = mapped_column(String(160))
    date_created: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    def to_dict(self) -> dict:
        return {
            "uid": self.uid,
            "slug": self.slug,
            "title": self.title,
            "scientificName": self.scientific_name,
            "description": self.description,
            "damageSigns": self.damage_signs,
            "status": self.status,
            "imageUrl": f"/media/catalog/{self.image}" if self.image else None,
            "dateCreated": self.date_created.isoformat() if self.date_created else None,
        }


class Scan(db.Model):
    """One identification request, device-scoped for the history timeline."""

    __tablename__ = "scans"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    image: Mapped[str] = mapped_column(String(160), nullable=False)
    label: Mapped[str] = mapped_column(String(80), nullable=False)
    confidence: Mapped[float] = mapped_column(Float, nullable=False)
    top3: Mapped[list] = mapped_column(JSON, default=list)
    device_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    model_version: Mapped[str] = mapped_column(String(80), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, index=True)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "label": self.label,
            "confidence": self.confidence,
            "top3": self.top3 or [],
            "imageUrl": f"/media/uploads/{self.image}",
            "modelVersion": self.model_version,
            "createdAt": self.created_at.isoformat() if self.created_at else None,
        }
