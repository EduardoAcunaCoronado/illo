#!/usr/bin/env python3
"""Interpola el bucle 4K del menú de 24 a 48 FPS con RIFE NCNN Vulkan.

Se añade temporalmente una copia del primer fotograma después del último para
que RIFE genere también la transición de cierre. Las dos salidas redundantes
posteriores al frame 480 se omiten al codificar, de modo que el resultado
conserva exactamente 10 segundos.
"""

from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path


WIDTH = 3840
HEIGHT = 2160
SOURCE_FPS = 24
OUTPUT_FPS = 48
SOURCE_FRAMES = 240
OUTPUT_FRAMES = 480
MODEL = "rife-v4.6"
RIFE_RELEASE = "https://github.com/nihui/rife-ncnn-vulkan/releases"


def run(command: list[str]) -> None:
    print(" ".join(command), flush=True)
    subprocess.run(command, check=True)


def find_rife(explicit: Path | None) -> Path:
    if explicit is not None:
        candidate = explicit.expanduser().resolve()
        if candidate.is_file():
            return candidate
        raise FileNotFoundError(candidate)

    configured = os.environ.get("ILLO_RIFE_NCNN")
    if configured:
        candidate = Path(configured).expanduser().resolve()
        if candidate.is_file():
            return candidate

    executable = shutil.which("rife-ncnn-vulkan")
    if executable:
        return Path(executable).resolve()

    raise FileNotFoundError(
        "No se encontró rife-ncnn-vulkan. Instala la versión oficial desde "
        f"{RIFE_RELEASE} y usa --rife RUTA, o define ILLO_RIFE_NCNN."
    )


def probe_video(video: Path) -> dict[str, object]:
    result = subprocess.run(
        [
            "ffprobe",
            "-v",
            "error",
            "-select_streams",
            "v:0",
            "-count_frames",
            "-show_entries",
            "stream=width,height,r_frame_rate,nb_read_frames",
            "-of",
            "json",
            str(video),
        ],
        check=True,
        capture_output=True,
        text=True,
    )
    return json.loads(result.stdout)["streams"][0]


def extract_cyclic_source(video: Path, destination: Path) -> None:
    run(
        [
            "ffmpeg",
            "-y",
            "-hide_banner",
            "-loglevel",
            "warning",
            "-i",
            str(video),
            "-vsync",
            "0",
            str(destination / "%08d.png"),
        ]
    )
    frames = sorted(destination.glob("*.png"))
    if len(frames) != SOURCE_FRAMES:
        raise RuntimeError(
            f"Se esperaban {SOURCE_FRAMES} frames y se extrajeron {len(frames)}."
        )
    shutil.copy2(frames[0], destination / f"{SOURCE_FRAMES + 1:08d}.png")


def interpolate(rife: Path, model_dir: Path, source: Path, output: Path) -> None:
    run(
        [
            str(rife),
            "-i",
            str(source),
            "-o",
            str(output),
            "-m",
            str(model_dir),
            "-g",
            "0",
            "-j",
            "1:2:1",
            "-u",
            "-z",
            "-f",
            "%08d.png",
        ]
    )
    frames = sorted(output.glob("*.png"))
    # Con 241 entradas, el modo 2x nativo conserva cada original en las
    # posiciones impares y coloca los intermedios en las pares. Produce además
    # el primer frame repetido y una salida terminal redundante: ambos quedan
    # después del frame 480 y no forman parte del bucle final.
    if len(frames) != OUTPUT_FRAMES + 2:
        raise RuntimeError(
            f"RIFE debía generar {OUTPUT_FRAMES + 2} frames; generó {len(frames)}."
        )


def encode(source: Path, output: Path, encoder: str) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    temporary = output.with_name(f"{output.stem}.rendering{output.suffix}")
    command = [
        "ffmpeg",
        "-y",
        "-hide_banner",
        "-loglevel",
        "warning",
        "-framerate",
        str(OUTPUT_FPS),
        "-start_number",
        "1",
        "-i",
        str(source / "%08d.png"),
        "-frames:v",
        str(OUTPUT_FRAMES),
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
            "5.2",
            "-pix_fmt",
            "yuv420p",
            "-movflags",
            "+faststart",
            str(temporary),
        ]
    )
    run(command)
    metadata = probe_video(temporary)
    expected = {
        "width": WIDTH,
        "height": HEIGHT,
        "r_frame_rate": f"{OUTPUT_FPS}/1",
        "nb_read_frames": str(OUTPUT_FRAMES),
    }
    for field, value in expected.items():
        if metadata.get(field) != value:
            raise RuntimeError(
                f"Vídeo no válido: {field}={metadata.get(field)!r}; esperado {value!r}."
            )
    os.replace(temporary, output)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--input",
        type=Path,
        required=True,
        help="Fuente H.264 4K de 10 s, 24 FPS y 240 frames.",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("assets/videos/menu_loop_48fps.mp4"),
    )
    parser.add_argument("--rife", type=Path)
    parser.add_argument("--model", type=Path)
    parser.add_argument("--encoder", choices=("nvenc", "x264"), default="nvenc")
    args = parser.parse_args()

    source = args.input.expanduser().resolve()
    if not source.is_file():
        raise FileNotFoundError(source)
    metadata = probe_video(source)
    expected = {
        "width": WIDTH,
        "height": HEIGHT,
        "r_frame_rate": f"{SOURCE_FPS}/1",
        "nb_read_frames": str(SOURCE_FRAMES),
    }
    for field, value in expected.items():
        if metadata.get(field) != value:
            raise RuntimeError(
                f"Fuente no válida: {field}={metadata.get(field)!r}; esperado {value!r}."
            )

    rife = find_rife(args.rife)
    model_dir = (
        args.model.expanduser().resolve()
        if args.model is not None
        else rife.parent / MODEL
    )
    if not model_dir.is_dir():
        raise FileNotFoundError(model_dir)

    with tempfile.TemporaryDirectory(prefix="illo-menu-loop-rife48-") as temporary:
        root = Path(temporary)
        extracted = root / "input"
        interpolated = root / "output"
        extracted.mkdir()
        interpolated.mkdir()
        extract_cyclic_source(source, extracted)
        interpolate(rife, model_dir, extracted, interpolated)
        encode(interpolated, args.output.expanduser().resolve(), args.encoder)

    print(args.output.expanduser().resolve())
    return 0


if __name__ == "__main__":
    sys.exit(main())
