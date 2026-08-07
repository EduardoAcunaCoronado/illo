#!/usr/bin/env python3
"""Prepare a non-destructive UHD copy of Samu's storyboard V2 Kdenlive project."""

from __future__ import annotations

import argparse
import os
import re
import shutil
import subprocess
import xml.etree.ElementTree as ET
from pathlib import Path

from PIL import Image


PROJECT_NAME = "Opening Project AI.RI - Transfurmados.kdenlive"
OUTPUT_PROJECT_NAME = "Opening Project AI.RI - Transfurmados 4K.kdenlive"
VIDEO_NAMES = ("4.mp4", "13.mp4", "Intro_Neon.mp4")
AUDIO_NAMES = ("1 - Aguántame la puerta.mp3",)
RECT_PROPERTY = "rect"
MEDIA_DIMENSION_RE = re.compile(r"^meta\.media(?:\.0\.codec)?\.(width|height)$")


def default_source() -> Path:
    return (
        Path(__file__).resolve().parents[1]
        / "workbench"
        / "assets"
        / "video"
        / "cutscenes"
        / "prologue"
        / "opening_samu"
        / "storyboardV2"
    )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Escala al 200 % los assets de storyboardV2 y adapta su proyecto a UHD 30 fps."
    )
    parser.add_argument("--source", type=Path, default=default_source())
    parser.add_argument("--output", type=Path)
    parser.add_argument("--force", action="store_true", help="Regenera una salida 4K existente.")
    return parser.parse_args()


def atomic_png_resize(source: Path, destination: Path) -> tuple[int, int]:
    destination.parent.mkdir(parents=True, exist_ok=True)
    temporary = destination.with_name(f".{destination.name}.{os.getpid()}.tmp")
    try:
        with Image.open(source) as image:
            resized = image.resize(
                (image.width * 2, image.height * 2),
                Image.Resampling.LANCZOS,
            )
            try:
                save_options: dict[str, object] = {"format": "PNG", "compress_level": 6}
                if image.info.get("icc_profile"):
                    save_options["icc_profile"] = image.info["icc_profile"]
                if image.info.get("dpi"):
                    save_options["dpi"] = image.info["dpi"]
                resized.save(temporary, **save_options)
            finally:
                resized.close()
        os.replace(temporary, destination)
    finally:
        temporary.unlink(missing_ok=True)
    with Image.open(destination) as result:
        return result.size


def probe_video(path: Path) -> tuple[int, int]:
    result = subprocess.run(
        [
            "ffprobe",
            "-v",
            "error",
            "-select_streams",
            "v:0",
            "-show_entries",
            "stream=width,height",
            "-of",
            "csv=p=0:s=x",
            str(path),
        ],
        check=True,
        capture_output=True,
        text=True,
        timeout=30,
    )
    width, height = result.stdout.strip().split("x")
    return int(width), int(height)


