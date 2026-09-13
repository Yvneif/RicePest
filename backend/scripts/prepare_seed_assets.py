"""Generate small catalog seed images from the training dataset.

Run once from the repo root of the original project:
    python ricepest-app/backend/scripts/prepare_seed_assets.py
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[3]  # .../Thesis Final App
DATASET = ROOT / "Dataset"
OUT = Path(__file__).resolve().parents[1] / "app" / "seed_assets" / "catalog"

MAPPING = {
    "GREEN LEAFHOPPER": "green-leafhopper.jpg",
    "LEAF FOLDERS": "leaf-folders.jpg",
    "RICE BUG": "rice-bug.jpg",
    "STEM BORER": "stem-borer.jpg",
}

SIZE = (900, 900)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for folder, out_name in MAPPING.items():
        src_dir = DATASET / folder
        images = sorted(
            p for p in src_dir.iterdir() if p.suffix.lower() in {".jpg", ".jpeg", ".png"}
        )
        if not images:
            print(f"No images found in {src_dir}")
            continue
        # Pick an image from the middle of the set (less likely to be an outlier).
        src = images[len(images) // 2]
        img = Image.open(src).convert("RGB")
        img.thumbnail(SIZE)
        dst = OUT / out_name
        img.save(dst, "JPEG", quality=82)
        print(f"{folder}: {src.name} -> {dst.name} ({dst.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
