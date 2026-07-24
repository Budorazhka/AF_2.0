"""Upscale a raster asset with the portable Real-ESRGAN executable.

Example:
    python scripts/upscale_realesrgan.py ^
        ../media/from-drive/п3-original-drive.jpg assets/img/п3.webp ^
        --width 3840 --quality 96

Set ``REALESRGAN_DIR`` when the portable application is installed somewhere
other than the default ``~/Desktop/IT/ai-tools`` location.
"""

from __future__ import annotations

import argparse
import os
import shutil
import subprocess
import tempfile
from pathlib import Path

from PIL import Image


DEFAULT_TOOL_DIR = (
    Path.home()
    / "Desktop"
    / "IT"
    / "ai-tools"
    / "realesrgan"
    / "realesrgan-ncnn-vulkan-20220424-windows"
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Geometry-preserving 4x upscale with Real-ESRGAN."
    )
    parser.add_argument("input", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--width", type=int, default=3840)
    parser.add_argument("--quality", type=int, default=90)
    parser.add_argument("--model", default="realesrgan-x4plus")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    tool_dir = Path(os.environ.get("REALESRGAN_DIR", DEFAULT_TOOL_DIR))
    executable = tool_dir / "realesrgan-ncnn-vulkan.exe"

    if not executable.is_file():
        raise FileNotFoundError(
            f"Real-ESRGAN executable not found: {executable}. "
            "Install the official portable release or set REALESRGAN_DIR."
        )
    if not args.input.is_file():
        raise FileNotFoundError(f"Input image not found: {args.input}")
    if args.width <= 0:
        raise ValueError("--width must be positive")
    if not 1 <= args.quality <= 100:
        raise ValueError("--quality must be between 1 and 100")

    args.output.parent.mkdir(parents=True, exist_ok=True)

    # The NCNN executable is more reliable with ASCII-only temporary names.
    with tempfile.TemporaryDirectory(prefix="aurum-realesrgan-") as temp_name:
        temp_dir = Path(temp_name)
        source = temp_dir / f"source{args.input.suffix.lower()}"
        restored = temp_dir / "restored.png"
        shutil.copy2(args.input, source)

        subprocess.run(
            [
                str(executable),
                "-i",
                str(source),
                "-o",
                str(restored),
                "-n",
                args.model,
                "-s",
                "4",
                "-f",
                "png",
            ],
            cwd=tool_dir,
            check=True,
        )

        with Image.open(restored) as image:
            image = image.convert("RGB")
            target_height = round(image.height * args.width / image.width)
            if image.width != args.width:
                image = image.resize(
                    (args.width, target_height),
                    Image.Resampling.LANCZOS,
                )
            image.save(
                args.output,
                format="WEBP",
                quality=args.quality,
                method=6,
            )

    with Image.open(args.output) as result:
        print(
            f"{args.input.name} -> {args.output.name}: "
            f"{result.width}x{result.height}, "
            f"{args.output.stat().st_size / 1024:.0f} KiB"
        )


if __name__ == "__main__":
    main()
