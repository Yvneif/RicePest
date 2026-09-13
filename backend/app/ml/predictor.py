"""Lazy, failure-tolerant Keras model loading and inference.

The legacy app loaded the 91 MB model at import time, crashing the whole
process when the file was missing. Here a missing or broken model yields an
``UnavailablePredictor`` so the app still boots and serves a clear 503 from
the predict endpoint.
"""

from __future__ import annotations

import json
import logging
import threading
from pathlib import Path

import numpy as np
from PIL import Image

log = logging.getLogger(__name__)

# Matches the original ResNet50 model trained in RICEPESTseq.ipynb.
DEFAULT_META = {
    "version": "legacy-resnet50-model6",
    "arch": "resnet50",
    "input_size": 180,
    "labels": ["Green Leafhopper", "Leaf Folders", "Unrecognized", "Rice Bug", "Stem Borer"],
    "threshold": None,
}


class PredictorUnavailableError(RuntimeError):
    """Raised when inference is requested but no model could be loaded."""


def _resnet50_preprocess(batch: np.ndarray) -> np.ndarray:
    from keras.applications.resnet50 import preprocess_input

    return preprocess_input(batch.copy())


_PREPROCESSORS = {
    "resnet50": _resnet50_preprocess,
    # MobileNetV3 models are saved with include_preprocessing=True, so the
    # raw 0-255 tensor is fed straight in.
    "mobilenet_v3": lambda batch: batch,
}


class Predictor:
    """Wraps a Keras image classifier with metadata-driven preprocessing."""

    available = True

    def __init__(self, model, meta: dict):
        self.model = model
        self.meta = meta
        self._infer_lock = threading.Lock()

    def predict(self, image: Image.Image) -> dict:
        """Return ``{"labels": [...], "probs": [...]}`` for a PIL image."""
        size = (int(self.meta["input_size"]),) * 2
        img = image.convert("RGB").resize(size)
        batch = np.asarray(img, dtype=np.float32)[None, ...]
        preprocess = _PREPROCESSORS.get(self.meta.get("arch", "resnet50"))
        if preprocess is None:
            raise PredictorUnavailableError(f"Unknown model arch: {self.meta.get('arch')!r}")
        batch = preprocess(batch)
        with self._infer_lock:
            probs = self.model.predict(batch, verbose=0)[0]
        return {"labels": list(self.meta["labels"]), "probs": [float(p) for p in probs]}


class UnavailablePredictor:
    """Placeholder used when the model file cannot be loaded."""

    available = False

    def __init__(self, reason: str):
        self.meta = {**DEFAULT_META, "version": "unavailable"}
        self.reason = reason

    def predict(self, image: Image.Image) -> dict:
        raise PredictorUnavailableError(self.reason)


def load_predictor(model_path: Path, meta_path: Path) -> Predictor | UnavailablePredictor:
    """Load the Keras model described by *meta_path*; never raises."""
    try:
        meta = DEFAULT_META
        if meta_path.exists():
            meta = {**DEFAULT_META, **json.loads(meta_path.read_text(encoding="utf-8"))}
        if not Path(model_path).exists():
            return UnavailablePredictor(f"Model file not found: {model_path}")
        import tensorflow as tf

        model = tf.keras.models.load_model(model_path)
        log.info(
            "Loaded model %s (%s, input %sx%s)",
            model_path.name,
            meta["arch"],
            meta["input_size"],
            meta["input_size"],
        )
        return Predictor(model, meta)
    except Exception as exc:  # noqa: BLE001 - any load failure must not crash the app
        log.exception("Model load failed")
        return UnavailablePredictor(str(exc))
