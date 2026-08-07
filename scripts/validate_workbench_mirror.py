#!/usr/bin/env python3
"""Valida que ``workbench/`` sea un espejo limpio de la raíz del proyecto."""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
WORKBENCH = ROOT / "workbench"
LEGACY_DIRECTORIES = {"sources", "originals", "archive", "qa", "optimization"}
DISCARDED_NAME = re.compile(
    r"(?:candidate|rejected|draft|_test|_chroma|_raw|_cutout|_checker|_entrega)"
    r"(?:[_.-]|$)",
    re.I,
)
LEGACY_REFERENCE = re.compile(
    r"workbench[\\/](?:sources|originals|archive|qa|optimization)(?:[\\/]|\b)",
    re.I,
)
WORKBENCH_REFERENCE = re.compile(r"workbench/[A-Za-z0-9_./() -]+")
TEXT_SUFFIXES = {
    ".css",
    ".html",
    ".js",
    ".json",
    ".md",
    ".mjs",
    ".py",
    ".txt",
}


def repository_text_files() -> list[Path]:
    files: list[Path] = []
    for path in ROOT.rglob("*"):
        if not path.is_file() or path.suffix.lower() not in TEXT_SUFFIXES:
            continue
        relative = path.relative_to(ROOT)
        if relative.parts[0] in {".git", "dist", "node_modules", "workbench"}:
            continue
        files.append(path)
    return files


def validate_structure(errors: list[str]) -> tuple[int, int]:
    if not WORKBENCH.is_dir():
        errors.append("falta workbench/")
        return 0, 0

    files = [path for path in WORKBENCH.rglob("*") if path.is_file()]
    for child in WORKBENCH.iterdir():
        if child.is_dir() and not (ROOT / child.name).is_dir():
            errors.append(f"raíz sin espejo en el proyecto: {child.relative_to(ROOT)}")

    for path in WORKBENCH.rglob("*"):
        relative = path.relative_to(WORKBENCH)
        if path.is_dir() and path.name.lower() in LEGACY_DIRECTORIES:
            errors.append(f"directorio de clasificación antiguo: {relative}")
        if path.is_file() and DISCARDED_NAME.search(path.name):
            errors.append(f"salida descartada dentro de workbench: {relative}")

    return len(files), sum(path.stat().st_size for path in files)


def validate_references(errors: list[str]) -> None:
    for path in repository_text_files():
        try:
            text = path.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            continue
        if LEGACY_REFERENCE.search(text):
            errors.append(f"referencia a estructura antigua: {path.relative_to(ROOT)}")
        for match in WORKBENCH_REFERENCE.finditer(text):
            value = match.group(0).rstrip(".,;:')\"]")
            if any(token in value for token in ("<", ">", "{", "}", "*", "...")):
                continue
            if value.endswith("_"):
                continue
            candidate = ROOT / value
            if not candidate.exists():
                errors.append(
                    f"referencia inexistente en {path.relative_to(ROOT)}: {value}"
                )


def validate_optimization_manifest(errors: list[str]) -> None:
    manifest = WORKBENCH / "assets" / "metadata" / "asset_optimization_manifest.json"
    if not manifest.is_file():
        errors.append("falta workbench/assets/metadata/asset_optimization_manifest.json")
        return
    payload = json.loads(manifest.read_text(encoding="utf-8"))
    for key, entry in payload.get("conversions", {}).items():
        original = entry.get("original")
        if not isinstance(original, str) or not original.startswith("workbench/"):
            errors.append(f"original inválido en el manifiesto: {key}")
            continue
        if not (ROOT / original).is_file():
            errors.append(f"original ausente en el manifiesto: {original}")


def validate_samu_blink_recipe(errors: list[str]) -> None:
    recipe_path = WORKBENCH / "assets" / "metadata" / "samu_blink_composition.json"
    if not recipe_path.is_file():
        errors.append("falta workbench/assets/metadata/samu_blink_composition.json")
        return
    recipe = json.loads(recipe_path.read_text(encoding="utf-8"))
    poses = recipe.get("poses", {})
    if len(poses) != 16:
        errors.append("la receta ocular de Samu debe declarar 16 poses")
    for pose, config in poses.items():
        paths = [config.get("base")]
        paths.extend(
            frame.get("master")
            for frame in config.get("frames", {}).values()
            if isinstance(frame, dict)
        )
        for value in paths:
            if not isinstance(value, str) or not value.startswith("assets/"):
                errors.append(f"ruta de maestro inválida en la receta de Samu: {pose}")
            elif not (WORKBENCH / value).is_file():
                errors.append(f"maestro ausente en la receta de Samu: {value}")


def main() -> int:
    errors: list[str] = []
    file_count, byte_count = validate_structure(errors)
    validate_references(errors)
    validate_optimization_manifest(errors)
    validate_samu_blink_recipe(errors)
    if errors:
        print("WORKBENCH INVALIDO")
        for error in sorted(set(errors)):
            print(f"- {error}")
        return 1
    print(
        "WORKBENCH OK: "
        f"{file_count} archivos, {byte_count / 1024 / 1024:.2f} MiB, "
        "raíz espejo y referencias válidas"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
