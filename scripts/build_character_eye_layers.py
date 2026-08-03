#!/usr/bin/env python3
"""Convierte parpadeos de sprite completo en capas oculares ligeras.

Cada pose animada se divide en un cuerpo sin la región ocular, una capa con
los ojos originales y una capa por frame de parpadeo. El cuerpo nunca cambia
durante la animación. Los sprites completos generados se usan solo como fuente
de los ojos y pueden retirarse después de validar la migración.
"""

from __future__ import annotations

import argparse
import base64
import binascii
import io
import json
import math
import os
import re
import subprocess
import tempfile
import time
from datetime import datetime, timezone
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from dataclasses import dataclass
from pathlib import Path
from typing import Any
from urllib.parse import parse_qs, urlsplit

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageOps


ROOT = Path(__file__).resolve().parents[1]
CHARACTER_DIR = ROOT / "characters"
LAYER_ROOT = ROOT / "assets" / "images" / "characters" / "eye_layers"
METADATA_PATH = ROOT / "assets" / "metadata" / "blink_eye_layers.json"
CLEAN_METADATA_PATH = ROOT / "assets" / "metadata" / "blink_eye_layers_clean.json"
CLEAN_BASES_METADATA_PATH = ROOT / "assets" / "metadata" / "blink_eye_clean_bases.json"
CLEAN_BASE_ROOT = ROOT / "assets" / "images" / "characters" / "eye_bases_clean"
EYE_REGION_PREVIEW_METADATA_PATH = ROOT / "assets" / "metadata" / "blink_eye_region_previews.json"
EYE_REGION_PREVIEW_ROOT = ROOT / "assets" / "images" / "characters" / "eye_region_previews"
INTERMEDIATE_METADATA_PATH = ROOT / "assets" / "metadata" / "blink_eye_intermediates.json"
MANUAL_REGIONS_PATH = ROOT / "assets" / "metadata" / "blink_eye_regions_manual.json"
MANUAL_OFFSETS_PATH = ROOT / "assets" / "metadata" / "blink_eye_offsets_manual.json"
CLEAN_OFFSETS_PATH = ROOT / "assets" / "metadata" / "blink_eye_clean_offsets_manual.json"
PIXEL_EDITS_METADATA_PATH = ROOT / "assets" / "metadata" / "blink_eye_pixel_edits.json"
PIXEL_EDITS_ROOT = ROOT / "assets" / "images" / "characters" / "eye_layer_edits"
WHITE_HALO_METADATA_PATH = ROOT / "assets" / "metadata" / "sprite_white_halo_cleaned.json"
WHITE_HALO_ROOT = ROOT / "assets" / "images" / "characters" / "sprite_halo_cleaned"
OPTIMIZATION_MANIFEST_PATH = (
    ROOT / "workbench" / "optimization" / "asset_optimization_manifest.json"
)
PRESERVED_RUNTIME_ROOT = ROOT / "workbench" / "originals" / "runtime"
EDITOR_PATH = Path(__file__).with_name("eye_region_editor.html")
PREVIEW_PATH = Path(__file__).with_name("eye_layer_preview.html")
CLEANER_PATH = Path(__file__).with_name("eye_base_cleaner.html")
WHITE_HALO_EDITOR_PATH = Path(__file__).with_name("sprite_white_halo_editor.html")
TOOLS_MENU_PATH = Path(__file__).with_name("eye_tools_menu.html")
LEGACY_CHARACTER_KEYS = {"epod"}
SUPPORTED_IMAGES = {".png", ".webp", ".jpg", ".jpeg"}

# Regiones normalizadas (x1, y1, x2, y2) para poses donde el detector no ve
# un rostro fiable. Se completa y revisa visualmente mediante --qa-dir.
REGION_OVERRIDES: dict[str, tuple[float, float, float, float]] = {}
_EDITOR_INVENTORY_CACHE: list[dict[str, Any]] | None = None
_BASE_SPRITE_INVENTORY_CACHE: list[dict[str, Any]] | None = None
_ASSET_RELOCATION_CACHE: tuple[int, dict[str, list[str]]] | None = None


@dataclass
class PoseJob:
    character_key: str
    character_path: Path
    character: dict[str, Any]
    pose_key: str
    base_source: str
    animation: Any
    frame_sources: list[str]
    region: list[dict[str, float]]
    region_method: str


def slug(value: str) -> str:
    value = value.lower()
    value = re.sub(r"[^a-z0-9]+", "_", value).strip("_")
    return value or "pose"


def relative(path: Path) -> str:
    return path.relative_to(ROOT).as_posix()


def normalized_asset_reference(value: Any) -> str | None:
    """Normaliza una ruta de proyecto sin permitir que salga del repositorio."""
    if not isinstance(value, str) or not value.strip():
        return None
    reference = value.split("?", 1)[0].replace("\\", "/").lstrip("/")
    candidate = (ROOT / reference).resolve()
    try:
        candidate.relative_to(ROOT)
    except ValueError:
        return None
    return relative(candidate)


def asset_relocations() -> dict[str, list[str]]:
    """Relaciona fuentes movidas con su WebP runtime y su original protegido.

    La optimización mueve PNG/JPEG a ``workbench/originals/runtime``. Las
    herramientas deben seguir encontrando una pose aunque un JSON antiguo o un
    cambio traído de otra rama conserve la ruta anterior.
    """
    global _ASSET_RELOCATION_CACHE
    if not OPTIMIZATION_MANIFEST_PATH.is_file():
        return {}
    stamp = OPTIMIZATION_MANIFEST_PATH.stat().st_mtime_ns
    if _ASSET_RELOCATION_CACHE and _ASSET_RELOCATION_CACHE[0] == stamp:
        return _ASSET_RELOCATION_CACHE[1]
    try:
        payload = json.loads(
            OPTIMIZATION_MANIFEST_PATH.read_text(encoding="utf-8")
        )
    except (OSError, json.JSONDecodeError):
        return {}
    relocations: dict[str, list[str]] = {}
    for source_key, entry in (payload.get("conversions") or {}).items():
        if not isinstance(entry, dict):
            continue
        source = normalized_asset_reference(entry.get("source") or source_key)
        runtime = normalized_asset_reference(entry.get("runtime"))
        original = normalized_asset_reference(entry.get("original"))
        candidates = [item for item in (runtime, original) if item]
        for alias in (source, runtime, original):
            if alias:
                relocations[alias] = candidates
    _ASSET_RELOCATION_CACHE = (stamp, relocations)
    return relocations


def asset_reference_candidates(value: Any) -> list[str]:
    reference = normalized_asset_reference(value)
    if not reference:
        return []
    candidates = [reference, *asset_relocations().get(reference, [])]
    source_path = Path(reference)
    if source_path.suffix.lower() in {".png", ".jpg", ".jpeg"}:
        candidates.append(source_path.with_suffix(".webp").as_posix())
    if reference.startswith("assets/"):
        candidates.append(
            relative(PRESERVED_RUNTIME_ROOT / Path(reference))
        )
    return list(dict.fromkeys(candidates))


def resolve_asset_reference(value: Any) -> str | None:
    """Devuelve la ruta configurada o, si fue movida, su copia runtime."""
    for reference in asset_reference_candidates(value):
        if (ROOT / reference).is_file():
            return reference
    return None


def require_asset_reference(value: Any) -> str:
    reference = resolve_asset_reference(value)
    if reference:
        return reference
    raise FileNotFoundError(f"No se encuentra el asset: {value}")


def animation_frames(config: Any) -> list[Any]:
    if isinstance(config, list):
        return config
    if isinstance(config, dict) and isinstance(config.get("frames"), list):
        return config["frames"]
    return []


def frame_value(frame: Any) -> str | None:
    if isinstance(frame, str):
        return frame
    if isinstance(frame, dict):
        return frame.get("src") or frame.get("image") or frame.get("pose")
    return None


def resolve_frame_source(character: dict[str, Any], frame: Any) -> str | None:
    value = frame_value(frame)
    if not value:
        return None
    configured = (character.get("poses") or {}).get(value, value)
    return resolve_asset_reference(configured)


def load_manual_regions() -> dict[str, Any]:
    if not MANUAL_REGIONS_PATH.is_file():
        return {}
    payload = json.loads(MANUAL_REGIONS_PATH.read_text(encoding="utf-8"))
    regions = payload.get("regions", {})
    return regions if isinstance(regions, dict) else {}


def save_manual_regions(regions: dict[str, Any]) -> None:
    payload = {"version": 2, "regions": dict(sorted(regions.items()))}
    MANUAL_REGIONS_PATH.parent.mkdir(parents=True, exist_ok=True)
    temporary = MANUAL_REGIONS_PATH.with_suffix(".json.tmp")
    temporary.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    temporary.replace(MANUAL_REGIONS_PATH)


def load_eye_region_previews() -> dict[str, dict[str, Any]]:
    if not EYE_REGION_PREVIEW_METADATA_PATH.is_file():
        return {}
    payload = json.loads(
        EYE_REGION_PREVIEW_METADATA_PATH.read_text(encoding="utf-8")
    )
    poses = payload.get("poses", {})
    return poses if isinstance(poses, dict) else {}


def load_eye_intermediates() -> dict[str, dict[str, Any]]:
    if not INTERMEDIATE_METADATA_PATH.is_file():
        return {}
    payload = json.loads(INTERMEDIATE_METADATA_PATH.read_text(encoding="utf-8"))
    poses = payload.get("poses", {})
    return poses if isinstance(poses, dict) else {}


def save_eye_region_preview_metadata(poses: dict[str, dict[str, Any]]) -> None:
    payload = {"version": 1, "poses": dict(sorted(poses.items()))}
    EYE_REGION_PREVIEW_METADATA_PATH.parent.mkdir(parents=True, exist_ok=True)
    temporary = EYE_REGION_PREVIEW_METADATA_PATH.with_suffix(".json.tmp")
    temporary.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    temporary.replace(EYE_REGION_PREVIEW_METADATA_PATH)


def load_manual_offsets() -> dict[str, list[int]]:
    if not MANUAL_OFFSETS_PATH.is_file():
        return {}
    payload = json.loads(MANUAL_OFFSETS_PATH.read_text(encoding="utf-8"))
    offsets = payload.get("offsets", {})
    return offsets if isinstance(offsets, dict) else {}


