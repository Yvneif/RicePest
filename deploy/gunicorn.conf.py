"""Gunicorn configuration for Linux/production deployments.

Run from backend/:  gunicorn -c ../deploy/gunicorn.conf.py wsgi:app
"""

bind = "0.0.0.0:8000"
workers = 2  # each worker loads its own copy of the model - keep this small
threads = 4
timeout = 120  # first request can trigger model warm-up
accesslog = "-"
errorlog = "-"
loglevel = "info"
forwarded_allow_ips = "*"  # trust the reverse proxy's X-Forwarded-Proto
