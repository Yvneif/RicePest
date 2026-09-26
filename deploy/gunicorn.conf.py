"""Gunicorn configuration for Linux/production deployments.

Run from backend/:  gunicorn -c ../deploy/gunicorn.conf.py wsgi:app
"""

import os

bind = "0.0.0.0:8000"
workers = 2  # each worker loads its own copy of the model - keep this small
threads = 4
timeout = 120  # first request can trigger model warm-up
accesslog = "-"
errorlog = "-"
loglevel = "info"

_raw_forwarded_ips = os.environ.get("FORWARDED_ALLOW_IPS", "127.0.0.1")
if _raw_forwarded_ips.strip() == "*":
    # Explicit opt-in only: trusting every hop lets any client spoof
    # X-Forwarded-For/Proto and therefore the limiter's remote-address key.
    forwarded_allow_ips = "*"
else:
    forwarded_allow_ips = ",".join(
        part.strip() for part in _raw_forwarded_ips.split(",") if part.strip()
    ) or "127.0.0.1"