def save_manual_offsets(offsets: dict[str, list[int]]) -> None:
    payload = {"version": 1, "offsets": dict(sorted(offsets.items()))}
    MANUAL_OFFSETS_PATH.parent.mkdir(parents=True, exist_ok=True)
    temporary = MANUAL_OFFSETS_PATH.with_suffix(".json.tmp")
    temporary.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    temporary.replace(MANUAL_OFFSETS_PATH)


def load_clean_offsets() -> dict[str, dict[str, Any]]:
    if not CLEAN_OFFSETS_PATH.is_file():
        return {}
    payload = json.loads(CLEAN_OFFSETS_PATH.read_text(encoding="utf-8"))
    offsets = payload.get("offsets", {})
    return offsets if isinstance(offsets, dict) else {}


def save_clean_offsets(offsets: dict[str, dict[str, Any]]) -> None:
    payload = {"version": 3, "offsets": dict(sorted(offsets.items()))}
    CLEAN_OFFSETS_PATH.parent.mkdir(parents=True, exist_ok=True)
    temporary = CLEAN_OFFSETS_PATH.with_suffix(".json.tmp")
    temporary.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    temporary.replace(CLEAN_OFFSETS_PATH)


def load_pixel_edits() -> dict[str, dict[str, dict[str, str]]]:
    if not PIXEL_EDITS_METADATA_PATH.is_file():
        return {}
    payload = json.loads(PIXEL_EDITS_METADATA_PATH.read_text(encoding="utf-8"))
    edits = payload.get("edits", {})
    return edits if isinstance(edits, dict) else {}


def save_pixel_edits(edits: dict[str, dict[str, dict[str, str]]]) -> None:
    payload = {"version": 1, "edits": dict(sorted(edits.items()))}
    PIXEL_EDITS_METADATA_PATH.parent.mkdir(parents=True, exist_ok=True)
    temporary = PIXEL_EDITS_METADATA_PATH.with_suffix(".json.tmp")
    temporary.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    temporary.replace(PIXEL_EDITS_METADATA_PATH)


def load_white_halo_edits() -> dict[str, dict[str, Any]]:
    if not WHITE_HALO_METADATA_PATH.is_file():
        return {}
    payload = json.loads(WHITE_HALO_METADATA_PATH.read_text(encoding="utf-8"))
    sprites = payload.get("sprites", {})
    return sprites if isinstance(sprites, dict) else {}


def save_white_halo_edits(sprites: dict[str, dict[str, Any]]) -> None:
    payload = {"version": 1, "sprites": dict(sorted(sprites.items()))}
    WHITE_HALO_METADATA_PATH.parent.mkdir(parents=True, exist_ok=True)
    temporary = WHITE_HALO_METADATA_PATH.with_suffix(".json.tmp")
    temporary.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    temporary.replace(WHITE_HALO_METADATA_PATH)


def source_eye_layer_path(job_id: str, source_kind: str, state: str) -> str:
    if source_kind not in {"saved", "clean"}:
        raise ValueError("El origen ocular no es válido")
    if state not in {"open", "half", "closed"}:
        raise ValueError("El estado ocular no es válido")
    if source_kind == "saved":
        pose = load_eye_region_previews().get(job_id)
        if not isinstance(pose, dict):
            raise ValueError("La pose no tiene recortes oculares guardados")
        paths = {
            "open": pose.get("original"),
            "half": pose.get("half"),
            "closed": pose.get("closed") or next(iter(pose.get("blinks", [])), None),
        }
    else:
        pose = clean_eye_pose(job_id)
        paths = {
            "open": pose.get("eyesOpen"),
            "half": pose.get("eyesHalf"),
            "closed": pose.get("eyesClosed"),
        }
    path = paths.get(state)
    if not path:
        raise ValueError("La pose no tiene esa capa ocular")
    return require_asset_reference(path)


def edited_eye_layer_path(job_id: str, source_kind: str, state: str) -> str:
    edits = load_pixel_edits()
    path = ((edits.get(source_kind) or {}).get(job_id) or {}).get(state)
    resolved = resolve_asset_reference(path)
    if resolved:
        return resolved
    return source_eye_layer_path(job_id, source_kind, state)


def save_pixel_edit(job_id: str, source_kind: str, state: str, data_url: Any) -> dict[str, Any]:
    source_path = source_eye_layer_path(job_id, source_kind, state)
    with Image.open(ROOT / source_path) as source:
        expected = source.size
    image = decode_canvas_image(data_url)
    if image.size != expected:
        raise ValueError(
            f"La capa debe medir {expected[0]}×{expected[1]} px; recibido {image.width}×{image.height}"
        )
    pixels = np.asarray(image, dtype=np.uint8).copy()
    pixels[pixels[:, :, 3] == 0, :3] = 0
    character, pose_name = job_id.split(".", 1)
    output_path = PIXEL_EDITS_ROOT / source_kind / character / pose_name / f"eyes_{state}.png"
    output_path.parent.mkdir(parents=True, exist_ok=True)
    temporary = output_path.with_suffix(".png.tmp")
    Image.fromarray(pixels, "RGBA").save(temporary, "PNG", optimize=True)
    temporary.replace(output_path)

    edits = load_pixel_edits()
    edits.setdefault(source_kind, {}).setdefault(job_id, {})[state] = relative(output_path)
    save_pixel_edits(edits)
    return {
        "ok": True,
        "id": job_id,
        "source": source_kind,
        "state": state,
        "path": relative(output_path),
        "width": image.width,
        "height": image.height,
    }


def load_clean_bases() -> dict[str, dict[str, Any]]:
    if not CLEAN_BASES_METADATA_PATH.is_file():
        return {}
    payload = json.loads(CLEAN_BASES_METADATA_PATH.read_text(encoding="utf-8"))
    poses = payload.get("poses", {})
    return poses if isinstance(poses, dict) else {}


def save_clean_bases(poses: dict[str, dict[str, Any]]) -> None:
    payload = {"version": 1, "poses": dict(sorted(poses.items()))}
    CLEAN_BASES_METADATA_PATH.parent.mkdir(parents=True, exist_ok=True)
    temporary = CLEAN_BASES_METADATA_PATH.with_suffix(".json.tmp")
    temporary.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    temporary.replace(CLEAN_BASES_METADATA_PATH)


def clean_eye_pose(job_id: str) -> dict[str, Any]:
    if not CLEAN_METADATA_PATH.is_file():
        raise FileNotFoundError("No existe el manifiesto de capas oculares limpias")
    metadata = json.loads(CLEAN_METADATA_PATH.read_text(encoding="utf-8"))
    pose = (metadata.get("poses") or {}).get(job_id)
    if not isinstance(pose, dict):
        raise ValueError("La pose no está disponible para limpiar")
    return pose


def decode_canvas_image(data_url: Any) -> Image.Image:
    if not isinstance(data_url, str) or not data_url.startswith("data:image/png;base64,"):
        raise ValueError("La limpieza debe enviarse como PNG")
    encoded = data_url.split(",", 1)[1]
    if len(encoded) > 32_000_000:
        raise ValueError("La imagen supera el límite permitido")
    try:
        raw = base64.b64decode(encoded, validate=True)
    except (binascii.Error, ValueError) as error:
        raise ValueError("El PNG recibido no es válido") from error
    try:
        with Image.open(io.BytesIO(raw)) as image:
            image.load()
            return image.convert("RGBA")
    except OSError as error:
        raise ValueError("No se pudo leer el PNG recibido") from error