def transcode_uhd(source: Path, destination: Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    temporary = destination.with_name(f".{destination.stem}.{os.getpid()}.tmp.mp4")
    try:
        result = subprocess.run(
            [
                "ffmpeg",
                "-hide_banner",
                "-loglevel",
                "error",
                "-y",
                "-i",
                str(source),
                "-map",
                "0:v:0",
                "-map",
                "0:a?",
                "-vf",
                "scale=3840:2160:flags=lanczos",
                "-c:v",
                "libx264",
                "-preset",
                "medium",
                "-crf",
                "18",
                "-pix_fmt",
                "yuv420p",
                "-c:a",
                "copy",
                "-movflags",
                "+faststart",
                str(temporary),
            ],
            capture_output=True,
            text=True,
            timeout=60 * 60,
        )
        if result.returncode != 0:
            error_lines = result.stderr.strip().splitlines()
            raise RuntimeError(error_lines[-1] if error_lines else f"ffmpeg falló con {source.name}")
        os.replace(temporary, destination)
    finally:
        temporary.unlink(missing_ok=True)


def scale_rect_value(value: str) -> str:
    scaled_segments: list[str] = []
    for segment in value.split(";"):
        prefix, separator, values = segment.partition("=")
        if not separator:
            scaled_segments.append(segment)
            continue
        fields = values.split()
        if len(fields) < 4:
            scaled_segments.append(segment)
            continue
        try:
            coordinates = [float(field) * 2 for field in fields[:4]]
        except ValueError:
            scaled_segments.append(segment)
            continue
        formatted = [
            str(int(number)) if number.is_integer() else f"{number:.6f}".rstrip("0").rstrip(".")
            for number in coordinates
        ]
        scaled_segments.append(f"{prefix}={' '.join(formatted + fields[4:])}")
    return ";".join(scaled_segments)


def media_name(properties: dict[str, ET.Element]) -> str | None:
    value = None
    if "warp_resource" in properties:
        value = properties["warp_resource"].text
    elif "resource" in properties:
        value = properties["resource"].text
    if not value:
        return None
    if re.match(r"^[0-9.]+:.+", value):
        value = value.split(":", 1)[1]
    return Path(value).name


def prepare_project(
    source_project: Path,
    destination_project: Path,
    dimensions: dict[str, tuple[int, int]],
) -> int:
    tree = ET.parse(source_project)
    root = tree.getroot()
    root.set("root", destination_project.parent.as_posix())
    profile = root.find("profile")
    if profile is None:
        raise RuntimeError("El proyecto no contiene un perfil MLT")
    profile.set("description", "UHD 2160p 30 fps")
    profile.set("width", "3840")
    profile.set("height", "2160")

    scaled_rects = 0
    for parent in root.iter():
        properties = {
            prop.get("name", ""): prop
            for prop in parent.findall("property")
        }
        name = media_name(properties)
        if name in dimensions:
            width, height = dimensions[name]
            for property_name, prop in properties.items():
                match = MEDIA_DIMENSION_RE.fullmatch(property_name)
                if match:
                    prop.text = str(width if match.group(1) == "width" else height)
        for prop in parent.findall("property"):
            property_name = prop.get("name", "")
            if property_name == RECT_PROPERTY and prop.text:
                prop.text = scale_rect_value(prop.text)
                scaled_rects += 1
            elif property_name == "kdenlive:docproperties.profile":
                prop.text = "uhd_2160p_30"
            elif property_name == "kdenlive:docproperties.renderrescalewidth":
                prop.text = "3840"
            elif property_name == "kdenlive:docproperties.renderrescaleheight":
                prop.text = "2160"

    destination_project.parent.mkdir(parents=True, exist_ok=True)
    temporary = destination_project.with_name(f".{destination_project.name}.{os.getpid()}.tmp")
    try:
        tree.write(temporary, encoding="utf-8", xml_declaration=True)
        os.replace(temporary, destination_project)
    finally:
        temporary.unlink(missing_ok=True)
    return scaled_rects


def main() -> int:
    args = parse_args()
    source = args.source.resolve()
    output = (args.output or source / "4k").resolve()
    if not source.is_dir():
        raise FileNotFoundError(f"No existe storyboardV2: {source}")
    if output.exists() and not args.force:
        raise FileExistsError(f"La salida ya existe: {output}. Usa --force para regenerarla.")
    if output == source or source in output.parents and output.name != "4k":
        raise ValueError("La salida debe ser la subcarpeta 4k o estar fuera de la fuente")
    output.mkdir(parents=True, exist_ok=True)

    dimensions: dict[str, tuple[int, int]] = {}
    image_sources = sorted(source.glob("*.png")) + sorted((source / "13_anchors").glob("*.png"))
    for image_source in image_sources:
        relative = image_source.relative_to(source)
        dimensions[image_source.name] = atomic_png_resize(image_source, output / relative)
        print(f"PNG  {relative} -> {dimensions[image_source.name][0]}x{dimensions[image_source.name][1]}")

    for video_name in VIDEO_NAMES:
        video_source = source / video_name
        if not video_source.is_file():
            raise FileNotFoundError(f"Falta {video_source}")
        video_output = output / video_name
        if probe_video(video_source) == (3840, 2160):
            shutil.copy2(video_source, video_output)
            print(f"COPY {video_name} ya es 3840x2160")
        else:
            transcode_uhd(video_source, video_output)
            print(f"MP4  {video_name} -> 3840x2160")
        dimensions[video_name] = probe_video(video_output)

    for audio_name in AUDIO_NAMES:
        shutil.copy2(source / audio_name, output / audio_name)

    project_output = output / OUTPUT_PROJECT_NAME
    rects = prepare_project(source / PROJECT_NAME, project_output, dimensions)
    print(f"PROJECT {project_output.name}: UHD 30 fps, {rects} geometrías escaladas")
    print(f"READY {output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
