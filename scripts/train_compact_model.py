"""Train a compact, phone-friendly classifier on the rice pest dataset.

Produces:
    models/compact.keras              - the trained Keras 3 model
    models/model_meta_compact.json    - metadata consumed by the backend + TF.js export

Run from ricepest-app/:
    python scripts/train_compact_model.py --data-dir "../Dataset" --epochs 12
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import tensorflow as tf

PRETTY_NAMES = {
    "GREEN LEAFHOPPER": "Green Leafhopper",
    "LEAF FOLDERS": "Leaf Folders",
    "RICE BUG": "Rice Bug",
    "STEM BORER": "Stem Borer",
}

ROOT = Path(__file__).resolve().parents[1]
IMAGE_SIZE = 224
SEED = 42


def build_datasets(data_dir: Path, batch_size: int):
    train = tf.keras.utils.image_dataset_from_directory(
        data_dir,
        validation_split=0.2,
        subset="training",
        seed=SEED,
        image_size=(IMAGE_SIZE, IMAGE_SIZE),
        batch_size=batch_size,
        label_mode="int",
    )
    val = tf.keras.utils.image_dataset_from_directory(
        data_dir,
        validation_split=0.2,
        subset="validation",
        seed=SEED,
        image_size=(IMAGE_SIZE, IMAGE_SIZE),
        batch_size=batch_size,
        label_mode="int",
    )
    class_names = train.class_names  # alphabetical, matches both splits (same seed)
    autotune = tf.data.AUTOTUNE
    return (
        train.cache().shuffle(1000).prefetch(autotune),
        val.cache().prefetch(autotune),
        class_names,
    )


def build_model(num_classes: int) -> tf.keras.Model:
    base = tf.keras.applications.MobileNetV3Small(
        input_shape=(IMAGE_SIZE, IMAGE_SIZE, 3),
        include_top=False,
        include_preprocessing=True,
        weights="imagenet",
    )
    base.trainable = False

    return tf.keras.Sequential(
        [
            tf.keras.Input(shape=(IMAGE_SIZE, IMAGE_SIZE, 3)),
            tf.keras.layers.RandomFlip("horizontal"),
            tf.keras.layers.RandomRotation(0.08),
            tf.keras.layers.RandomZoom(0.12),
            base,
            tf.keras.layers.GlobalAveragePooling2D(),
            tf.keras.layers.Dropout(0.2),
            tf.keras.layers.Dense(num_classes, activation="softmax"),
        ],
        name="ricepest_compact",
    )


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data-dir", default=str(ROOT.parent / "Dataset"))
    parser.add_argument("--epochs", type=int, default=12)
    parser.add_argument("--batch-size", type=int, default=32)
    parser.add_argument("--out-dir", default=str(ROOT / "models"))
    args = parser.parse_args()

    data_dir = Path(args.data_dir)
    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    print(f"Loading dataset from {data_dir} ...")
    train_ds, val_ds, class_names = build_datasets(data_dir, args.batch_size)
    print(f"Classes: {class_names}")

    model = build_model(len(class_names))
    model.compile(
        optimizer=tf.keras.optimizers.Adam(1e-3),
        loss="sparse_categorical_crossentropy",
        metrics=["accuracy"],
    )
    model.summary()

    callbacks = [
        tf.keras.callbacks.EarlyStopping(monitor="val_accuracy", patience=3, restore_best_weights=True),
        tf.keras.callbacks.CSVLogger(out_dir / "compact_training.csv", append=True),
    ]

    print("Training...")
    model.fit(train_ds, validation_data=val_ds, epochs=args.epochs, callbacks=callbacks)

    model_path = out_dir / "compact.keras"
    model.save(model_path)

    val_loss, val_acc = model.evaluate(val_ds, verbose=0)
    labels = [PRETTY_NAMES.get(name, name.title()) for name in class_names]
    meta = {
        "version": "mobilenetv3-small-compact",
        "arch": "mobilenet_v3",
        "input_size": IMAGE_SIZE,
        "labels": labels,
        "threshold": 0.55,
        "description": f"MobileNetV3-Small transfer learning, {len(class_names)} classes, val_acc={val_acc:.3f}",
        "class_names_raw": class_names,
    }
    meta_path = out_dir / "model_meta_compact.json"
    meta_path.write_text(json.dumps(meta, indent=2), encoding="utf-8")

    print(f"\nSaved model to {model_path}")
    print(f"Saved meta to {meta_path}")
    print(f"Final validation accuracy: {val_acc:.4f}")


if __name__ == "__main__":
    main()
