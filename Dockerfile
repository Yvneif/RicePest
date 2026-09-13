# Multi-stage build: build the React PWA, then serve it from Flask.
# Build from the ricepest-app/ root:
#   docker build -t ricepest-app .
#   docker run -p 8000:8000 -e SECRET_KEY=$(python -c "import secrets;print(secrets.token_hex(32))") -e ADMIN_PASSWORD=... ricepest-app

# ---- Stage 1: frontend build ------------------------------------------------
FROM node:22-alpine AS frontend
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ---- Stage 2: backend + static frontend -------------------------------------
FROM python:3.10-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    FLASK_ENV=production

WORKDIR /app

# CPU-only TensorFlow keeps the image far smaller; swap for tensorflow if you
# need GPU inference on the server.
COPY backend/requirements.txt /tmp/
RUN sed 's/^tensorflow==/tensorflow-cpu==/' /tmp/requirements.txt > /tmp/req-cpu.txt \
    && pip install --no-cache-dir -r /tmp/req-cpu.txt

COPY backend/ /app/backend/
COPY models/ /app/models/
COPY --from=frontend /app/frontend/dist /app/frontend/dist

RUN mkdir -p /app/data

EXPOSE 8000
WORKDIR /app/backend

CMD ["sh", "-c", "python -m flask --app wsgi db upgrade && python -m flask --app wsgi seed && python -m gunicorn -c /app/deploy/gunicorn.conf.py wsgi:app"]
