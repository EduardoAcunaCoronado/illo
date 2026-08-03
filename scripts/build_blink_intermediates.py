#!/usr/bin/env python3
"""Register and normalize the intermediate frame of every blink pose.

The generated source is deliberately treated only as eye artwork.  Its RGB is
resized to the exact sprite canvas while the alpha channel always comes from
the original pose, so no generated background can leak into the project.
"""

from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import cv2
import numpy as np
from PIL import Image

from build_character_eye_layers import (
    ROOT,
    editor_jobs,
    eye_region_preview_mask,
    load_manual_regions,
)


MANIFEST_PATH = ROOT / "assets/metadata/blink_eye_intermediates.json"
OUTPUT_ROOT = ROOT / "assets/images/characters/eye_intermediate_sources"


def relative(path: Path) -> str:
    return path.resolve().relative_to(ROOT).as_posix()


def load_manifest() -> dict[str, Any]:
    if not MANIFEST_PATH.is_file():
        return {"version": 1, "poses": {}}
    payload = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    payload.setdefault("version", 1)
    payload.setdefault("poses", {})
    return payload


def save_manifest(payload: dict[str, Any]) -> None:
    MANIFEST_PATH.parent.mkdir(parents=True, exist_ok=True)
    payload["updatedAt"] = datetime.now(timezone.utc).isoformat()
    temporary = MANIFEST_PATH.with_suffix(".json.tmp")
    temporary.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    temporary.replace(MANIFEST_PATH)


def first_source(job: dict[str, Any]) -> str:
    frames = job.get("frameSrcs") or []
    if isinstance(frames, str):
        return frames
    if not frames:
        raise ValueError(f"{job['id']} no tiene fotograma de parpadeo")
    return str(frames[0])


def direction_for(target: str) -> str:
    return "opening" if "blink_open" in Path(target).stem.lower() else "closing"


def initialize() -> None:
    manifest = load_manifest()
    poses = manifest["poses"]
    for job in editor_jobs():
        frames = job.get("frameSrcs") or []
        if isinstance(frames, str):
            frames = [frames]
        target = first_source(job)
        existing_half = next(
            (source for source in frames if "blink_half" in Path(source).stem.lower()),
            None,
        )
        previous = poses.get(job["id"], {})
        entry = {
            "base": job["baseSrc"],
            "target": target,
            "direction": direction_for(target),
            "canvas": {"width": job["width"], "height": job["height"]},
            "status": "existing" if existing_half else previous.get("status", "pending"),
        }
        if existing_half:
            entry["half"] = existing_half
            entry["method"] = "existing-frame"
        elif previous.get("half") and (ROOT / previous["half"]).is_file():
            entry["half"] = previous["half"]
            entry["method"] = previous.get("method", "imagegen-eye-source")
            entry["status"] = "generated"
        poses[job["id"]] = entry
    save_manifest(manifest)


def matching_jobs(pose_ids: list[str]) -> list[dict[str, Any]]:
    by_id = {job["id"]: job for job in editor_jobs()}
    missing = [pose_id for pose_id in pose_ids if pose_id not in by_id]
    if missing:
        raise KeyError(f"Poses desconocidas: {', '.join(missing)}")
    jobs = [by_id[pose_id] for pose_id in pose_ids]
    pairs = {(job["baseSrc"], first_source(job)) for job in jobs}
    if len(pairs) != 1:
        raise ValueError("Las poses agrupadas no comparten base y objetivo")
    return jobs


def register_generated(pose_ids: list[str], generated_path: Path) -> Path:
    jobs = matching_jobs(pose_ids)
    primary = jobs[0]
    base_path = ROOT / primary["baseSrc"]
    if not generated_path.is_file():
        raise FileNotFoundError(generated_path)

    with Image.open(base_path) as source_image:
        base = source_image.convert("RGBA")
    with Image.open(generated_path) as generated_image:
        generated = generated_image.convert("RGB").resize(
            base.size, Image.Resampling.LANCZOS
        )

    normalized = generated.convert("RGBA")
    normalized.putalpha(base.getchannel("A"))
    normalized = clear_invisible_rgb(normalized)
    character, pose = primary["id"].split(".", 1)
    output_path = OUTPUT_ROOT / character / pose / "eyes_half_source.webp"
    output_path.parent.mkdir(parents=True, exist_ok=True)
    normalized.save(output_path, "WEBP", lossless=True, method=6, exact=True)

    manifest = load_manifest()
    for job in jobs:
        manifest["poses"][job["id"]] = {
            "base": job["baseSrc"],
            "target": first_source(job),
            "half": relative(output_path),
            "direction": direction_for(first_source(job)),
            "canvas": {"width": job["width"], "height": job["height"]},
            "status": "generated",
            "method": "imagegen-eye-source",
        }
    save_manifest(manifest)
    return output_path


