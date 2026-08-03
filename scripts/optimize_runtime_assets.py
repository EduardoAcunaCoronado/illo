#!/usr/bin/env python3
"""Optimiza imágenes runtime conservando siempre el original fuera de assets.

El script sólo procesa rutas de imagen que aparecen de forma explícita en el
código o en los manifiestos. Los recursos construidos dinámicamente se dejan
intactos hasta que su cargador pueda migrarse de forma controlada.

Los originales se mueven a ``workbench/originals/runtime/assets/...`` y cada
conversión queda registrada en un manifiesto JSON que permite localizar y
restaurar la fuente exacta.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import shutil
import subprocess
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets"
ORIGINALS = ROOT / "workbench" / "originals" / "runtime"
MANIFEST = ROOT / "workbench" / "optimization" / "asset_optimization_manifest.json"
IMAGE_SUFFIXES = {".png", ".jpg", ".jpeg"}
TEXT_SUFFIXES = {
    ".bat",
    ".css",
    ".htaccess",
    ".html",
    ".js",
    ".json",
    ".md",
    ".mjs",
    ".ps1",
    ".py",
    ".txt",
    ".xml",
    ".yaml",
    ".yml",
}
SKIP_PARTS = {
    "eye_bases_clean",
    "eye_intermediate_sources",
    "eye_layer_edits",
    "eye_layers",
    "eye_layers_clean",
    "eye_region_previews",
    "sprite_halo_cleaned",
}
SKIP_ROOTS = {".git", "assets", "dist", "node_modules", "workbench"}
MEDIA_JOBS = (
    {
        "path": "assets/audio/sfx/sfx_caida_anime_edu.wav",
        "kind": "audio",
        "destination": "assets/audio/sfx/sfx_caida_anime_edu.mp3",
    },
    {
        "path": "assets/audio/music/minigames/cae_a_mis_pies.mp3",
        "kind": "audio",
        "destination": "assets/audio/music/minigames/cae_a_mis_pies.mp3",
    },
    {"path": "assets/video/menu/menu_loop.mp4", "kind": "video"},
    {
        "path": "assets/video/cutscenes/chapter2/intro_sala_del_trono_kk_4k.mp4",
        "kind": "video",
        "crf": 22,
    },
)


def relative(path: Path) -> str:
    return path.relative_to(ROOT).as_posix()


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def read_text_files() -> dict[Path, str]:
    files: dict[Path, str] = {}
    for path in ROOT.rglob("*"):
        if not path.is_file() or path.suffix.lower() not in TEXT_SUFFIXES:
            continue
        if any(part in SKIP_ROOTS for part in path.relative_to(ROOT).parts[:-1]):
            continue
        try:
            files[path] = path.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            continue
    # Los manifiestos de assets sí forman parte de la búsqueda de referencias.
    for path in (ASSETS / "metadata").glob("*.json"):
        files[path] = path.read_text(encoding="utf-8")
    return files


def referenced_candidates(texts: dict[Path, str], minimum: int) -> list[Path]:
    corpus = "\n".join(texts.values())
    candidates: list[Path] = []
    for path in ASSETS.rglob("*"):
        if not path.is_file() or path.suffix.lower() not in IMAGE_SUFFIXES:
            continue
        if SKIP_PARTS.intersection(path.parts):
            continue
        asset_path = relative(path)
        dynamic_minigame = (
            asset_path.startswith("assets/images/minigames/chapter3/sprites/")
            and (
                path.stem.startswith(("coche_v2_", "edu_fly_v3_"))
                or (path.stem.startswith("obs_") and "_v2_" in path.stem)
                or (path.stem.startswith("meme_") and "_v2_" in path.stem)
                or path.stem
                in {"aire_altavoz_v2", "aire_cable_v3", "aire_foco_v2", "partitura_v2"}
            )
        )
        dynamic_background = (
            path.parent == ASSETS / "images" / "minigames" / "chapter3"
            and path.stem
            in {
                "aire_fondo_v2",
                "carretera_loop_fondo_sin_luna_v2",
                "carretera_loop_v2",
                "carretera_luna_v2",
            }
        )
        dynamic_ketchup = asset_path.startswith(
            "assets/images/characters/samu/ketchup/"
        )
        if path.stat().st_size < minimum and not (
            dynamic_minigame or dynamic_background or dynamic_ketchup
        ):
            continue
        if asset_path in corpus or dynamic_minigame or dynamic_background or dynamic_ketchup:
            candidates.append(path)
    return sorted(candidates)


def image_has_transparency(image: Image.Image) -> bool:
    if image.mode in {"RGBA", "LA"}:
        return image.getchannel("A").getextrema()[0] < 255
    if image.mode == "P" and "transparency" in image.info:
        return True
    return False


def use_lossy_mode(path: Path, transparent: bool) -> bool:
    if transparent:
        return False
    parts = set(path.relative_to(ASSETS).parts)
    return bool(parts & {"backgrounds", "cg", "gallery"})


def load_manifest() -> dict[str, Any]:
    if not MANIFEST.is_file():
        return {"version": 1, "conversions": {}}
    payload = json.loads(MANIFEST.read_text(encoding="utf-8"))
    payload.setdefault("version", 1)
    payload.setdefault("conversions", {})
    return payload


def save_manifest(payload: dict[str, Any]) -> None:
    MANIFEST.parent.mkdir(parents=True, exist_ok=True)
    payload["updatedAt"] = datetime.now(timezone.utc).isoformat()
    temporary = MANIFEST.with_suffix(".json.tmp")
    temporary.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    temporary.replace(MANIFEST)


def recover_unregistered_conversions(payload: dict[str, Any]) -> int:
    """Reconstruye entradas si el proceso terminó tras mover un original."""
    recovered = 0
    if not ORIGINALS.is_dir():
        return recovered
    conversions = payload.setdefault("conversions", {})
    for backup in ORIGINALS.rglob("*"):
        if not backup.is_file() or backup.suffix.lower() not in IMAGE_SUFFIXES:
            continue
        source_relative_path = backup.relative_to(ORIGINALS)
        source = ROOT / source_relative_path
        runtime = source.with_suffix(".webp")
        source_relative = source_relative_path.as_posix()
        if source_relative in conversions or source.exists() or not runtime.is_file():
            continue
        with Image.open(backup) as original_image:
            width, height = original_image.size
            transparent = image_has_transparency(original_image)
        conversions[source_relative] = {
            "source": source_relative,
            "original": relative(backup),
            "runtime": relative(runtime),
            "mode": "webp-lossless-recovered" if transparent else "webp-recovered",
            "width": width,
            "height": height,
            "originalBytes": backup.stat().st_size,
            "runtimeBytes": runtime.stat().st_size,
            "savedBytes": backup.stat().st_size - runtime.stat().st_size,
            "originalSha256": sha256(backup),
            "runtimeSha256": sha256(runtime),
        }
        recovered += 1
    return recovered


def media_duration(path: Path) -> float:
    result = subprocess.run(
        [
            "ffprobe",
            "-v",
            "error",
            "-show_entries",
            "format=duration",
            "-of",
            "default=noprint_wrappers=1:nokey=1",
            str(path),
        ],
        check=True,
        capture_output=True,
        text=True,
    )
    return float(result.stdout.strip())


def optimize_media(
    texts: dict[Path, str], payload: dict[str, Any], minimum_saving: float
) -> tuple[int, int, int]:
    if not shutil.which("ffmpeg") or not shutil.which("ffprobe"):
        raise RuntimeError("ffmpeg y ffprobe son necesarios para optimizar audio y vídeo")
    entries = payload.setdefault("mediaConversions", {})
    converted = 0
    saved = 0
    changed_texts = 0
    for job in MEDIA_JOBS:
        source_relative = job["path"]
        if source_relative in entries:
            continue
        source = ROOT / source_relative
        destination_relative = job.get("destination", source_relative)
        destination = ROOT / destination_relative
        if not source.is_file():
            continue
        temporary = destination.with_name(destination.stem + ".optimizing" + destination.suffix)
        if temporary.exists():
            temporary.unlink()
        if job["kind"] == "audio":
            command = [
                "ffmpeg", "-y", "-v", "error", "-i", str(source),
                "-map_metadata", "-1", "-c:a", "libmp3lame", "-q:a", "2",
                str(temporary),
            ]
            mode = "mp3-vbr-q2"
        else:
            crf = str(job.get("crf", 20))
            command = [
                "ffmpeg", "-y", "-v", "error", "-i", str(source),
                "-map_metadata", "-1", "-c:v", "libx264", "-preset", "slow",
                "-crf", crf, "-pix_fmt", "yuv420p", "-movflags", "+faststart",
                "-c:a", "aac", "-b:a", "192k", str(temporary),
            ]
            mode = f"h264-crf{crf}"
        subprocess.run(command, check=True)
        old_duration = media_duration(source)
        new_duration = media_duration(temporary)
        if abs(old_duration - new_duration) > max(0.15, old_duration * 0.002):
            temporary.unlink()
            raise ValueError(f"Duración alterada al optimizar {source_relative}")
        old_size = source.stat().st_size
        new_size = temporary.stat().st_size
        if 1.0 - new_size / old_size < minimum_saving:
            temporary.unlink()
            continue
        backup = ORIGINALS / source.relative_to(ROOT)
        backup.parent.mkdir(parents=True, exist_ok=True)
        if backup.exists() and sha256(backup) != sha256(source):
            temporary.unlink()
            raise FileExistsError(f"El original conservado no coincide: {backup}")
        if not backup.exists():
            shutil.move(source, backup)
        else:
            source.unlink()
        destination.parent.mkdir(parents=True, exist_ok=True)
        os.replace(temporary, destination)
        entry = {
            "source": source_relative,
            "original": relative(backup),
            "runtime": destination_relative,
            "mode": mode,
            "durationSeconds": round(new_duration, 3),
            "originalBytes": old_size,
            "runtimeBytes": new_size,
            "savedBytes": old_size - new_size,
            "originalSha256": sha256(backup),
            "runtimeSha256": sha256(destination),
        }
        entries[source_relative] = entry
        if source_relative != destination_relative:
            changed_texts += replace_references(
                texts, {source_relative: destination_relative}
            )
        converted += 1
        saved += entry["savedBytes"]
        save_manifest(payload)
        print(
            f"{mode}: {source_relative} -> {destination_relative} "
            f"({entry['savedBytes'] / 1024 / 1024:.2f} MiB)"
        )
    return converted, saved, changed_texts


def encode_webp(source: Path, temporary: Path, quality: int) -> tuple[str, tuple[int, int]]:
    with Image.open(source) as opened:
        opened.load()
        transparent = image_has_transparency(opened)
        lossy = use_lossy_mode(source, transparent)
        image = opened.convert("RGBA" if transparent else "RGB")
        size = image.size
        if lossy:
            image.save(temporary, "WEBP", quality=quality, method=6)
            mode = f"webp-lossy-q{quality}"
        else:
            image.save(temporary, "WEBP", lossless=True, method=6, exact=True)
            mode = "webp-lossless"
    with Image.open(temporary) as check:
        if check.size != size:
            raise ValueError(f"Dimensiones alteradas al convertir {source}")
        if transparent and not image_has_transparency(check):
            raise ValueError(f"Se perdió la transparencia al convertir {source}")
    return mode, size


def replace_references(texts: dict[Path, str], replacements: dict[str, str]) -> int:
    changed = 0
    for path, original in texts.items():
        updated = original
        for old, new in replacements.items():
            updated = updated.replace(old, new)
        if updated == original:
            continue
        path.write_text(updated, encoding="utf-8")
        texts[path] = updated
        changed += 1
    return changed


def convert(
    source: Path,
    quality: int,
    minimum_saving: float,
    manifest: dict[str, Any],
) -> dict[str, Any] | None:
    destination = source.with_suffix(".webp")
    if destination.exists():
        return None
    temporary = destination.with_suffix(destination.suffix + ".tmp")
    mode, dimensions = encode_webp(source, temporary, quality)
    old_size = source.stat().st_size
    new_size = temporary.stat().st_size
    saving = 1.0 - new_size / old_size
    if saving < minimum_saving:
        temporary.unlink()
        return None

    backup = ORIGINALS / source.relative_to(ROOT)
    backup.parent.mkdir(parents=True, exist_ok=True)
    if backup.exists() and sha256(backup) != sha256(source):
        temporary.unlink()
        raise FileExistsError(f"El original conservado no coincide: {backup}")
    if not backup.exists():
        shutil.move(source, backup)
    else:
        source.unlink()
    os.replace(temporary, destination)

    old_relative = relative(source)
    new_relative = relative(destination)
    entry = {
        "source": old_relative,
        "original": relative(backup),
        "runtime": new_relative,
        "mode": mode,
        "width": dimensions[0],
        "height": dimensions[1],
        "originalBytes": old_size,
        "runtimeBytes": new_size,
        "savedBytes": old_size - new_size,
        "originalSha256": sha256(backup),
        "runtimeSha256": sha256(destination),
    }
    manifest["conversions"][old_relative] = entry
    return entry


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true", help="aplica las conversiones")
    parser.add_argument("--quality", type=int, default=92)
    parser.add_argument("--min-bytes", type=int, default=256 * 1024)
    parser.add_argument("--min-saving", type=float, default=0.05)
    parser.add_argument("--limit", type=int)
    parser.add_argument(
        "--media", action="store_true", help="optimiza también el audio y vídeo seleccionados"
    )
    args = parser.parse_args()

    texts = read_text_files()
    manifest = load_manifest()
    if args.apply:
        # Una interrupción puede producir el WebP y registrar la conversión
        # antes de llegar a la sustitución final. Reconciliar el manifiesto al
        # arrancar hace que el proceso sea reanudable y nunca deje rutas rotas.
        recovered = recover_unregistered_conversions(manifest)
        if recovered:
            save_manifest(manifest)
            print(f"Conversiones recuperadas tras una interrupción: {recovered}")
        previous = {
            entry["source"]: entry["runtime"]
            for entry in manifest.get("conversions", {}).values()
            if (ROOT / entry.get("runtime", "")).is_file()
        }
        replace_references(texts, previous)
        if args.media:
            media_count, media_saved, media_texts = optimize_media(
                texts, manifest, args.min_saving
            )
            print(
                f"Medios convertidos: {media_count}; ahorro: "
                f"{media_saved / 1024 / 1024:.2f} MiB; referencias: {media_texts}"
            )
    candidates = referenced_candidates(texts, args.min_bytes)
    if args.limit is not None:
        candidates = candidates[: args.limit]
    print(f"Candidatos explícitamente referenciados: {len(candidates)}")
    if not args.apply:
        for path in candidates:
            print(f"  {path.stat().st_size / 1024 / 1024:7.2f} MiB  {relative(path)}")
        return 0

    replacements: dict[str, str] = {}
    saved = 0
    converted = 0
    changed_texts = 0
    for index, source in enumerate(candidates, 1):
        entry = convert(source, args.quality, args.min_saving, manifest)
        if not entry:
            print(f"[{index}/{len(candidates)}] sin ahorro suficiente: {relative(source)}")
            continue
        replacements[entry["source"]] = entry["runtime"]
        changed_texts += replace_references(
            texts, {entry["source"]: entry["runtime"]}
        )
        saved += entry["savedBytes"]
        converted += 1
        print(
            f"[{index}/{len(candidates)}] {entry['mode']}: {entry['source']} "
            f"-> {entry['runtime']} ({entry['savedBytes'] / 1024 / 1024:.2f} MiB)"
        )
        save_manifest(manifest)

    changed_texts += replace_references(texts, replacements)
    save_manifest(manifest)
    print(
        f"Convertidos: {converted}; ahorro runtime: {saved / 1024 / 1024:.2f} MiB; "
        f"archivos de texto actualizados: {changed_texts}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
