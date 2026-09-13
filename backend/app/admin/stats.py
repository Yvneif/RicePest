"""Admin dashboard statistics."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from flask import jsonify
from sqlalchemy import func, select

from app.admin import admin_bp
from app.admin.guards import admin_required
from app.extensions import db
from app.models import CatalogItem, Scan, User


@admin_bp.get("/stats")
@admin_required
def stats():  # noqa: ANN202
    totals = {
        "scans": db.session.scalar(select(func.count(Scan.id))) or 0,
        "catalogItems": db.session.scalar(select(func.count(CatalogItem.id))) or 0,
        "users": db.session.scalar(select(func.count(User.id))) or 0,
    }

    avg_confidence = db.session.scalar(select(func.avg(Scan.confidence)))

    today = datetime.now(timezone.utc).date()
    day_counts = dict(
        db.session.execute(
            select(func.date(Scan.created_at), func.count(Scan.id))
            .where(Scan.created_at >= today - timedelta(days=13))
            .group_by(func.date(Scan.created_at))
        ).all()
    )
    per_day = []
    for offset in range(13, -1, -1):
        day = today - timedelta(days=offset)
        per_day.append({"date": day.isoformat(), "count": int(day_counts.get(day.isoformat(), 0))})

    pest_rows = db.session.execute(
        select(Scan.label, func.count(Scan.id))
        .group_by(Scan.label)
        .order_by(func.count(Scan.id).desc())
    ).all()
    pest_mix = [{"label": label, "count": int(count)} for label, count in pest_rows]

    recent = db.session.scalars(
        select(Scan).order_by(Scan.created_at.desc(), Scan.id.desc()).limit(10)
    ).all()

    return jsonify(
        {
            "totals": totals,
            "avgConfidence": round(float(avg_confidence), 4)
            if avg_confidence is not None
            else None,
            "perDay": per_day,
            "pestMix": pest_mix,
            "recentScans": [scan.to_dict() for scan in recent],
        }
    )