def automatic_eye_mask(base: Image.Image, target: Image.Image) -> Image.Image:
    first = np.asarray(base.convert("RGBA"), dtype=np.float32)
    second = np.asarray(target.convert("RGBA"), dtype=np.float32)
    first_visible = first[:, :, :3] * (first[:, :, 3:4] / 255.0)
    second_visible = second[:, :, :3] * (second[:, :, 3:4] / 255.0)
    delta = np.maximum(
        np.max(np.abs(first_visible - second_visible), axis=2),
        np.abs(first[:, :, 3] - second[:, :, 3]),
    )
    binary = np.uint8(delta > 12)
    count, labels, stats, centroids = cv2.connectedComponentsWithStats(binary, 8)
    if count <= 1:
        raise ValueError("No se detectó variación ocular entre base y parpadeo")
    candidates = sorted(range(1, count), key=lambda index: stats[index, 4], reverse=True)
    largest = int(stats[candidates[0], 4])
    kept = [
        index
        for index in candidates
        if stats[index, 4] >= max(8, largest * 0.055)
        and centroids[index, 1] < base.height * 0.67
    ][:8]
    selected = np.isin(labels, kept).astype(np.uint8) * 255
    kernel_size = max(7, round(min(base.size) * 0.014))
    if kernel_size % 2 == 0:
        kernel_size += 1
    kernel = np.ones((kernel_size, kernel_size), dtype=np.uint8)
    selected = cv2.morphologyEx(selected, cv2.MORPH_CLOSE, kernel)
    selected = cv2.dilate(selected, kernel, iterations=1)
    selected = cv2.GaussianBlur(selected, (0, 0), max(1.2, kernel_size / 5))
    return Image.fromarray(selected, "L")


def clear_invisible_rgb(image: Image.Image) -> Image.Image:
    """Normaliza el color oculto para que el WebP transparente no cargue ruido inútil."""
    pixels = np.asarray(image.convert("RGBA"), dtype=np.uint8).copy()
    pixels[pixels[:, :, 3] == 0, :3] = 0
    return Image.fromarray(pixels, "RGBA")


def sanitize_registered_sources() -> int:
    manifest = load_manifest()
    jobs = {job["id"]: job for job in editor_jobs()}
    regions = load_manual_regions()
    handled: set[str] = set()
    changed = 0
    for pose_id, entry in manifest.get("poses", {}).items():
        half_source = entry.get("half")
        if not half_source or entry.get("status") != "generated" or half_source in handled:
            continue
        handled.add(half_source)
        job = jobs[pose_id]
        base_path = ROOT / job["baseSrc"]
        target_path = ROOT / first_source(job)
        output_path = ROOT / half_source
        with Image.open(base_path) as image:
            base = image.convert("RGBA")
        with Image.open(target_path) as image:
            target = image.convert("RGBA")
        with Image.open(output_path) as image:
            generated = image.convert("RGBA")
        manual = regions.get(pose_id)
        mask = (
            eye_region_preview_mask(base.size, manual)
            if manual
            else automatic_eye_mask(base, target)
        )
        composed = Image.composite(generated, base, mask)
        composed.putalpha(base.getchannel("A"))
        composed = clear_invisible_rgb(composed)
        temporary = output_path.with_suffix(output_path.suffix + ".tmp")
        composed.save(temporary, "WEBP", lossless=True, method=6, exact=True)
        temporary.replace(output_path)
        changed += 1
    for entry in manifest.get("poses", {}).values():
        if entry.get("status") == "generated":
            entry["method"] = "imagegen-eye-region-composite"
    save_manifest(manifest)
    return changed


def queue() -> list[dict[str, Any]]:
    initialize()
    manifest = load_manifest()
    grouped: dict[tuple[str, str], dict[str, Any]] = {}
    for job in editor_jobs():
        entry = manifest["poses"].get(job["id"], {})
        if entry.get("status") in {"existing", "generated"} and entry.get("half"):
            continue
        target = first_source(job)
        key = (job["baseSrc"], target)
        group = grouped.setdefault(
            key,
            {
                "poseIds": [],
                "base": job["baseSrc"],
                "target": target,
                "direction": direction_for(target),
            },
        )
        group["poseIds"].append(job["id"])
    return list(grouped.values())


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--init", action="store_true")
    parser.add_argument("--queue", action="store_true")
    parser.add_argument("--sanitize-all", action="store_true")
    parser.add_argument("--register", type=Path)
    parser.add_argument("--pose", action="append", default=[])
    args = parser.parse_args()

    if args.init:
        initialize()
    if args.register:
        if not args.pose:
            parser.error("--register necesita al menos un --pose")
        print(register_generated(args.pose, args.register).resolve())
    if args.queue:
        print(json.dumps(queue(), ensure_ascii=False, indent=2))
    if args.sanitize_all:
        print(f"Sanitized: {sanitize_registered_sources()}")
    if not (args.init or args.register or args.queue or args.sanitize_all):
        parser.error("Indica --init, --queue o --register")


if __name__ == "__main__":
    main()
