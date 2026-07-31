#!/usr/bin/env python3
"""Mejora el bucle original del menú a 4K sin recomponer su contenido.

Cada uno de los 240 fotogramas originales se procesa completo con el modelo
oficial ``realesr-animevideov3`` de Real-ESRGAN NCNN Vulkan. De este modo se
conservan exactamente la composición, las siluetas, el oleaje, los neones, la
brisa luminosa y todas las notas del vídeo fuente.
"""

from __future__ import annotations

import argparse
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

from PIL import Image


WIDTH = 3840
HEIGHT = 2160
FPS = 24
TOTAL_FRAMES = 240
MODEL = "realesr-animevideov3"
UPSCALER_RELEASE = (
    "https://github.com/xinntao/Real-ESRGAN/releases/tag/v0.2.5.0"
)


def run(command: list[str]) -> None:
    print(" ".join(command), flush=True)
    subprocess.run(command, check=True)


def find_upscaler(explicit: Path | None) -> Path:
    if explicit is not None:
        candidate = explicit.expanduser().resolve()
        if candidate.is_file():
            return candidate
        raise FileNotFoundError(candidate)

    configured = os.environ.get("ILLO_REALESRGAN_NCNN")
    if configured:
        candidate = Path(configured).expanduser().resolve()
        if candidate.is_file():
            return candidate

    executable = shutil.which("realesrgan-ncnn-vulkan")
    if executable:
        return Path(executable).resolve()

    raise FileNotFoundError(
        "No se encontró realesrgan-ncnn-vulkan. Instala la versión oficial "
        f"desde {UPSCALER_RELEASE} y usa --upscaler RUTA, o define la variable "
        "ILLO_REALESRGAN_NCNN."
    )


def extract_frames(reference: Path, destination: Path) -> None:
    run(
        [
            "ffmpeg",
            "-y",
            "-hide_banner",
            "-loglevel",
            "warning",
            "-i",
            str(reference),
            "-vsync",
            "0",
            str(destination / "frame_%04d.png"),
        ]
    )
    frames = sorted(destination.glob("frame_*.png"))
    if len(frames) != TOTAL_FRAMES:
        raise RuntimeError(
            f"Se esperaban {TOTAL_FRAMES} frames y se extrajeron {len(frames)}."
        )


def upscale_frames(upscaler: Path, source: Path, destination: Path) -> None:
    run(
        [
            str(upscaler),
            "-i",
            str(source),
            "-o",
            str(destination),
            "-n",
            MODEL,
            "-s",
            "2",
            "-f",
            "png",
            "-g",
            "0",
        ]
    )
    frames = sorted(destination.glob("frame_*.png"))
    if len(frames) != TOTAL_FRAMES:
        raise RuntimeError(
            f"Se esperaban {TOTAL_FRAMES} frames 4K y se generaron {len(frames)}."
        )
    with Image.open(frames[0]) as first:
        if first.size != (WIDTH, HEIGHT):
            raise RuntimeError(
                f"Los frames deben medir {WIDTH}x{HEIGHT}; miden {first.size}."
            )


def encode_frames(source: Path, output: Path, encoder: str) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    temporary_output = output.with_name(f"{output.stem}.rendering{output.suffix}")
    command = [
        "ffmpeg",
        "-y",
        "-hide_banner",
        "-loglevel",
        "warning",
        "-framerate",
        str(FPS),
        "-start_number",
        "1",
        "-i",
        str(source / "frame_%04d.png"),
    ]
    if encoder == "nvenc":
        command.extend(
            [
                "-c:v",
                "h264_nvenc",
                "-preset",
                "p7",
                "-tune",
                "hq",
                "-rc",
                "vbr",
                "-cq",
                "16",
                "-b:v",
                "0",
            ]
        )
    else:
        command.extend(["-c:v", "libx264", "-preset", "slow", "-crf", "16"])
    command.extend(
        [
            "-profile:v",
            "high",
            "-level",
            "5.1",
            "-pix_fmt",
            "yuv420p",
            "-movflags",
            "+faststart",
            str(temporary_output),
        ]
    )
    run(command)
    os.replace(temporary_output, output)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--reference",
        type=Path,
        default=Path("assets/videos/menu_loop.mp4"),
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("assets/videos/menu_loop_4k.mp4"),
    )
    parser.add_argument("--upscaler", type=Path)
    parser.add_argument("--encoder", choices=("nvenc", "x264"), default="nvenc")
    args = parser.parse_args()

    reference = args.reference.expanduser().resolve()
    if not reference.is_file():
        raise FileNotFoundError(reference)
    upscaler = find_upscaler(args.upscaler)

    with tempfile.TemporaryDirectory(prefix="illo-menu-loop-4k-") as temporary:
        root = Path(temporary)
        original_frames = root / "original"
        enhanced_frames = root / "enhanced"
        original_frames.mkdir()
        enhanced_frames.mkdir()
        extract_frames(reference, original_frames)
        upscale_frames(upscaler, original_frames, enhanced_frames)
        encode_frames(enhanced_frames, args.output.resolve(), args.encoder)

    print(args.output.resolve())
    return 0


if __name__ == "__main__":
    sys.exit(main())
