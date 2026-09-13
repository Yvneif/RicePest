"""Development server entry point.

Usage (from backend/):  python run.py
"""

from __future__ import annotations

from app import create_app

if __name__ == "__main__":
    application = create_app()
    application.run(host="127.0.0.1", port=5000, debug=False)
