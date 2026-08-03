#!/usr/bin/env python3
"""Build exact-pixel eye-only layers from original and blink sprites.

No eye artwork is generated, moved, rotated or rescaled. The manually marked
ellipses only limit the working area; a difference matte between the two
perfectly aligned source sprites removes unchanged face, hair and accessories.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
REGIONS_PATH = ROOT / "assets/metadata/blink_eye_regions_manual.json"
SOURCE_MANIFEST_PATH = ROOT / "assets/metadata/blink_eye_layers.json"
OUTPUT_MANIFEST_PATH = ROOT / "assets/metadata/blink_eye_layers_clean.json"
OUTPUT_ROOT = ROOT / "assets/images/characters/eye_layers_clean"
INTERMEDIATE_MANIFEST_PATH = ROOT / "assets/metadata/blink_eye_intermediates.json"


def load_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def save_json(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def save_webp_atomic(image: Image.Image, path: Path) -> None:
    temporary = path.with_suffix(path.suffix + ".tmp")
    pixels = np.asarray(image.convert("RGBA"), dtype=np.uint8).copy()
    pixels[pixels[:, :, 3] == 0, :3] = 0
    Image.fromarray(pixels, "RGBA").save(
        temporary, "WEBP", lossless=True, method=6, exact=True
    )
    temporary.replace(path)


def rel(path: Path) -> str:
    return path.relative_to(ROOT).as_posix()


def ellipse_mask(size: tuple[int, int], regions: list[dict]) -> Image.Image:
    width, height = size
    yy, xx = np.mgrid[0:height, 0:width]
    combined = np.zeros((height, width), dtype=np.float32)
    for region in regions:
        cx = float(region["cx"]) * width
        cy = float(region["cy"]) * height
        rx = max(1.0, float(region["rx"]) * width)
        ry = max(1.0, float(region["ry"]) * height)
        angle = np.deg2rad(float(region.get("rotation", 0.0)))
        dx = xx - cx
        dy = yy - cy
        local_x = dx * np.cos(angle) + dy * np.sin(angle)
        local_y = -dx * np.sin(angle) + dy * np.cos(angle)
        distance = (local_x / rx) ** 2 + (local_y / ry) ** 2
        # A one-pixel soft edge prevents jagged alpha without altering geometry.
        feather = max(1.0 / rx, 1.0 / ry)
        region_alpha = np.clip((1.0 + feather - distance) / feather, 0.0, 1.0)
        combined = np.maximum(combined, region_alpha)
    return Image.fromarray(np.uint8(np.round(combined * 255)), "L")


def difference_array(first: Image.Image, second: Image.Image) -> np.ndarray:
    first_rgba = np.asarray(first.convert("RGBA"), dtype=np.int16)
    second_rgba = np.asarray(second.convert("RGBA"), dtype=np.int16)
    rgb_delta = np.max(np.abs(first_rgba[:, :, :3] - second_rgba[:, :, :3]), axis=2)
    alpha_delta = np.abs(first_rgba[:, :, 3] - second_rgba[:, :, 3])
    delta = np.maximum(rgb_delta, alpha_delta).astype(np.float32)

    return delta


def eye_mattes(
    open_source: Image.Image,
    closed_source: Image.Image,
    regions: list[dict],
    pose_key: str,
) -> tuple[Image.Image, Image.Image]:
    """Return separate mattes without ever transforming source artwork."""
    width, height = open_source.size
    open_rgb = np.asarray(open_source.convert("RGB"), dtype=np.float32)
    closed_rgb = np.asarray(closed_source.convert("RGB"), dtype=np.float32)
    closed_luminance_full = (
        closed_rgb[:, :, 0] * 0.2126
        + closed_rgb[:, :, 1] * 0.7152
        + closed_rgb[:, :, 2] * 0.0722
    )
    delta = difference_array(open_source, closed_source)
    delta_alpha = np.clip((delta - 4.0) / 26.0, 0.0, 1.0)
    open_result = np.zeros((height, width), dtype=np.float32)
    closed_result = np.zeros((height, width), dtype=np.float32)

    def largest_connected(values: np.ndarray) -> np.ndarray:
        binary = np.uint8(values > 0.08)
        count, labels, stats, _ = cv2.connectedComponentsWithStats(binary, connectivity=8)
        if count <= 1:
            return values
        largest = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))
        return values * (labels == largest)

    for region in regions:
        # The marker surrounds the eye for authoring comfort. A slight inward
        # matte rejects neighbouring skin/hair while keeping source geometry.
        character = pose_key.split(".", 1)[0]
        open_scale = 0.74
        closed_scale = 0.72 if character == "3c" else 0.60
        open_region = dict(region)
        closed_region = dict(region)
        open_region["rx"] = float(region["rx"]) * open_scale
        open_region["ry"] = float(region["ry"]) * open_scale
        closed_region["rx"] = float(region["rx"]) * closed_scale
        closed_region["ry"] = float(region["ry"]) * closed_scale
        region_alpha = np.asarray(ellipse_mask((width, height), [region]), dtype=np.float32) / 255.0
        open_limit = np.asarray(ellipse_mask((width, height), [open_region]), dtype=np.float32) / 255.0
        closed_limit = np.asarray(ellipse_mask((width, height), [closed_region]), dtype=np.float32) / 255.0
        inside = region_alpha > 0.6
        closed_pixels = closed_rgb[inside]
        if not len(closed_pixels):
            continue

        # The closed-eye frame supplies the local face/lens background. Ignore
        # its darkest quartile so the eyelid line cannot skew that estimate.
        luminance = (
            closed_pixels[:, 0] * 0.2126
            + closed_pixels[:, 1] * 0.7152
            + closed_pixels[:, 2] * 0.0722
        )
        cutoff = np.percentile(luminance, 30)
        background_pixels = closed_pixels[luminance >= cutoff]
        background = np.median(background_pixels, axis=0)

        open_distance = np.linalg.norm(open_rgb - background, axis=2)
        closed_distance = np.linalg.norm(closed_rgb - background, axis=2)
        open_foreground = np.clip((open_distance - 14.0) / 38.0, 0.0, 1.0)
        closed_foreground = np.clip((closed_distance - 24.0) / 42.0, 0.0, 1.0)

        # A closed eye is line art. Bright skin and the yellow visor are not
        # part of that line and must remain transparent.
        if character == "3c":
            closed_darkness = np.clip((112.0 - closed_luminance_full) / 42.0, 0.0, 1.0)
            # 3C's visor and hair create dark arcs above the actual eyelid.
            # Work in the marker's native rotated coordinate system and keep
            # the narrow band in which the closed eyelid really lies.
            cx = float(region["cx"]) * width
            cy = float(region["cy"]) * height
            rx = max(1.0, float(region["rx"]) * width)
            ry = max(1.0, float(region["ry"]) * height)
            angle = np.deg2rad(float(region.get("rotation", 0.0)))
            yy, xx = np.mgrid[0:height, 0:width]
            dx = xx - cx
            dy = yy - cy
            local_y = -dx * np.sin(angle) + dy * np.cos(angle)
            eyelid_band = np.clip((local_y / ry + 0.20) * 6.0, 0.0, 1.0)
            eyelid_band *= np.clip((0.72 - local_y / ry) * 6.0, 0.0, 1.0)
        else:
            closed_darkness = np.clip((150.0 - closed_luminance_full) / 55.0, 0.0, 1.0)
            eyelid_band = 1.0
        open_alpha = open_limit * delta_alpha * open_foreground
        closed_alpha = closed_limit * delta_alpha * closed_foreground * closed_darkness * eyelid_band
        open_alpha = largest_connected(open_alpha)
        closed_alpha = largest_connected(closed_alpha)
        open_result = np.maximum(open_result, open_alpha)
        closed_result = np.maximum(closed_result, closed_alpha)

    # Recover one-pixel antialiasing only around already selected artwork.
    def finish(values: np.ndarray) -> Image.Image:
        image = Image.fromarray(np.uint8(np.round(values * 255)), "L")
        expanded = image.filter(ImageFilter.MaxFilter(3))
        return Image.fromarray(
            np.maximum(np.asarray(image, dtype=np.uint8), np.asarray(expanded, dtype=np.uint8) // 3),
            "L",
        )

    return finish(open_result), finish(closed_result)


def apply_matte(source: Image.Image, matte: Image.Image) -> Image.Image:
    rgba = np.asarray(source.convert("RGBA"), dtype=np.uint16).copy()
    source_alpha = rgba[:, :, 3]
    matte_alpha = np.asarray(matte, dtype=np.uint16)
    final_alpha = np.uint8((source_alpha * matte_alpha) // 255)
    rgba[:, :, 3] = final_alpha
    # Transparent pixels must not retain the original face RGB. Browsers ignore
    # it, but some asset viewers expose it and it makes the layer look dirty.
    rgba[final_alpha == 0, :3] = 0
    return Image.fromarray(np.uint8(rgba), "RGBA")


def half_eye_matte(
    half_source: Image.Image,
    open_matte: Image.Image,
    closed_matte: Image.Image,
    regions: list[dict],
) -> Image.Image:
    """Extract generated half-eye artwork without carrying face or hair.

    The exact-source open/closed mattes define where eye artwork is allowed.
    This keeps generated skin, fur, glasses and neighbouring hair out of the
    sparse layer even if the generated reference redrew those pixels.
    """
    width, height = half_source.size
    rgba = np.asarray(half_source.convert("RGBA"), dtype=np.uint8)
    rgb = rgba[:, :, :3].astype(np.float32)
    allowed = np.maximum(
        np.asarray(open_matte, dtype=np.uint8),
        np.asarray(closed_matte, dtype=np.uint8),
    )
    kernel = max(5, round(min(width, height) * 0.012))
    if kernel % 2 == 0:
        kernel += 1
    allowed = np.asarray(
        Image.fromarray(allowed, "L").filter(ImageFilter.MaxFilter(kernel)),
        dtype=np.float32,
    ) / 255.0
    gray = cv2.cvtColor(rgba[:, :, :3], cv2.COLOR_RGB2GRAY)
    grad_x = cv2.Sobel(gray, cv2.CV_32F, 1, 0, ksize=3)
    grad_y = cv2.Sobel(gray, cv2.CV_32F, 0, 1, ksize=3)
    gradient = cv2.magnitude(grad_x, grad_y)
    result = np.zeros((height, width), dtype=np.float32)
    for region in regions:
        inner = dict(region)
        inner["rx"] = float(region["rx"]) * 0.9
        inner["ry"] = float(region["ry"]) * 0.9
        region_alpha = np.asarray(
            ellipse_mask((width, height), [inner]), dtype=np.float32
        ) / 255.0
        background_zone = (region_alpha > 0.25) & (allowed < 0.08) & (rgba[:, :, 3] > 32)
        samples = rgb[background_zone]
        if len(samples) < 12:
            samples = rgb[(region_alpha > 0.2) & (rgba[:, :, 3] > 32)]
        if not len(samples):
            continue
        background = np.median(samples, axis=0)
        color_distance = np.linalg.norm(rgb - background, axis=2)
        color_score = np.clip((color_distance - 30.0) / 52.0, 0.0, 1.0)
        edge_score = np.clip((gradient - 30.0) / 78.0, 0.0, 1.0)
        candidate = np.maximum(color_score, edge_score * 0.72)
        candidate *= allowed * region_alpha * (rgba[:, :, 3].astype(np.float32) / 255.0)
        candidate[candidate < 0.2] = 0.0
        result = np.maximum(result, candidate)

    matte = Image.fromarray(np.uint8(np.round(result * 255)), "L")
    matte = matte.filter(ImageFilter.GaussianBlur(0.45))
    return matte


def source_paths(pose_key: str) -> tuple[Path, Path, dict]:
    pose = load_json(SOURCE_MANIFEST_PATH).get("poses", {}).get(pose_key)
    if not pose:
        raise KeyError(f"Pose {pose_key!r} is missing from {SOURCE_MANIFEST_PATH.name}")
    frames = pose.get("originalFrames", [])
    if not frames:
        raise ValueError(f"Pose {pose_key!r} has no blink reference frame")
    return ROOT / pose["source"], ROOT / frames[0], pose


def build_pose(pose_key: str) -> dict:
    regions_doc = load_json(REGIONS_PATH)
    regions = [
        region for region in regions_doc.get("regions", {}).get(pose_key, [])
        if region.get("mode", "include") == "include"
    ]
    if len(regions) != 2:
        raise ValueError(f"{pose_key} must contain exactly two included eye regions; found {len(regions)}")

    base_path, alternate_path, source_info = source_paths(pose_key)
    with Image.open(base_path) as image:
        base = image.convert("RGBA")
    with Image.open(alternate_path) as image:
        alternate = image.convert("RGBA")
    if alternate.size != base.size:
        raise ValueError(
            f"{pose_key} sources do not share a canvas: base={base.size}, alternate={alternate.size}. "
            "Rescaling is forbidden because it would change eye geometry."
        )

    alternate_is_open = "blink_open" in alternate_path.stem.lower()
    open_source = alternate if alternate_is_open else base
    closed_source = base if alternate_is_open else alternate
    open_matte, closed_matte = eye_mattes(open_source, closed_source, regions, pose_key)

    intermediate_doc = load_json(INTERMEDIATE_MANIFEST_PATH)
    intermediate = intermediate_doc.get("poses", {}).get(pose_key, {})
    half_source_path = ROOT / str(intermediate.get("half", ""))
    if not half_source_path.is_file():
        raise FileNotFoundError(f"{pose_key} has no registered intermediate frame")
    with Image.open(half_source_path) as image:
        half_source = image.convert("RGBA")
    if half_source.size != base.size:
        raise ValueError(
            f"{pose_key} intermediate does not share the source canvas: "
            f"{half_source.size} != {base.size}"
        )
    half_matte = half_eye_matte(half_source, open_matte, closed_matte, regions)

    character, pose = pose_key.split(".", 1)
    output_dir = OUTPUT_ROOT / character / pose
    output_dir.mkdir(parents=True, exist_ok=True)
    open_path = output_dir / "eyes_open.webp"
    half_path = output_dir / "eyes_half.webp"
    closed_path = output_dir / "eyes_closed.webp"
    save_webp_atomic(apply_matte(open_source, open_matte), open_path)
    save_webp_atomic(apply_matte(half_source, half_matte), half_path)
    save_webp_atomic(apply_matte(closed_source, closed_matte), closed_path)

    manifest = load_json(OUTPUT_MANIFEST_PATH) if OUTPUT_MANIFEST_PATH.exists() else {"version": 1, "poses": {}}
    manifest.setdefault("poses", {})[pose_key] = {
        "base": source_info["source"],
        "eyesOpen": rel(open_path),
        "eyesHalf": rel(half_path),
        "eyesClosed": rel(closed_path),
        "regions": regions,
        "canvas": {"width": base.width, "height": base.height},
        "pixelGeometry": "exact-source-coordinates",
        "openSource": rel(alternate_path if alternate_is_open else base_path),
        "halfSource": rel(half_source_path),
        "closedSource": rel(base_path if alternate_is_open else alternate_path),
    }
    manifest["poses"] = dict(sorted(manifest["poses"].items()))
    save_json(OUTPUT_MANIFEST_PATH, manifest)
    return manifest["poses"][pose_key]


def available_poses() -> list[str]:
    regions = load_json(REGIONS_PATH).get("regions", {})
    sources = load_json(SOURCE_MANIFEST_PATH).get("poses", {})
    return sorted(set(regions).intersection(sources))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("poses", nargs="*", help="Pose keys; omit with --all")
    parser.add_argument("--all", action="store_true", help="Build every manually marked pose")
    args = parser.parse_args()
    pose_keys = available_poses() if args.all else args.poses
    if not pose_keys:
        parser.error("Provide at least one pose or use --all")
    for pose_key in pose_keys:
        result = build_pose(pose_key)
        print(
            f"{pose_key}: {result['eyesOpen']} | {result['eyesHalf']} | "
            f"{result['eyesClosed']}"
        )


if __name__ == "__main__":
    main()
