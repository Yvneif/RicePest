"""Export the compact Keras model to TensorFlow.js for on-device inference.

The pip tfjs converter cannot read Keras 3 ``.keras`` (zip) files and chokes
on Keras-3-exported SavedModels, so this script rebuilds the model as an
inference-only twin (augmentation layers dropped - they are no-ops at
inference) and saves it to legacy H5, which the converter fully supports.

Produces frontend/public/models/compact/ (model.json + weight shard) and
frontend/public/models/manifest.json.

Run from ricepest-app/:  python scripts/export_tfjs.py
"""

from __future__ import annotations

import json
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

import tensorflow as tf

ROOT = Path(__file__).resolve().parents[1]
MODELS = ROOT / "models"
OUT = ROOT / "frontend" / "public" / "models"

# The converter imports these at startup but only uses them for tree / hub /
# JAX models - stubbed so they are never needed on the host machine.
STUBS = {
    "tensorflow_decision_forests.py": "pass\n",
    "tensorflow_hub.py": "pass\n",
    "jax/__init__.py": "pass\n",
    "jax/experimental/__init__.py": "pass\n",
    "jax/experimental/jax2tf.py": "def convert(): pass\n",
}


def build_inference_twin(model: tf.keras.Model) -> tf.keras.Model:
    """Sequential twin without augmentation layers (identity at inference)."""
    base_idx = next(
        i for i, layer in enumerate(model.layers) if "mobilenet" in layer.name.lower()
    )
    tail = model.layers[base_idx + 1 :]
    infer = tf.keras.Sequential(
        [tf.keras.Input((model.input_shape[1], model.input_shape[2], 3)), model.layers[base_idx], *tail],
        name="ricepest_compact_infer",
    )
    infer.set_weights(model.get_weights())
    return infer


def main() -> None:
    model_path = MODELS / "compact.keras"
    meta_path = MODELS / "model_meta_compact.json"
    if not model_path.exists() or not meta_path.exists():
        sys.exit("Run scripts/train_compact_model.py first.")
    meta = json.loads(meta_path.read_text(encoding="utf-8"))

    target = OUT / "compact"
    print("Building inference twin and saving legacy H5 ...")
    model = tf.keras.models.load_model(model_path)
    infer = build_inference_twin(model)
    h5_path = MODELS / "compact_infer.h5"
    infer.save(h5_path)

    with tempfile.TemporaryDirectory() as tmp:
        stub_dir = Path(tmp) / "stubs"
        stub_dir.mkdir()
        for rel, content in STUBS.items():
            path = stub_dir / rel
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(content, encoding="utf-8")
        env = {**os.environ, "PYTHONPATH": f"{stub_dir}{os.pathsep}{os.environ.get('PYTHONPATH', '')}"}

        # The converter fails if the output dir exists but is empty, and its
        # CLI splits paths containing spaces - so convert inside a space-free
        # temp dir and move the result into place.
        if target.exists():
            shutil.rmtree(target)

        work = Path(tempfile.mkdtemp(prefix="ricepest-tfjs-"))
        try:
            safe_h5 = work / "model.h5"
            safe_out = work / "out"
            shutil.copyfile(h5_path, safe_h5)

            print("Converting to TensorFlow.js layers model ...")
            proc = subprocess.run(
                [
                    sys.executable,
                    "-m",
                    "tensorflowjs.converters.converter",
                    "--input_format=keras",
                    "--weight_shard_size_bytes=4194304",
                    str(safe_h5),
                    str(safe_out),
                ],
                env=env,
                capture_output=True,
                text=True,
            )
            if proc.returncode != 0 or not (safe_out / "model.json").exists():
                print(proc.stdout, proc.stderr, sep="\n", file=sys.stderr)
                sys.exit(f"tfjs conversion failed with exit code {proc.returncode}")

            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.move(str(safe_out), str(target))
        finally:
            shutil.rmtree(work, ignore_errors=True)
    h5_path.unlink(missing_ok=True)

    manifest = {
        "version": meta["version"],
        "arch": meta["arch"],
        "inputSize": meta["input_size"],
        "labels": meta["labels"],
        "threshold": meta.get("threshold"),
        "format": "layers",
        "url": "/models/compact/model.json",
    }
    (OUT / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")

    total_kb = sum(f.stat().st_size for f in target.rglob("*") if f.is_file()) // 1024
    print(f"Exported {target} ({total_kb} KB total)")
    print(f"Wrote {OUT / 'manifest.json'}")


if __name__ == "__main__":
    main()