def save_white_halo_sprite(
    job_id: str, data_url: Any, validate_only: bool = False
) -> dict[str, Any]:
    job = base_sprite_job(job_id)
    image = decode_canvas_image(data_url)
    expected = (int(job["width"]), int(job["height"]))
    if image.size != expected:
        raise ValueError(
            f"El sprite debe medir {expected[0]}×{expected[1]} px; recibido "
            f"{image.width}×{image.height}"
        )

    alpha = np.asarray(image.getchannel("A"), dtype=np.uint8)
    transparent_pixels = int(np.count_nonzero(alpha < 255))
    if validate_only:
        return {
            "ok": True,
            "validated": True,
            "canvas": {"width": image.width, "height": image.height},
            "transparentPixels": transparent_pixels,
        }

    character, pose_name = job_id.split(".", 1)
    source_stem = slug(Path(job["source"]).stem)
    output_path = WHITE_HALO_ROOT / character / pose_name / f"{source_stem}_halo_limpio.png"
    output_path.parent.mkdir(parents=True, exist_ok=True)
    pixels = np.asarray(image.convert("RGBA"), dtype=np.uint8).copy()
    pixels[pixels[:, :, 3] == 0, :3] = 0
    temporary = output_path.with_suffix(".png.tmp")
    Image.fromarray(pixels, "RGBA").save(temporary, "PNG", optimize=True)
    temporary.replace(output_path)

    def save_contain_thumbnail(size: tuple[int, int], suffix: str) -> Path:
        thumbnail_path = output_path.with_name(f"{output_path.stem}_{suffix}.webp")
        source = Image.fromarray(pixels, "RGBA")
        source.thumbnail(size, Image.Resampling.LANCZOS)
        thumbnail = Image.new("RGBA", size, (0, 0, 0, 0))
        thumbnail.alpha_composite(
            source,
            ((size[0] - source.width) // 2, (size[1] - source.height) // 2),
        )
        thumbnail.save(thumbnail_path, "WEBP", quality=84, method=6, exact=True)
        return thumbnail_path

    pose_thumbnail_path = save_contain_thumbnail((156, 156), "miniatura")
    gallery_thumbnail_path = save_contain_thumbnail((480, 270), "galeria")

    edits = load_white_halo_edits()
    entry = {
        "source": job["source"],
        "cleaned": relative(output_path),
        "thumbnail": relative(pose_thumbnail_path),
        "galleryThumbnail": relative(gallery_thumbnail_path),
        "canvas": {"width": image.width, "height": image.height},
        "transparentPixels": transparent_pixels,
        "updatedAt": datetime.now(timezone.utc).isoformat(),
    }
    edits[job_id] = entry
    save_white_halo_edits(edits)
    return {"ok": True, "id": job_id, **entry}


def save_clean_base(job_id: str, data_url: Any, validate_only: bool = False) -> dict[str, Any]:
    pose = clean_eye_pose(job_id)
    image = decode_canvas_image(data_url)
    expected = (int(pose["canvas"]["width"]), int(pose["canvas"]["height"]))
    if image.size != expected:
        raise ValueError(
            f"El lienzo debe medir {expected[0]}×{expected[1]} px; recibido {image.width}×{image.height}"
        )
    alpha = np.asarray(image.getchannel("A"), dtype=np.uint8)
    transparent_pixels = int(np.count_nonzero(alpha < 255))
    if validate_only:
        return {
            "ok": True,
            "validated": True,
            "canvas": {"width": image.width, "height": image.height},
            "transparentPixels": transparent_pixels,
        }

    character, pose_name = job_id.split(".", 1)
    output_path = CLEAN_BASE_ROOT / character / pose_name / "base_no_eyes.webp"
    output_path.parent.mkdir(parents=True, exist_ok=True)
    temporary = output_path.with_suffix(".webp.tmp")
    pixels = np.asarray(image.convert("RGBA"), dtype=np.uint8).copy()
    pixels[pixels[:, :, 3] == 0, :3] = 0
    Image.fromarray(pixels, "RGBA").save(
        temporary, "WEBP", lossless=True, method=6, exact=True
    )
    temporary.replace(output_path)

    bases = load_clean_bases()
    entry = {
        "sourceBase": pose["base"],
        "cleanedBase": relative(output_path),
        "canvas": {"width": image.width, "height": image.height},
        "transparentPixels": transparent_pixels,
        "updatedAt": datetime.now(timezone.utc).isoformat(),
    }
    bases[job_id] = entry
    save_clean_bases(bases)
    return {"ok": True, "id": job_id, **entry}


def validate_manual_offset(value: Any) -> list[int]:
    if not isinstance(value, list) or len(value) != 2:
        raise ValueError("El offset debe contener X e Y")
    numbers = [int(round(float(entry))) for entry in value]
    if not all(-512 <= entry <= 512 for entry in numbers):
        raise ValueError("El offset debe estar entre -512 y 512 píxeles")
    return numbers


def validate_eye_scale(value: Any) -> list[float]:
    if not isinstance(value, list) or len(value) != 2:
        return [1.0, 1.0]
    numbers = [float(entry) for entry in value]
    if not all(math.isfinite(entry) and 0.25 <= entry <= 3.0 for entry in numbers):
        raise ValueError("El estirado debe estar entre el 25% y el 300%")
    return [round(entry, 4) for entry in numbers]


def default_clean_pose_transform() -> dict[str, Any]:
    return {
        "open": [0, 0],
        "half": [0, 0],
        "closed": [0, 0],
        "openScale": [1.0, 1.0],
        "halfScale": [1.0, 1.0],
        "closedScale": [1.0, 1.0],
    }


def validate_clean_pose_offsets(value: Any) -> dict[str, Any]:
    if not isinstance(value, dict):
        raise ValueError("Los offsets deben separar los ojos abiertos y cerrados")
    return {
        "open": validate_manual_offset(value.get("open", [0, 0])),
        "half": validate_manual_offset(value.get("half", [0, 0])),
        "closed": validate_manual_offset(value.get("closed", [0, 0])),
        "openScale": validate_eye_scale(value.get("openScale", [1, 1])),
        "halfScale": validate_eye_scale(value.get("halfScale", [1, 1])),
        "closedScale": validate_eye_scale(value.get("closedScale", [1, 1])),
    }


def update_layer_metadata_offset(job_id: str, offset: list[int]) -> None:
    if not METADATA_PATH.is_file():
        return
    metadata = json.loads(METADATA_PATH.read_text(encoding="utf-8"))
    pose = (metadata.get("poses") or {}).get(job_id)
    if not isinstance(pose, dict):
        return
    pose["offset"] = offset
    temporary = METADATA_PATH.with_suffix(".json.tmp")
    temporary.write_text(
        json.dumps(metadata, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    temporary.replace(METADATA_PATH)


def editor_jobs(refresh: bool = False) -> list[dict[str, Any]]:
    global _EDITOR_INVENTORY_CACHE
    if refresh:
        _EDITOR_INVENTORY_CACHE = None
    regions = load_manual_regions()
    previews = load_eye_region_previews()
    intermediates = load_eye_intermediates()
    if _EDITOR_INVENTORY_CACHE is None:
        inventory: list[dict[str, Any]] = []
        for character_path in sorted(CHARACTER_DIR.glob("*.json")):
            character_key = character_path.stem.lower()
            if character_key in LEGACY_CHARACTER_KEYS:
                continue
            character = json.loads(character_path.read_text(encoding="utf-8"))
            poses = character.get("poses") or {}
            animations = character.get("animations") or character.get("poseAnimations") or {}
            for pose_key, base_source in poses.items():
                config = animations.get(pose_key)
                frames = animation_frames(config)
                if not isinstance(base_source, str) or not frames:
                    continue
                if Path(base_source).suffix.lower() not in SUPPORTED_IMAGES:
                    continue
                base_source = resolve_asset_reference(base_source)
                if not base_source:
                    continue
                frame_sources = [
                    source
                    for source in (
                        resolve_frame_source(character, frame) for frame in frames
                    )
                    if source and Path(source).suffix.lower() in SUPPORTED_IMAGES
                ]
                if not frame_sources:
                    continue
                base_path = ROOT / base_source
                with Image.open(base_path) as image:
                    width, height = image.size
                inventory.append(
                    {
                        "id": f"{character_key}.{pose_key}",
                        "character": character_key,
                        "characterName": character.get("name") or character_key,
                        "pose": pose_key,
                        "baseSrc": base_source.replace("\\", "/"),
                        "frameSrcs": frame_sources,
                        "width": width,
                        "height": height,
                    }
                )
        _EDITOR_INVENTORY_CACHE = inventory

    return [
        dict(
            job,
            regions=validate_manual_regions(regions.get(job["id"])),
            preview=previews.get(job["id"]),
            halfSrc=(intermediates.get(job["id"]) or {}).get("half"),
            blinkDirection=(intermediates.get(job["id"]) or {}).get("direction", "closing"),
        )
        for job in _EDITOR_INVENTORY_CACHE
    ]


def base_sprite_jobs(refresh: bool = False) -> list[dict[str, Any]]:
    """Lista todas las poses base editables, tengan o no parpadeo configurado."""
    global _BASE_SPRITE_INVENTORY_CACHE
    if refresh:
        _BASE_SPRITE_INVENTORY_CACHE = None
    saved = load_white_halo_edits()
    if _BASE_SPRITE_INVENTORY_CACHE is None:
        inventory: list[dict[str, Any]] = []
        for character_path in sorted(CHARACTER_DIR.glob("*.json")):
            character_key = character_path.stem.lower()
            if character_key in LEGACY_CHARACTER_KEYS:
                continue
            character = json.loads(character_path.read_text(encoding="utf-8"))
            for pose_key, pose_value in (character.get("poses") or {}).items():
                source = pose_value.get("src") if isinstance(pose_value, dict) else pose_value
                if not isinstance(source, str):
                    continue
                if Path(source).suffix.lower() not in SUPPORTED_IMAGES:
                    continue
                source = resolve_asset_reference(source)
                if not source:
                    continue
                source_path = ROOT / source
                try:
                    with Image.open(source_path) as image:
                        width, height = image.size
                except OSError:
                    continue
                inventory.append(
                    {
                        "id": f"{character_key}.{pose_key}",
                        "character": character_key,
                        "characterName": character.get("name") or character_key,
                        "pose": pose_key,
                        "source": source,
                        "width": width,
                        "height": height,
                    }
                )
        _BASE_SPRITE_INVENTORY_CACHE = inventory
    return [dict(job, saved=saved.get(job["id"])) for job in _BASE_SPRITE_INVENTORY_CACHE]


def base_sprite_job(job_id: str) -> dict[str, Any]:
    job = next((entry for entry in base_sprite_jobs() if entry["id"] == job_id), None)
    if not job:
        raise ValueError("Pose base desconocida")
    return job


def validate_manual_region(value: Any) -> list[float] | None:
    if value is None:
        return None
    if not isinstance(value, list) or len(value) != 4:
        raise ValueError("La región debe contener x1, y1, x2 e y2")
    numbers = [float(entry) for entry in value]
    if not all(math.isfinite(entry) and 0 <= entry <= 1 for entry in numbers):
        raise ValueError("Las coordenadas deben estar entre 0 y 1")
    x1, y1, x2, y2 = numbers
    if x2 - x1 < 0.01 or y2 - y1 < 0.01:
        raise ValueError("La región ocular es demasiado pequeña")
    return [round(entry, 6) for entry in numbers]


def rectangle_to_eye_regions(value: Any) -> list[dict[str, float]]:
    rectangle = validate_manual_region(value)
    if rectangle is None:
        return []
    x1, y1, x2, y2 = rectangle
    width, height = x2 - x1, y2 - y1
    return [
        {
            "cx": round(x1 + width * fraction, 6),
            "cy": round(y1 + height * 0.5, 6),
            "rx": round(width * 0.25, 6),
            "ry": round(height * 0.5, 6),
            "rotation": 0.0,
            "mode": "include",
            "feather": 0.0,
        }
        for fraction in (0.25, 0.75)
    ]


def validate_manual_regions(value: Any) -> list[dict[str, float]] | None:
    if value is None:
        return None
    if isinstance(value, list) and len(value) == 4 and all(
        isinstance(entry, (int, float)) for entry in value
    ):
        return rectangle_to_eye_regions(value)
    if not isinstance(value, list) or not 1 <= len(value) <= 8:
        raise ValueError("Debe haber entre una y ocho zonas oculares")
    validated: list[dict[str, float]] = []
    for index, shape in enumerate(value, start=1):
        if not isinstance(shape, dict):
            raise ValueError(f"La zona ocular {index} no es válida")
        try:
            cx = float(shape["cx"])
            cy = float(shape["cy"])
            rx = float(shape["rx"])
            ry = float(shape["ry"])
            rotation = float(shape.get("rotation", 0))
            mode = str(shape.get("mode", "include"))
            feather = float(shape.get("feather", 0))
        except (KeyError, TypeError, ValueError) as error:
            raise ValueError(f"La zona ocular {index} está incompleta") from error
        if not all(
            math.isfinite(entry) for entry in (cx, cy, rx, ry, rotation, feather)
        ):
            raise ValueError(f"La zona ocular {index} contiene valores no válidos")
        if not (0 <= cx <= 1 and 0 <= cy <= 1):
            raise ValueError(f"El centro de la zona ocular {index} queda fuera del sprite")
        if not (0.003 <= rx <= 0.5 and 0.003 <= ry <= 0.5):
            raise ValueError(f"El tamaño de la zona ocular {index} no es válido")
        if mode not in {"include", "exclude"}:
            raise ValueError(f"El modo de la zona ocular {index} no es válido")
        if not 0 <= feather <= 32:
            raise ValueError(f"El suavizado de la zona ocular {index} no es válido")
        rotation = ((rotation + 180) % 360) - 180
        validated.append(
            {
                "cx": round(cx, 6),
                "cy": round(cy, 6),
                "rx": round(rx, 6),
                "ry": round(ry, 6),
                "rotation": round(rotation, 3),
                "mode": mode,
                "feather": round(feather, 2),
            }
        )
    if not any(shape["mode"] == "include" for shape in validated):
        raise ValueError("Debe existir al menos una zona ocular de inclusión")
    return validated


def eye_regions_bounds(
    regions: list[dict[str, float]], size: tuple[int, int]
) -> tuple[int, int, int, int]:
    boxes: list[tuple[float, float, float, float]] = []
    included = [shape for shape in regions if shape.get("mode", "include") == "include"]
    for shape in included:
        angle = math.radians(shape["rotation"])
        extent_x = math.sqrt(
            (shape["rx"] * math.cos(angle)) ** 2
            + (shape["ry"] * math.sin(angle)) ** 2
        )
        extent_y = math.sqrt(
            (shape["rx"] * math.sin(angle)) ** 2
            + (shape["ry"] * math.cos(angle)) ** 2
        )
        boxes.append(
            (
                shape["cx"] - extent_x,
                shape["cy"] - extent_y,
                shape["cx"] + extent_x,
                shape["cy"] + extent_y,
            )
        )
    normalized = (
        min(box[0] for box in boxes),
        min(box[1] for box in boxes),
        max(box[2] for box in boxes),
        max(box[3] for box in boxes),
    )
    return denormalize_box(normalized, size)


def eye_regions_cache_key(regions: list[dict[str, float]]) -> tuple[float, ...]:
    return tuple(
        value
        for shape in regions
        for value in (
            shape["cx"], shape["cy"], shape["rx"], shape["ry"],
            shape["rotation"], 1.0 if shape.get("mode", "include") == "include" else -1.0,
            float(shape.get("feather", 0)),
        )
    )


def translated_layer(layer: Image.Image, offset: list[int]) -> Image.Image:
    canvas = Image.new("RGBA", layer.size, (0, 0, 0, 0))
    canvas.alpha_composite(layer, (int(offset[0]), int(offset[1])))
    return canvas


def transformed_visible_layer(
    layer: Image.Image, offset: list[int], scale: list[float]
) -> Image.Image:
    """Desplaza y estira sólo el contenido visible alrededor de su centro."""
    bounds = layer.getchannel("A").getbbox()
    if not bounds:
        return Image.new("RGBA", layer.size, (0, 0, 0, 0))
    visible = layer.crop(bounds)
    target = (
        max(1, round(visible.width * scale[0])),
        max(1, round(visible.height * scale[1])),
    )
    if target != visible.size:
        visible = visible.resize(target, Image.Resampling.LANCZOS)
    center_x = (bounds[0] + bounds[2]) / 2 + offset[0]
    center_y = (bounds[1] + bounds[3]) / 2 + offset[1]
    position = (
        round(center_x - visible.width / 2),
        round(center_y - visible.height / 2),
    )
    canvas = Image.new("RGBA", layer.size, (0, 0, 0, 0))
    canvas.alpha_composite(visible, position)
    return canvas


def gif_palette_frame(image: Image.Image) -> Image.Image:
    """Convierte RGBA a GIF reservando el índice 0 para transparencia."""
    rgba = image.convert("RGBA")
    alpha = np.asarray(rgba.getchannel("A"), dtype=np.uint8)
    quantized = rgba.convert("RGB").quantize(
        colors=255, method=Image.Quantize.FASTOCTREE
    )
    palette = (quantized.getpalette() or [])[: 255 * 3]
    palette += [0] * (255 * 3 - len(palette))
    values = np.asarray(quantized, dtype=np.uint16) + 1
    values[alpha <= 12] = 0
    result = Image.fromarray(values.astype(np.uint8), "P")
    result.putpalette([0, 0, 0] + palette)
    result.info["transparency"] = 0
    return result


def encode_animation(
    rgba_frames: list[Image.Image], durations: list[int], output_format: str
) -> bytes:
    if output_format not in {"gif", "webp", "apng"}:
        raise ValueError("El formato de animación debe ser GIF, WebP o APNG")
    sanitized_frames: list[Image.Image] = []
    for frame in rgba_frames:
        pixels = np.asarray(frame.convert("RGBA"), dtype=np.uint8).copy()
        pixels[pixels[:, :, 3] == 0, :3] = 0
        sanitized_frames.append(Image.fromarray(pixels, "RGBA"))
    rgba_frames = sanitized_frames
    output = io.BytesIO()
    if output_format == "apng":
        rgba_frames[0].save(
            output,
            format="PNG",
            save_all=True,
            append_images=rgba_frames[1:],
            duration=durations,
            loop=0,
            disposal=0,
            blend=0,
            optimize=False,
            compress_level=6,
        )
        return output.getvalue()
    if output_format == "webp":
        rgba_frames[0].save(
            output,
            format="WEBP",
            save_all=True,
            append_images=rgba_frames[1:],
            duration=durations,
            loop=0,
            lossless=True,
            quality=100,
            method=6,
            background=(0, 0, 0, 0),
        )
        return output.getvalue()

    gif_frames = [gif_palette_frame(frame) for frame in rgba_frames]
    gif_frames[0].save(
        output,
        format="GIF",
        save_all=True,
        append_images=gif_frames[1:],
        duration=durations,
        loop=0,
        disposal=2,
        transparency=0,
        optimize=False,
    )
    return output.getvalue()


def export_saved_eye_preview_gif(
    job_id: str, full_sprite: bool = False, output_format: str = "gif"
) -> tuple[bytes, str]:
    previews = load_eye_region_previews()
    pose = previews.get(job_id)
    if not isinstance(pose, dict):
        raise ValueError("La pose no tiene recortes oculares guardados")
    canvas = pose.get("sourceCanvas") or {}
    canvas_size = (int(canvas.get("width", 0)), int(canvas.get("height", 0)))
    if min(canvas_size) <= 0:
        raise ValueError("El lienzo de los recortes no es válido")
    crop = pose.get("crop") or {}
    crop_origin = (int(crop.get("x", 0)), int(crop.get("y", 0)))
    transforms = validate_clean_pose_offsets(
        load_clean_offsets().get(
            job_id, default_clean_pose_transform()
        )
    )

    def full_layer(path: str, state: str) -> Image.Image:
        with Image.open(ROOT / path).convert("RGBA") as source:
            layer = source.copy()
        result = Image.new("RGBA", canvas_size, (0, 0, 0, 0))
        offset = transforms[state]
        scale = transforms[f"{state}Scale"]
        target = (
            max(1, round(layer.width * scale[0])),
            max(1, round(layer.height * scale[1])),
        )
        if target != layer.size:
            layer = layer.resize(target, Image.Resampling.LANCZOS)
        result.alpha_composite(
            layer,
            (
                round(crop_origin[0] + offset[0] - (layer.width - crop["width"]) / 2),
                round(crop_origin[1] + offset[1] - (layer.height - crop["height"]) / 2),
            ),
        )
        return result

    open_eyes = full_layer(edited_eye_layer_path(job_id, "saved", "open"), "open")
    half_path = edited_eye_layer_path(job_id, "saved", "half")
    closed_path = edited_eye_layer_path(job_id, "saved", "closed")
    if not half_path or not closed_path:
        raise ValueError("La pose no tiene recortes de parpadeo")
    half_eyes = full_layer(str(half_path), "half")
    closed_eyes = full_layer(str(closed_path), "closed")
    eye_sequence = [open_eyes, half_eyes, closed_eyes, half_eyes, open_eyes]
    durations = [700, 65, 95, 65, 650]

    if full_sprite:
        if not METADATA_PATH.is_file():
            raise FileNotFoundError("Genera primero la prueba de capas")
        metadata = json.loads(METADATA_PATH.read_text(encoding="utf-8"))
        layer_pose = (metadata.get("poses") or {}).get(job_id)
        if not isinstance(layer_pose, dict):
            raise ValueError("La pose no tiene una base corporal generada")
        with Image.open(ROOT / layer_pose["body"]).convert("RGBA") as source:
            body = source.copy()
        if body.size != canvas_size:
            raise ValueError("El cuerpo y los recortes no comparten lienzo")
        rgba_frames = []
        for eyes in eye_sequence:
            composed = body.copy()
            composed.alpha_composite(eyes)
            rgba_frames.append(composed)
    else:
        union_alpha = np.zeros((canvas_size[1], canvas_size[0]), dtype=np.uint8)
        for eyes in eye_sequence:
            union_alpha = np.maximum(
                union_alpha, np.asarray(eyes.getchannel("A"), dtype=np.uint8)
            )
        ys, xs = np.where(union_alpha > 0)
        if not len(xs):
            raise ValueError("La capa ocular está vacía")
        padding = 12
        bounds = (
            max(0, int(xs.min()) - padding),
            max(0, int(ys.min()) - padding),
            min(canvas_size[0], int(xs.max()) + padding + 1),
            min(canvas_size[1], int(ys.max()) + padding + 1),
        )
        rgba_frames = [eyes.crop(bounds) for eyes in eye_sequence]
    max_side = max(rgba_frames[0].size)
    if max_side > 960:
        scale = 960 / max_side
        target = (
            max(1, round(rgba_frames[0].width * scale)),
            max(1, round(rgba_frames[0].height * scale)),
        )
        rgba_frames = [
            frame.resize(target, Image.Resampling.LANCZOS) for frame in rgba_frames
        ]
    suffix = "completo" if full_sprite else "ojos"
    content = encode_animation(rgba_frames, durations, output_format)
    extension = "png" if output_format == "apng" else output_format
    return content, f"{slug(job_id)}_parpadeo_{suffix}.{extension}"


def export_blink_gif(
    job_id: str, mode: str, source_kind: str = "auto", output_format: str = "gif"
) -> tuple[bytes, str]:
    if mode not in {"full", "eyes"}:
        raise ValueError("El tipo de GIF debe ser 'full' o 'eyes'")
    if source_kind not in {"auto", "saved", "clean"}:
        raise ValueError("El origen del GIF no es válido")
    if output_format not in {"gif", "webp", "apng"}:
        raise ValueError("El formato de animación no es válido")
    if source_kind == "saved":
        return export_saved_eye_preview_gif(
            job_id, full_sprite=mode == "full", output_format=output_format
        )
    if not METADATA_PATH.is_file():
        raise FileNotFoundError("Genera primero la prueba de capas")
    metadata = json.loads(METADATA_PATH.read_text(encoding="utf-8"))
    pose = (metadata.get("poses") or {}).get(job_id)
    if not isinstance(pose, dict):
        raise ValueError("La pose no está disponible en la preview")

    clean_pose = None
    if source_kind in {"auto", "clean"} and CLEAN_METADATA_PATH.is_file():
        clean_metadata = json.loads(CLEAN_METADATA_PATH.read_text(encoding="utf-8"))
        clean_pose = (clean_metadata.get("poses") or {}).get(job_id)

    frame_configs = pose.get("frames") or []
    if not frame_configs:
        raise ValueError("La pose no tiene fotogramas de parpadeo")
    offset = validate_manual_offset(pose.get("offset", [0, 0]))
    clean_pose_offsets = default_clean_pose_transform()
    if clean_pose:
        clean_pose_offsets = validate_clean_pose_offsets(
            load_clean_offsets().get(job_id, clean_pose_offsets)
        )
    body_path = pose["body"]
    open_path = (
        edited_eye_layer_path(job_id, "clean", "open")
        if clean_pose else pose["eyesOpen"]
    )
    with Image.open(ROOT / body_path).convert("RGBA") as body_source:
        body = body_source.copy()
    with Image.open(ROOT / open_path).convert("RGBA") as open_source:
        open_eyes = open_source.copy()
    if clean_pose:
        open_eyes = transformed_visible_layer(
            open_eyes,
            clean_pose_offsets["open"],
            clean_pose_offsets["openScale"],
        )

    blink_layers: list[Image.Image] = []
    durations: list[int] = [700]
    export_frames = (
        [
            {"src": edited_eye_layer_path(job_id, "clean", "half"), "duration": 65, "state": "half"},
            {"src": edited_eye_layer_path(job_id, "clean", "closed"), "duration": 95, "state": "closed"},
            {"src": edited_eye_layer_path(job_id, "clean", "half"), "duration": 65, "state": "half"},
        ]
        if clean_pose and clean_pose.get("eyesHalf") else frame_configs
    )
    for frame_config in export_frames:
        with Image.open(ROOT / frame_config["src"]).convert("RGBA") as source:
            if clean_pose:
                state = frame_config.get("state", "closed")
                blink_layers.append(
                    transformed_visible_layer(
                        source.copy(),
                        clean_pose_offsets[state],
                        clean_pose_offsets[f"{state}Scale"],
                    )
                )
            else:
                blink_layers.append(translated_layer(source.copy(), offset))
        durations.append(max(40, int(frame_config.get("duration", 95))))
    durations.append(650)

    eye_sequence = [open_eyes, *blink_layers, open_eyes]
    if mode == "full":
        rgba_frames = []
        for eyes in eye_sequence:
            composed = body.copy()
            composed.alpha_composite(eyes)
            rgba_frames.append(composed)
    else:
        union_alpha = np.zeros((body.height, body.width), dtype=np.uint8)
        for eyes in eye_sequence:
            union_alpha = np.maximum(
                union_alpha, np.asarray(eyes.getchannel("A"), dtype=np.uint8)
            )
        ys, xs = np.where(union_alpha > 0)
        if not len(xs):
            raise ValueError("La capa ocular está vacía")
        padding = 12
        crop = (
            max(0, int(xs.min()) - padding),
            max(0, int(ys.min()) - padding),
            min(body.width, int(xs.max()) + padding + 1),
            min(body.height, int(ys.max()) + padding + 1),
        )
        rgba_frames = [eyes.crop(crop) for eyes in eye_sequence]

    max_side = max(rgba_frames[0].size)
    if max_side > 960:
        scale = 960 / max_side
        target = (
            max(1, round(rgba_frames[0].width * scale)),
            max(1, round(rgba_frames[0].height * scale)),
        )
        rgba_frames = [
            frame.resize(target, Image.Resampling.LANCZOS) for frame in rgba_frames
        ]
    content = encode_animation(rgba_frames, durations, output_format)
    extension = "png" if output_format == "apng" else output_format
    filename = (
        f"{slug(job_id)}_parpadeo_"
        f"{'completo' if mode == 'full' else 'ojos'}.{extension}"
    )
    return content, filename


def alignment_locations(job_id: str, source_kind: str) -> dict[str, dict[str, Any]]:
    if source_kind not in {"saved", "clean"}:
        raise ValueError("El origen ocular no es válido")
    job = next((entry for entry in editor_jobs() if entry["id"] == job_id), None)
    if not job:
        raise ValueError("Pose desconocida")
    base_path = (ROOT / job["baseSrc"]).resolve()
    if source_kind == "saved":
        pose = load_eye_region_previews().get(job_id)
        if not isinstance(pose, dict):
            raise ValueError("La pose no tiene recortes oculares guardados")
        eyes_path = (ROOT / str(pose["original"])).resolve().parent
    else:
        pose = clean_eye_pose(job_id)
        eyes_path = (ROOT / str(pose["eyesOpen"])).resolve().parent

    targets = {
        "base": base_path,
        "eyes": eyes_path,
        "results": CLEAN_OFFSETS_PATH.resolve(),
    }
    locations: dict[str, dict[str, Any]] = {}
    for kind, target in targets.items():
        try:
            target.relative_to(ROOT)
        except ValueError as error:
            raise ValueError("La ubicación solicitada queda fuera del proyecto") from error
        folder = target if target.is_dir() else target.parent
        locations[kind] = {
            "path": str(target),
            "relative": relative(target),
            "folder": str(folder),
            "exists": target.exists(),
        }
    return locations


def reveal_alignment_location(job_id: str, source_kind: str, kind: str) -> dict[str, Any]:
    locations = alignment_locations(job_id, source_kind)
    if kind not in locations:
        raise ValueError("La ubicación solicitada no es válida")
    location = locations[kind]
    folder = Path(location["folder"])
    if not folder.is_dir():
        raise FileNotFoundError("La carpeta todavía no existe")
    subprocess.Popen(["explorer.exe", str(folder)])
    return {"ok": True, "kind": kind, **location}


class EyeRegionEditorHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args: Any, **kwargs: Any) -> None:
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def log_message(self, format: str, *args: Any) -> None:
        print(f"[eye-editor] {self.address_string()} {format % args}")

    def send_json(self, payload: Any, status: HTTPStatus = HTTPStatus.OK) -> None:
        encoded = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(encoded)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(encoded)

    def do_GET(self) -> None:
        request = urlsplit(self.path)
        if request.path == "/api/alignment-locations":
            try:
                query = parse_qs(request.query)
                self.send_json(
                    {
                        "ok": True,
                        "locations": alignment_locations(
                            str(query.get("id", [""])[0]),
                            str(query.get("source", ["saved"])[0]),
                        ),
                    }
                )
            except (ValueError, FileNotFoundError, KeyError, OSError) as error:
                self.send_json(
                    {"ok": False, "error": str(error)}, HTTPStatus.BAD_REQUEST
                )
            return
        if request.path == "/api/export-gif":
            try:
                query = parse_qs(request.query)
                content, filename = export_blink_gif(
                    str(query.get("id", [""])[0]),
                    str(query.get("mode", ["full"])[0]),
                    str(query.get("source", ["auto"])[0]),
                    str(query.get("format", ["gif"])[0]),
                )
                suffix = Path(filename).suffix.lower()
                content_type = {
                    ".webp": "image/webp",
                    ".png": "image/png",
                    ".gif": "image/gif",
                }.get(suffix, "application/octet-stream")
                self.send_response(HTTPStatus.OK)
                self.send_header("Content-Type", content_type)
                self.send_header(
                    "Content-Disposition", f'attachment; filename="{filename}"'
                )
                self.send_header("Content-Length", str(len(content)))
                self.send_header("Cache-Control", "no-store")
                self.end_headers()
                self.wfile.write(content)
            except (ValueError, FileNotFoundError, KeyError, OSError) as error:
                self.send_json(
                    {"ok": False, "error": str(error)}, HTTPStatus.BAD_REQUEST
                )
            return
        if request.path in {"/tools", "/tools/"}:
            if not TOOLS_MENU_PATH.is_file():
                self.send_error(HTTPStatus.NOT_FOUND, "No existe el centro de herramientas")
                return
            content = TOOLS_MENU_PATH.read_bytes()
            self.send_response(HTTPStatus.OK)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(content)))
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(content)
            return
        if self.path in {"/", "/index.html"}:
            if not EDITOR_PATH.is_file():
                self.send_error(HTTPStatus.NOT_FOUND, "No existe la interfaz")
                return
            content = EDITOR_PATH.read_bytes()
            self.send_response(HTTPStatus.OK)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(content)))
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(content)
            return
        if self.path in {"/preview", "/preview/"}:
            if not PREVIEW_PATH.is_file():
                self.send_error(HTTPStatus.NOT_FOUND, "No existe la previsualización")
                return
            content = PREVIEW_PATH.read_bytes()
            self.send_response(HTTPStatus.OK)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(content)))
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(content)
            return
        if request.path in {"/clean-base", "/clean-base/"}:
            if not CLEANER_PATH.is_file():
                self.send_error(HTTPStatus.NOT_FOUND, "No existe el limpiador de bases")
                return
            content = CLEANER_PATH.read_bytes()
            self.send_response(HTTPStatus.OK)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(content)))
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(content)
            return
        if request.path in {"/white-halo", "/white-halo/"}:
            if not WHITE_HALO_EDITOR_PATH.is_file():
                self.send_error(HTTPStatus.NOT_FOUND, "No existe el editor de halo blanco")
                return
            content = WHITE_HALO_EDITOR_PATH.read_bytes()
            self.send_response(HTTPStatus.OK)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(content)))
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(content)
            return
        if self.path == "/api/jobs":
            # El servidor suele permanecer abierto mientras se mueven o
            # convierten sprites. Reconstruir aquí evita inventarios obsoletos.
            jobs = editor_jobs(refresh=True)
            self.send_json(
                {
                    "jobs": jobs,
                    "saved": sum(1 for job in jobs if job.get("regions")),
                    "total": len(jobs),
                }
            )
            return
        if self.path == "/api/offsets":
            self.send_json({"offsets": load_manual_offsets()})
            return
        if self.path == "/api/clean-offsets":
            self.send_json({"offsets": load_clean_offsets()})
            return
        if self.path == "/api/clean-bases":
            self.send_json({"poses": load_clean_bases()})
            return
        if self.path == "/api/eye-layer-edits":
            self.send_json({"edits": load_pixel_edits()})
            return
        if self.path == "/api/base-sprites":
            jobs = base_sprite_jobs(refresh=True)
            self.send_json(
                {
                    "jobs": jobs,
                    "saved": sum(1 for job in jobs if job.get("saved")),
                    "total": len(jobs),
                }
            )
            return
        super().do_GET()

    def do_POST(self) -> None:
        if self.path == "/api/build-preview":
            try:
                jobs = collect_jobs(manual_only=True)
                metadata = build_layers(jobs, write_characters=False)
                self.send_json({"ok": True, "poses": len(metadata["poses"])})
            except (ValueError, FileNotFoundError, OSError) as error:
                self.send_json(
                    {"ok": False, "error": str(error)}, HTTPStatus.BAD_REQUEST
                )
            return
        if self.path not in {
            "/api/region", "/api/offset", "/api/clean-offset", "/api/clean-base",
            "/api/reveal-path", "/api/eye-layer-edit", "/api/white-halo-clean"
        }:
            self.send_error(HTTPStatus.NOT_FOUND)
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
            payload = json.loads(self.rfile.read(length).decode("utf-8"))
            job_id = str(payload.get("id", ""))
            if self.path == "/api/reveal-path":
                result = reveal_alignment_location(
                    job_id,
                    str(payload.get("source", "saved")),
                    str(payload.get("kind", "")),
                )
                self.send_json(result)
                return
            if self.path == "/api/clean-base":
                result = save_clean_base(
                    job_id,
                    payload.get("image"),
                    bool(payload.get("validateOnly", False)),
                )
                self.send_json(result)
                return
            if self.path == "/api/eye-layer-edit":
                result = save_pixel_edit(
                    job_id,
                    str(payload.get("source", "saved")),
                    str(payload.get("state", "")),
                    payload.get("image"),
                )
                self.send_json(result)
                return
            if self.path == "/api/white-halo-clean":
                result = save_white_halo_sprite(
                    job_id,
                    payload.get("image"),
                    bool(payload.get("validateOnly", False)),
                )
                self.send_json(result)
                return
            valid_ids = {job["id"] for job in editor_jobs()}
            if job_id not in valid_ids:
                raise ValueError("Pose desconocida")
            if self.path == "/api/clean-offset":
                pose_offsets = validate_clean_pose_offsets(payload.get("offsets"))
                offsets = load_clean_offsets()
                if pose_offsets == default_clean_pose_transform():
                    offsets.pop(job_id, None)
                else:
                    offsets[job_id] = pose_offsets
                save_clean_offsets(offsets)
                self.send_json({"ok": True, "offsets": pose_offsets})
                return
            if self.path == "/api/offset":
                offset = validate_manual_offset(payload.get("offset"))
                offsets = load_manual_offsets()
                if offset == [0, 0]:
                    offsets.pop(job_id, None)
                else:
                    offsets[job_id] = offset
                save_manual_offsets(offsets)
                update_layer_metadata_offset(job_id, offset)
                self.send_json({"ok": True, "offset": offset})
                return
            region = validate_manual_regions(
                payload.get("regions", payload.get("region"))
            )
            regions = load_manual_regions()
            if region is None:
                regions.pop(job_id, None)
            else:
                regions[job_id] = region
            save_manual_regions(regions)
            preview = None
            if region is None:
                previews = load_eye_region_previews()
                if previews.pop(job_id, None) is not None:
                    save_eye_region_preview_metadata(previews)
            else:
                preview = save_eye_region_previews(job_id, region)
            self.send_json(
                {
                    "ok": True,
                    "regions": region,
                    "preview": preview,
                    "saved": len(regions),
                    "total": len(valid_ids),
                }
            )
        except (ValueError, OSError, json.JSONDecodeError) as error:
            self.send_json(
                {"ok": False, "error": str(error)}, HTTPStatus.BAD_REQUEST
            )


