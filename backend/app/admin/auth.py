"""Session-based authentication for admins."""

from __future__ import annotations

from flask import current_app, request, session
from sqlalchemy import select

from app.admin.guards import get_current_user
from app.extensions import db, limiter
from app.models import User


def register_auth_routes(auth_bp) -> None:  # noqa: ANN001
    @auth_bp.post("/login")
    @limiter.limit(lambda: current_app.config["RATE_LIMIT_LOGIN"])
    def login():  # noqa: ANN202
        data = request.get_json(silent=True) or {}
        username = (data.get("username") or "").strip()
        password = data.get("password") or ""
        if not username or not password:
            return {
                "error": {
                    "code": "validation_error",
                    "message": "Username and password are required.",
                }
            }, 400

        user = db.session.scalar(select(User).where(User.username == username))
        if user is None or not user.check_password(password):
            return {
                "error": {"code": "invalid_credentials", "message": "Invalid username or password."}
            }, 401

        session["user_id"] = user.id
        session.permanent = True
        return {"user": user.to_dict()}

    @auth_bp.get("/me")
    def me():  # noqa: ANN202
        user = get_current_user()
        if user is None:
            return {"error": {"code": "unauthenticated", "message": "Login required."}}, 401
        return {"user": user.to_dict()}

    @auth_bp.post("/logout")
    def logout():  # noqa: ANN202
        session.clear()
        return {"ok": True}
