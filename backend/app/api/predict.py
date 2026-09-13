"""POST /api/predict - identify a pest from an uploaded photo."""

from __future__ import annotations

from pathlib import Path

from flask import current_app, request
from PIL import Image

from app.api import api_bp
from app.extensions import db, limiter
from app.models import Scan
from app.utils import UploadError, clean_device_id, save_image


def _apply_threshold(result: dict, meta: dict) -> dict:
    """Map low-confidence predictions to 'Unrecognized' when the model defines one."""
    threshold = meta.get("threshold")
    if not threshold or "Unrecognized" not in result["labels"]:
        return result
    best = max(result["probs"])
    if best < float(threshold):
        result["probs"] = [0.0] * len(result["probs"])
        result["probs"][result["labels"].index("Unrecognized")] = best
    return result


def _top(result: dict, k: int = 3) -> list[dict]:
    pairs = sorted(
        zip(result["labels"], result["probs"], strict=False), key=lambda p: p[1], reverse=True
    )
    return [{"label": label, "prob": round(float(prob), 4)} for label, prob in pairs[:k]]


@api_bp.post("/predict")
@limiter.limit(lambda: current_app.config["RATE_LIMIT_PREDICT"])
def predict():  # noqa: ANN202
    file = request.files.get("image")
    if file is None or not file.filename:
        raise UploadError("validation_error", "Attach an image to identify.")

    upload_dir = Path(current_app.config["UPLOAD_DIR"])
    filename = save_image(file, upload_dir)

    predictor = current_app.extensions["predictor"]
    with Image.open(upload_dir / filename) as img:
        result = predictor.predict(img)
    result = _apply_threshold(result, predictor.meta)

    best = max(range(len(result["probs"])), key=lambda i: result["probs"][i])
    label = result["labels"][best]
    confidence = round(float(result["probs"][best]), 4)
    top3 = _top(result)

    scan = Scan(
        image=filename,
        label=label,
        confidence=confidence,
        top3=top3,
        device_id=clean_device_id(request.headers.get("X-Device-Id")),
        model_version=str(predictor.meta.get("version", "")),
    )
    db.session.add(scan)
    db.session.commit()

    return {
        "scanId": scan.id,
        "label": label,
        "confidence": confidence,
        "top3": top3,
        "imageUrl": f"/media/uploads/{filename}",
        "model": {
            "version": predictor.meta.get("version"),
            "inputSize": predictor.meta.get("input_size"),
        },
    }
