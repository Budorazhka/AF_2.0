"""Rebuild low-resolution site renders for large desktop placements.

The source renders in ``../media`` are smaller than their full-viewport CSS
placements.  Resize them once during asset preparation instead of relying on
the browser to upscale and recompress them at render time.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from PIL import Image, ImageFilter


PROJECT_ROOT = Path(__file__).resolve().parents[1]
SOURCE_ROOT = PROJECT_ROOT.parent / "media"
OUTPUT_ROOT = PROJECT_ROOT / "assets" / "img"

WEBP_QUALITY = 86


@dataclass(frozen=True)
class Asset:
    source: str
    outputs: tuple[str, ...]
    target_width: int
    sharpen_percent: int = 15
    source_from_assets: bool = False


ASSETS = (
    # Full-screen hero renders: only small originals are available.
    Asset("\u043f1.png", ("\u043f1.webp",), 2400, 45),
    Asset("\u043f3.jpeg", ("\u043f3.webp",), 2400, 45),
    Asset("\u043f4.png", ("\u043f4.webp", "\u043f6.webp"), 2400, 45),
    Asset("\u043f6.png", ("\u043f6-pool.webp",), 2400, 45),
    # Large sources were previously exported too small for their CSS slots.
    Asset(
        "AURUM FORT Investment Presentation ENG.pptx, \u043a\u043e\u043f\u0438\u044f (2).png",
        ("ready-home.webp",),
        4800,
    ),
    Asset("6_upscaled.PNG", ("6_upscaled.webp",), 3200),
    Asset("18_1_upscaled.PNG", ("18_1_upscaled.webp",), 3200),
    Asset("2.jpg", ("2.webp",), 1200),
    # These two have no separate larger master with the exact crop/treatment.
    Asset("8.png", ("8.webp",), 2880, 45),
    Asset("\u043f12.webp", ("\u043f12.webp",), 2400, 45, True),
)


def rebuild(asset: Asset) -> None:
    source_root = OUTPUT_ROOT if asset.source_from_assets else SOURCE_ROOT
    source_path = source_root / asset.source
    with Image.open(source_path) as source:
        image = source.convert("RGB")
        icc_profile = source.info.get("icc_profile")
        exif = source.info.get("exif", b"")

    # Assets without a separate master are upgraded in place once. Avoid
    # repeatedly sharpening and recompressing them on subsequent script runs.
    if asset.source_from_assets and image.width >= asset.target_width:
        print(f"{source_path.name}: already {image.width}px wide, skipped")
        return

    target_height = round(image.height * asset.target_width / image.width)
    resized = image.resize(
        (asset.target_width, target_height),
        resample=Image.Resampling.LANCZOS,
    )

    # Restore edge contrast softened by interpolation without inventing
    # architectural detail or producing visible halos.
    if asset.sharpen_percent:
        resized = resized.filter(
            ImageFilter.UnsharpMask(
                radius=1.0,
                percent=asset.sharpen_percent,
                threshold=3,
            )
        )

    for output_name in asset.outputs:
        output_path = OUTPUT_ROOT / output_name
        resized.save(
            output_path,
            format="WEBP",
            quality=WEBP_QUALITY,
            method=6,
            icc_profile=icc_profile,
            exif=exif,
        )
        print(
            f"{source_path.name}: {image.width}x{image.height} -> "
            f"{output_path.name}: {resized.width}x{resized.height}"
        )


def main() -> None:
    for asset in ASSETS:
        rebuild(asset)


if __name__ == "__main__":
    main()
