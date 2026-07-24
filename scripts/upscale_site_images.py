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
    quality: int = WEBP_QUALITY


ASSETS = (
    # Large hero masters: retain real source detail and prepare for HiDPI.
    # Small hero sources п1/п4/п6 are intentionally handled by
    # upscale_realesrgan.py so this Lanczos job cannot overwrite them.
    Asset("\u043f2.png", ("\u043f2.webp",), 3840, 0, quality=92),
    Asset("\u043f5_upscaled.png", ("\u043f5.webp",), 3840, 0, quality=92),
    # Large sources were previously exported too small for their CSS slots.
    # Full 6480px master replaces the background-removed export: the latter
    # exposed a large transparent region and looked black in some renderers.
    Asset("\u04401.png", ("ready-home.webp",), 6480, 0, quality=90),
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
        has_alpha = "A" in source.getbands()
        rgba = source.convert("RGBA") if has_alpha else None
        image = rgba.convert("RGB") if rgba else source.convert("RGB")
        alpha = rgba.getchannel("A") if rgba else None
        icc_profile = source.info.get("icc_profile")
        exif = source.info.get("exif", b"")

    # Assets without a separate master are upgraded in place once. Avoid
    # repeatedly sharpening and recompressing them on subsequent script runs.
    if asset.source_from_assets and image.width >= asset.target_width:
        print(f"{source_path.name}: already {image.width}px wide, skipped")
        return

    target_height = round(image.height * asset.target_width / image.width)
    resized = (
        image.resize(
            (asset.target_width, target_height),
            resample=Image.Resampling.LANCZOS,
        )
        if image.width != asset.target_width
        else image.copy()
    )
    resized_alpha = (
        (
            alpha.resize(
                (asset.target_width, target_height),
                resample=Image.Resampling.LANCZOS,
            )
            if alpha.width != asset.target_width
            else alpha.copy()
        )
        if alpha
        else None
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
    if resized_alpha:
        resized.putalpha(resized_alpha)

    for output_name in asset.outputs:
        output_path = OUTPUT_ROOT / output_name
        resized.save(
            output_path,
            format="WEBP",
            quality=asset.quality,
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