def serve_editor(port: int) -> None:
    server = ThreadingHTTPServer(("127.0.0.1", port), EyeRegionEditorHandler)
    print(f"Editor de ojos: http://localhost:{port}/")
    print(f"Guardado: {MANUAL_REGIONS_PATH}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


def foreground_box(image: Image.Image) -> tuple[int, int, int, int]:
    alpha = np.asarray(image.getchannel("A"))
    ys, xs = np.where(alpha > 24)
    if not len(xs):
        return (0, 0, image.width, image.height)
    return (int(xs.min()), int(ys.min()), int(xs.max() + 1), int(ys.max() + 1))


def face_candidates(image: Image.Image) -> list[tuple[int, int, int, int]]:
    cascade = cv2.CascadeClassifier(
        cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
    )
    rgba = np.asarray(image)
    gray = cv2.cvtColor(rgba[:, :, :3], cv2.COLOR_RGB2GRAY)
    detections = cascade.detectMultiScale(
        gray, scaleFactor=1.08, minNeighbors=3, minSize=(30, 30)
    )
    return [(int(x), int(y), int(w), int(h)) for x, y, w, h in detections]


def choose_face(
    image: Image.Image, candidates: list[tuple[int, int, int, int]]
) -> tuple[int, int, int, int] | None:
    if not candidates:
        return None
    fx1, fy1, fx2, fy2 = foreground_box(image)
    fw, fh = max(1, fx2 - fx1), max(1, fy2 - fy1)
    viable: list[tuple[float, tuple[int, int, int, int]]] = []
    for x, y, w, h in candidates:
        cx, cy = x + w / 2, y + h / 2
        if not (fx1 <= cx <= fx2 and fy1 <= cy <= fy1 + fh * 0.62):
            continue
        relative_area = (w * h) / (fw * fh)
        if relative_area < 0.004 or relative_area > 0.52:
            continue
        target_y = fy1 + fh * 0.22
        vertical_penalty = abs(cy - target_y) / fh
        score = math.log1p(w * h) - vertical_penalty * 2.4
        viable.append((score, (x, y, w, h)))
    if not viable:
        return None
    return max(viable, key=lambda item: item[0])[1]


def eye_region_from_face(
    face: tuple[int, int, int, int], size: tuple[int, int]
) -> tuple[int, int, int, int]:
    x, y, w, h = face
    x1 = x + round(w * 0.03)
    x2 = x + round(w * 0.97)
    y1 = y + round(h * 0.18)
    y2 = y + round(h * 0.61)
    return clamp_box((x1, y1, x2, y2), size)


def fallback_eye_region(image: Image.Image) -> tuple[int, int, int, int]:
    x1, y1, x2, y2 = foreground_box(image)
    w, h = x2 - x1, y2 - y1
    return clamp_box(
        (
            x1 + round(w * 0.18),
            y1 + round(h * 0.08),
            x1 + round(w * 0.82),
            y1 + round(h * 0.32),
        ),
        image.size,
    )


def difference_eye_region(
    base: Image.Image, frame: Image.Image
) -> tuple[int, int, int, int]:
    """Busca la banda con mayor cambio dentro del tercio superior del sujeto."""
    x1, y1, x2, y2 = foreground_box(base)
    fw, fh = max(1, x2 - x1), max(1, y2 - y1)
    search_x1 = x1
    search_x2 = x2
    search_y1 = y1 + round(fh * 0.035)
    search_y2 = y1 + round(fh * 0.40)

    base_values = np.asarray(base, dtype=np.int16)
    frame_values = np.asarray(frame, dtype=np.int16)
    color_delta = np.mean(
        np.abs(base_values[:, :, :3] - frame_values[:, :, :3]), axis=2
    ).astype(np.float32)
    visible = (
        (base_values[:, :, 3] > 24) | (frame_values[:, :, 3] > 24)
    ).astype(np.float32)
    heat = color_delta * visible
    heat = cv2.GaussianBlur(heat, (0, 0), sigmaX=max(2.0, fw * 0.012))

    window_w = max(28, min(round(fw * 0.48), search_x2 - search_x1))
    window_h = max(
        18,
        min(round(fh * 0.13), round(window_w * 0.34), search_y2 - search_y1),
    )
    scores = cv2.boxFilter(
        heat, ddepth=-1, ksize=(window_w, window_h), normalize=False
    )
    valid = scores[search_y1:search_y2, search_x1:search_x2]
    if not valid.size or not np.isfinite(valid).any():
        return fallback_eye_region(base)
    local_y, local_x = np.unravel_index(np.argmax(valid), valid.shape)
    center_x = search_x1 + int(local_x)
    center_y = search_y1 + int(local_y)
    return clamp_box(
        (
            center_x - window_w // 2,
            center_y - window_h // 2,
            center_x + math.ceil(window_w / 2),
            center_y + math.ceil(window_h / 2),
        ),
        base.size,
    )


def clamp_box(
    box: tuple[int, int, int, int], size: tuple[int, int]
) -> tuple[int, int, int, int]:
    x1, y1, x2, y2 = box
    width, height = size
    x1 = max(0, min(width - 2, x1))
    y1 = max(0, min(height - 2, y1))
    x2 = max(x1 + 2, min(width, x2))
    y2 = max(y1 + 2, min(height, y2))
    return (x1, y1, x2, y2)


def normalized_box(
    box: tuple[int, int, int, int], size: tuple[int, int]
) -> list[float]:
    width, height = size
    return [round(box[0] / width, 6), round(box[1] / height, 6),
            round(box[2] / width, 6), round(box[3] / height, 6)]


def denormalize_box(
    box: tuple[float, float, float, float], size: tuple[int, int]
) -> tuple[int, int, int, int]:
    width, height = size
    return clamp_box(
        (round(box[0] * width), round(box[1] * height),
         round(box[2] * width), round(box[3] * height)),
        size,
    )


def determine_region(
    character_key: str,
    pose_key: str,
    base: Image.Image,
    first_frame: Image.Image,
) -> tuple[tuple[int, int, int, int], str]:
    override = REGION_OVERRIDES.get(f"{character_key}.{pose_key}")
    if override:
        return denormalize_box(override, base.size), "override"

    return difference_eye_region(base, first_frame), "difference"


def collect_jobs(
    require_manual: bool = False, manual_only: bool = False
) -> list[PoseJob]:
    manual_regions = load_manual_regions()
    missing_manual: list[str] = []
    jobs: list[PoseJob] = []
    for character_path in sorted(CHARACTER_DIR.glob("*.json")):
        character_key = character_path.stem.lower()
        if character_key in LEGACY_CHARACTER_KEYS:
            continue
        character = json.loads(character_path.read_text(encoding="utf-8"))
        poses = character.get("poses") or {}
        animations = character.get("animations") or character.get("poseAnimations") or {}
        for pose_key, base_source in poses.items():
            config = animations.get(pose_key)
            frames = animation_frames(config)
            if not isinstance(base_source, str) or not frames:
                continue
            if Path(base_source).suffix.lower() not in SUPPORTED_IMAGES:
                continue
            base_source = resolve_asset_reference(base_source)
            if not base_source:
                if require_manual:
                    missing_manual.append(f"{character_key}.{pose_key} (base ausente)")
                continue
            frame_sources = [
                source for source in
                (resolve_frame_source(character, frame) for frame in frames)
                if source and Path(source).suffix.lower() in SUPPORTED_IMAGES
            ]
            if not frame_sources:
                continue
            job_id = f"{character_key}.{pose_key}"
            manual_region = manual_regions.get(job_id)
            if manual_only and manual_region is None:
                continue
            base_path = ROOT / base_source
            first_frame_path = ROOT / frame_sources[0]
            if not base_path.is_file() or not first_frame_path.is_file():
                raise FileNotFoundError(
                    f"Faltan fuentes para {character_key}.{pose_key}"
                )
            with Image.open(base_path).convert("RGBA") as base, Image.open(
                first_frame_path
            ).convert("RGBA") as first_frame:
                if base.size != first_frame.size:
                    raise ValueError(
                        f"Dimensiones distintas en {character_key}.{pose_key}: "
                        f"{base.size} != {first_frame.size}"
                    )
                if manual_region is not None:
                    validated = validate_manual_regions(manual_region)
                    assert validated is not None
                    region = validated
                    method = "manual"
                elif require_manual:
                    missing_manual.append(job_id)
                    continue
                else:
                    detected, method = determine_region(
                        character_key, pose_key, base, first_frame
                    )
                    region = rectangle_to_eye_regions(normalized_box(detected, base.size))
            jobs.append(
                PoseJob(
                    character_key=character_key,
                    character_path=character_path,
                    character=character,
                    pose_key=pose_key,
                    base_source=base_source.replace("\\", "/"),
                    animation=config,
                    frame_sources=frame_sources,
                    region=region,
                    region_method=method,
                )
            )
    if missing_manual:
        preview = ", ".join(missing_manual[:8])
        suffix = "..." if len(missing_manual) > 8 else ""
        raise ValueError(
            f"Faltan {len(missing_manual)} regiones oculares manuales: {preview}{suffix}. "
            "Complétalas en el editor antes de generar las capas."
        )
    return jobs


def eye_region_polygon(
    shape: dict[str, float], size: tuple[int, int], steps: int = 96
) -> list[tuple[float, float]]:
    cx = shape["cx"] * size[0]
    cy = shape["cy"] * size[1]
    rx = shape["rx"] * size[0]
    ry = shape["ry"] * size[1]
    angle = math.radians(shape["rotation"])
    points = []
    for step in range(steps):
        theta = math.tau * step / steps
        local_x = rx * math.cos(theta)
        local_y = ry * math.sin(theta)
        points.append(
            (
                cx + local_x * math.cos(angle) - local_y * math.sin(angle),
                cy + local_x * math.sin(angle) + local_y * math.cos(angle),
            )
        )
    return points


def eye_masks(
    size: tuple[int, int], regions: list[dict[str, float]]
) -> tuple[Image.Image, Image.Image]:
    """Devuelve la abertura opaca del cuerpo y la mezcla suave del parpadeo.

    Las regiones ``include`` incorporan píxeles del fotograma animado. Las
    ``exclude`` protegen pelo, cejas u otros detalles que deben permanecer en
    el sprite base. El feather se aplica hacia el interior de cada elipse para
    no extender el recorte fuera de la selección manual.
    """
    supersample = 4
    scaled_size = (size[0] * supersample, size[1] * supersample)

    def hard_shape_mask(shape: dict[str, float]) -> np.ndarray:
        canvas = Image.new("L", scaled_size, 0)
        ImageDraw.Draw(canvas).polygon(
            eye_region_polygon(shape, scaled_size), fill=255
        )
        resized = canvas.resize(size, Image.Resampling.LANCZOS)
        return np.where(np.asarray(resized) >= 128, 255, 0).astype(np.uint8)

    def feathered_inside(mask: np.ndarray, feather: float) -> np.ndarray:
        if feather <= 0:
            return mask.astype(np.float32) / 255.0
        distance = cv2.distanceTransform(mask, cv2.DIST_L2, 5)
        return np.clip((distance - 0.5) / feather, 0.0, 1.0)

    include_blend = np.zeros((size[1], size[0]), dtype=np.float32)
    exclude_strength = np.zeros_like(include_blend)
    for shape in regions:
        hard = hard_shape_mask(shape)
        strength = feathered_inside(hard, float(shape.get("feather", 0.0)))
        if shape.get("mode", "include") == "exclude":
            exclude_strength = np.maximum(exclude_strength, strength)
        else:
            include_blend = np.maximum(include_blend, strength)

    blend_values = np.clip(
        include_blend * (1.0 - exclude_strength) * 255.0, 0, 255
    ).astype(np.uint8)
    # Sólo se abre un hueco completo en el cuerpo donde la capa ocular es
    # plenamente opaca. En el borde suavizado queda el cuerpo original detrás.
    core_values = np.where(blend_values >= 254, 255, 0).astype(np.uint8)
    return Image.fromarray(core_values, "L"), Image.fromarray(blend_values, "L")


def eye_region_preview_mask(
    size: tuple[int, int], regions: list[dict[str, float]]
) -> Image.Image:
    """Crea una máscara de cobertura limpia para los recortes del marcador.

    El supersampling mantiene el borde suave y la reducción por área evita
    coronas de alfa fuera de la selección.
    """
    supersample = 4
    scaled_size = (size[0] * supersample, size[1] * supersample)

    def combined(mode: str) -> np.ndarray:
        values = np.zeros((size[1], size[0]), dtype=np.uint8)
        for shape in regions:
            if shape.get("mode", "include") != mode:
                continue
            canvas = Image.new("L", scaled_size, 0)
            ImageDraw.Draw(canvas).polygon(
                eye_region_polygon(shape, scaled_size), fill=255
            )
            # BOX downsamples the supersampled coverage without the ringing
            # produced by LANCZOS outside a hard selection edge.
            resized = np.asarray(
                canvas.resize(size, Image.Resampling.BOX), dtype=np.uint8
            ).copy()
            resized[resized < 8] = 0
            resized[resized > 247] = 255
            values = np.maximum(values, resized)
        return values

    include = combined("include").astype(np.float32) / 255.0
    exclude = combined("exclude").astype(np.float32) / 255.0
    alpha = np.clip(include * (1.0 - exclude) * 255.0, 0, 255).astype(np.uint8)
    alpha[alpha < 8] = 0
    alpha[alpha > 247] = 255
    return Image.fromarray(alpha, "L")


def save_eye_region_previews(
    job_id: str, regions: list[dict[str, float]]
) -> dict[str, Any]:
    """Guarda el recorte original y los parpadeos en un lienzo idéntico.

    El fotograma animado se normaliza primero al tamaño de la pose base. Después
    todas las variantes usan exactamente la misma máscara y el mismo rectángulo
    de recorte, por lo que sus PNG tienen idéntica resolución y coordenadas.
    """
    job = next((entry for entry in editor_jobs() if entry["id"] == job_id), None)
    if not job:
        raise ValueError("Pose desconocida")

    with Image.open(ROOT / job["baseSrc"]).convert("RGBA") as source:
        base = source.copy()
    mask = eye_region_preview_mask(base.size, regions)
    mask_values = np.asarray(mask, dtype=np.uint8)
    ys, xs = np.where(mask_values > 0)
    if not len(xs):
        raise ValueError("La selección ocular no contiene píxeles")
    padding = max(8, round(max(base.size) * 0.008))
    crop = (
        max(0, int(xs.min()) - padding),
        max(0, int(ys.min()) - padding),
        min(base.width, int(xs.max()) + padding + 1),
        min(base.height, int(ys.max()) + padding + 1),
    )

    character, pose_name = job_id.split(".", 1)
    output_dir = EYE_REGION_PREVIEW_ROOT / character / slug(pose_name)
    output_dir.mkdir(parents=True, exist_ok=True)

    def save_variant(image: Image.Image, filename: str) -> str:
        if image.size != base.size:
            image = image.resize(base.size, Image.Resampling.LANCZOS)
        layer = layer_from_pixels(image, mask).crop(crop)
        output_path = output_dir / filename
        temporary = output_path.with_suffix(".png.tmp")
        layer.save(temporary, "PNG", optimize=True)
        temporary.replace(output_path)
        return relative(output_path)

    original_path = save_variant(base, "eyes_original.png")
    half_path = None
    if job.get("halfSrc"):
        with Image.open(ROOT / job["halfSrc"]).convert("RGBA") as source:
            half_path = save_variant(source.copy(), "eyes_half.png")
    blink_paths: list[str] = []
    closed_path = None
    for index, frame_source in enumerate(job["frameSrcs"]):
        with Image.open(ROOT / frame_source).convert("RGBA") as source:
            saved_path = save_variant(
                source.copy(), f"eyes_blink_{index + 1:02d}.png"
            )
            blink_paths.append(saved_path)
            if closed_path is None and "blink_half" not in Path(frame_source).stem.lower():
                closed_path = saved_path
    if closed_path is None and blink_paths:
        closed_path = blink_paths[-1]

    entry = {
        "sourceBase": job["baseSrc"],
        "sourceFrames": job["frameSrcs"],
        "sourceHalf": job.get("halfSrc"),
        "original": original_path,
        "half": half_path,
        "closed": closed_path,
        "blinks": blink_paths,
        "regions": regions,
        "width": crop[2] - crop[0],
        "height": crop[3] - crop[1],
        "crop": {
            "x": crop[0],
            "y": crop[1],
            "width": crop[2] - crop[0],
            "height": crop[3] - crop[1],
        },
        "sourceCanvas": {"width": base.width, "height": base.height},
        "updatedAt": datetime.now(timezone.utc).isoformat(),
    }
    previews = load_eye_region_previews()
    previews[job_id] = entry
    save_eye_region_preview_metadata(previews)
    return entry


def layer_from_pixels(
    pixels: Image.Image, outer_mask: Image.Image
) -> Image.Image:
    result = Image.new("RGBA", pixels.size, (0, 0, 0, 0))
    alpha = np.minimum(
        np.asarray(pixels.getchannel("A"), dtype=np.uint8),
        np.asarray(outer_mask, dtype=np.uint8),
    )
    patch = pixels.copy()
    patch.putalpha(Image.fromarray(alpha, "L"))
    result.alpha_composite(patch)
    return result


def color_matched_frame(
    base: Image.Image,
    frame: Image.Image,
    blend_mask: Image.Image,
) -> Image.Image:
    base_rgb = np.asarray(base.convert("RGB"), dtype=np.float32)
    frame_rgb = np.asarray(frame.convert("RGB"), dtype=np.float32)
    blend = np.asarray(blend_mask)
    base_alpha = np.asarray(base.getchannel("A"))
    frame_alpha = np.asarray(frame.getchannel("A"))
    selected = np.where(blend > 0, 255, 0).astype(np.uint8)
    eroded = cv2.erode(selected, np.ones((5, 5), np.uint8), iterations=1)
    ring = (
        (selected > 0)
        & (eroded == 0)
        & (base_alpha > 220)
        & (frame_alpha > 220)
    )
    if ring.any():
        offset = np.median(base_rgb[ring] - frame_rgb[ring], axis=0)
        frame_rgb = np.clip(frame_rgb + offset, 0, 255)
    adjusted = Image.fromarray(frame_rgb.astype(np.uint8), "RGB").convert("RGBA")
    adjusted.putalpha(frame.getchannel("A"))
    return adjusted


def save_webp(image: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    descriptor, temporary_name = tempfile.mkstemp(
        prefix=f".{path.stem}-", suffix=".webp", dir=path.parent
    )
    os.close(descriptor)
    temporary = Path(temporary_name)
    try:
        pixels = np.asarray(image.convert("RGBA"), dtype=np.uint8).copy()
        pixels[pixels[:, :, 3] == 0, :3] = 0
        Image.fromarray(pixels, "RGBA").save(
            temporary, "WEBP", lossless=True, method=6, exact=True
        )
        for attempt in range(6):
            try:
                os.replace(temporary, path)
                break
            except OSError:
                if attempt == 5:
                    raise
                time.sleep(0.05 * (attempt + 1))
    finally:
        temporary.unlink(missing_ok=True)


def variant_name(source: str, index: int) -> str:
    stem = Path(source).stem.lower()
    for name in ("half", "closed", "open"):
        if re.search(rf"(?:_|-)blink(?:_|-){name}$", stem):
            return name
    return f"frame_{index + 1:02d}"


def build_layers(jobs: list[PoseJob], write_characters: bool) -> dict[str, Any]:
    metadata: dict[str, Any] = {"version": 1, "poses": {}}
    manual_offsets = load_manual_offsets()
    updated_characters: dict[Path, dict[str, Any]] = {}
    body_cache: dict[tuple[str, tuple[float, ...]], dict[str, str]] = {}
    frame_cache: dict[tuple[str, str, tuple[float, ...]], str] = {}

    for job in jobs:
        base_path = ROOT / job.base_source
        with Image.open(base_path).convert("RGBA") as base:
            core_mask, blend_mask = eye_masks(base.size, job.region)
            region_key = eye_regions_cache_key(job.region)
            cache_key = (job.base_source, region_key)
            # La pose forma parte de la ruta: varias expresiones pueden reutilizar
            # el mismo sprite base pero haber sido marcadas con regiones distintas.
            output_dir = LAYER_ROOT / job.character_key / slug(job.pose_key)
            if cache_key not in body_cache:
                body = base.copy()
                body_alpha = np.asarray(body.getchannel("A"), dtype=np.uint8).copy()
                body_alpha[np.asarray(core_mask) > 0] = 0
                body.putalpha(Image.fromarray(body_alpha, "L"))
                open_layer = layer_from_pixels(base, core_mask)
                body_path = output_dir / "body.webp"
                open_path = output_dir / "eyes_base.webp"
                save_webp(body, body_path)
                save_webp(open_layer, open_path)
                body_cache[cache_key] = {
                    "body": relative(body_path),
                    "eyesOpen": relative(open_path),
                }
            layer_config = dict(body_cache[cache_key])

            original_frames = animation_frames(job.animation)
            migrated_frames: list[dict[str, Any]] = []
            for index, (frame_config, source) in enumerate(
                zip(original_frames, job.frame_sources)
            ):
                frame_key = (job.base_source, source, region_key)
                if frame_key not in frame_cache:
                    with Image.open(ROOT / source).convert("RGBA") as frame:
                        if frame.size != base.size:
                            raise ValueError(
                                f"Dimensiones distintas en {job.character_key}.{job.pose_key}"
                            )
                        composed = color_matched_frame(base, frame, blend_mask)
                        eye_layer = layer_from_pixels(composed, blend_mask)
                    name = variant_name(source, index)
                    frame_path = output_dir / f"eyes_{name}.webp"
                    save_webp(eye_layer, frame_path)
                    frame_cache[frame_key] = relative(frame_path)
                duration = 85
                if isinstance(frame_config, dict):
                    try:
                        duration = max(40, int(frame_config.get("duration", 85)))
                    except (TypeError, ValueError):
                        duration = 85
                migrated_frames.append(
                    {
                        "src": frame_cache[frame_key],
                        "duration": duration,
                        "layer": "eyes",
                    }
                )

        key = f"{job.character_key}.{job.pose_key}"
        region_bounds = eye_regions_bounds(job.region, base.size)
        metadata["poses"][key] = {
            "source": job.base_source,
            "regions": job.region,
            "region": normalized_box(region_bounds, base.size),
            "regionPixels": list(region_bounds),
            "regionMethod": job.region_method,
            "offset": manual_offsets.get(key, [0, 0]),
            **layer_config,
            "frames": migrated_frames,
            "originalFrames": job.frame_sources,
        }

        character = updated_characters.setdefault(
            job.character_path,
            json.loads(job.character_path.read_text(encoding="utf-8")),
        )
        character.setdefault("poseLayers", {})[job.pose_key] = layer_config
        old_animation = character.get("animations", {}).get(job.pose_key)
        if isinstance(old_animation, list):
            character["animations"][job.pose_key] = migrated_frames
        elif isinstance(old_animation, dict):
            character["animations"][job.pose_key]["frames"] = migrated_frames

    METADATA_PATH.parent.mkdir(parents=True, exist_ok=True)
    METADATA_PATH.write_text(
        json.dumps(metadata, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    if write_characters:
        for path, character in updated_characters.items():
            path.write_text(
                json.dumps(character, ensure_ascii=False, indent=2) + "\n",
                encoding="utf-8",
            )
    return metadata


def qa_tile(job: PoseJob, width: int = 500, height: int = 330) -> Image.Image:
    with Image.open(ROOT / job.base_source).convert("RGBA") as base, Image.open(
        ROOT / job.frame_sources[0]
    ).convert("RGBA") as frame:
        previews = []
        for source in (base, frame):
            preview = source.copy()
            draw = ImageDraw.Draw(preview)
            line_width = max(3, source.width // 250)
            for shape in job.region:
                points = eye_region_polygon(shape, source.size)
                draw.line(points + [points[0]], fill=(255, 210, 75, 255), width=line_width)
            preview.thumbnail((width // 2 - 16, height - 54), Image.Resampling.LANCZOS)
            previews.append(preview)

    tile = Image.new("RGB", (width, height), (10, 8, 28))
    for index, preview in enumerate(previews):
        x = index * width // 2 + (width // 2 - preview.width) // 2
        y = 42 + (height - 48 - preview.height) // 2
        tile.paste(preview.convert("RGB"), (x, y))
    draw = ImageDraw.Draw(tile)
    draw.text((12, 10), f"{job.character_key}.{job.pose_key}  [{job.region_method}]", fill=(255, 255, 255))
    return tile


def write_qa_sheets(jobs: list[PoseJob], qa_dir: Path) -> None:
    qa_dir.mkdir(parents=True, exist_ok=True)
    per_sheet = 8
    for sheet_index in range(0, len(jobs), per_sheet):
        group = jobs[sheet_index:sheet_index + per_sheet]
        sheet = Image.new("RGB", (1000, 1320), (4, 3, 14))
        for index, job in enumerate(group):
            tile = qa_tile(job)
            sheet.paste(tile, ((index % 2) * 500, (index // 2) * 330))
        sheet.save(qa_dir / f"eye_regions_{sheet_index // per_sheet + 1:02d}.jpg", quality=90)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--qa-dir", type=Path, help="Genera hojas de revisión de regiones")
    parser.add_argument("--build", action="store_true", help="Genera las capas finales")
    parser.add_argument(
        "--build-manual",
        action="store_true",
        help="Genera una prueba solo con las regiones manuales ya guardadas",
    )
    parser.add_argument(
        "--build-previews",
        action="store_true",
        help="Guarda recortes oculares PNG de igual resolución para cada pose marcada",
    )
    parser.add_argument("--serve", action="store_true", help="Abre el editor manual local")
    parser.add_argument("--port", type=int, default=8011, help="Puerto del editor manual")
    parser.add_argument(
        "--write-characters",
        action="store_true",
        help="Actualiza poseLayers y las referencias de frames en characters/*.json",
    )
    args = parser.parse_args()
    if args.serve:
        serve_editor(args.port)
        return
    jobs: list[PoseJob] = []
    if args.qa_dir or args.build or args.build_manual:
        jobs = collect_jobs(
            require_manual=args.build,
            manual_only=args.build_manual and not args.build,
        )
    if args.build_previews:
        manual_regions = load_manual_regions()
        preview_count = 0
        for job_id, value in sorted(manual_regions.items()):
            regions = validate_manual_regions(value)
            if regions:
                save_eye_region_previews(job_id, regions)
                preview_count += 1
        print(
            f"Previews oculares: {preview_count} poses -> {EYE_REGION_PREVIEW_ROOT}"
        )
    if args.qa_dir:
        write_qa_sheets(jobs, args.qa_dir.resolve())
        print(f"QA: {len(jobs)} poses -> {args.qa_dir.resolve()}")
    if args.build or args.build_manual:
        metadata = build_layers(jobs, args.write_characters and args.build)
        print(f"Capas: {len(metadata['poses'])} poses -> {LAYER_ROOT}")
    if not args.qa_dir and not args.build and not args.build_manual and not args.build_previews:
        parser.error(
            "indica --serve, --qa-dir, --build-previews, --build-manual y/o --build"
        )


if __name__ == "__main__":
    main()
