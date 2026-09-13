"""Generate PWA icons from the legacy RPLogo.png.

Run from the ricepest-app root:  python scripts/generate_icons.py
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
FRONTEND_PUBLIC = ROOT / "frontend" / "public"
ICONS = FRONTEND_PUBLIC / "icons"

SOURCES = [
    ROOT.parent / "STATIC" / "RPLogo.png",  # legacy app logo
]
FALLBACK_COLOR = (22, 101, 52)  # brand-700 green


def load_logo() -> Image.Image | None:
    for src in SOURCES:
        if src.exists():
            logo = Image.open(src).convert("RGBA")
            return logo
    return None


def make_icon(logo: Image.Image | None, size: int, out: Path, maskable: bool = False) -> None:
    canvas = Image.new("RGBA", (size, size), (*FALLBACK_COLOR, 255))
    if logo is not None:
        if maskable:
            inner = int(size * 0.72)
        else:
            inner = int(size * 0.86)
        resized = logo.copy()
        resized.thumbnail((inner, inner), Image.LANCZOS)
        pos = ((size - resized.width) // 2, (size - resized.height) // 2)
        canvas.paste(resized, pos, resized)
    canvas.convert("RGB").save(out, "PNG")
    print(f"wrote {out.name} ({out.stat().st_size // 1024} KB)")


def main() -> None:
    ICONS.mkdir(parents=True, exist_ok=True)
    logo = load_logo()
    if logo is None:
        print("RPLogo.png not found - generating plain brand-color icons.")

    make_icon(logo, 192, ICONS / "icon-192.png")
    make_icon(logo, 512, ICONS / "icon-512.png")
    make_icon(logo, 512, ICONS / "maskable-512.png", maskable=True)
    make_icon(logo, 180, FRONTEND_PUBLIC / "apple-touch-icon.png")
    make_icon(logo, 64, FRONTEND_PUBLIC / "favicon.png")


if __name__ == "__main__":
    main()
