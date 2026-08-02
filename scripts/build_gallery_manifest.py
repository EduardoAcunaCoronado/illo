"""Construye la galería curada del juego y sus miniaturas.

La seleccion se deriva de los capitulos y las fichas de personaje para evitar
exponer hojas de sprites, fuentes de trabajo, legacy y duplicados 4K. Los siete
recursos promocionales se copian desde RECURSOS_CAMBIOS_GUION por defecto.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import shutil
import subprocess
import tempfile
import unicodedata
from collections import defaultdict
from datetime import date
from pathlib import Path
from typing import Any, Iterable

from PIL import Image, ImageOps


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SOURCE = Path.home() / "Downloads" / "RECURSOS_CAMBIOS_GUION"
MANIFEST_PATH = ROOT / "assets" / "metadata" / "gallery_manifest.json"
THUMB_DIR = ROOT / "assets" / "images" / "gallery" / "thumbnails"
THUMB_SIZE = (480, 270)
POSE_THUMB_SIZE = (156, 156)
LEGACY_CHARACTER_KEYS = {"epod"}

PROMOTIONAL_FILES = {
    "edu_wallpaper.png": ROOT
    / "assets/images/gallery/wallpapers/edu_entre_mundos.png",
    "jose_wallpaper.png": ROOT
    / "assets/images/gallery/wallpapers/jose_guardian_ciudad_paloma.png",
    "samu_wallpaper.png": ROOT
    / "assets/images/gallery/wallpapers/samu_dos_lados.png",
    "seraphyna_wallpaper_v2.png": ROOT
    / "assets/images/gallery/wallpapers/seraphyna_en_escenario.png",
    "malos_manos_pads_cara_original.png": ROOT
    / "assets/images/cg/shared/elion_controla_brainrot.png",
    "villano_elion_husk.png": ROOT
    / "assets/images/gallery/concept_art/elion_husk_hoja_diseno.png",
    "presentacion_personajes_ideas.mp4": ROOT
    / "assets/video/gallery/samu_presentacion_personaje.mp4",
}

CATEGORY_DEFINITIONS = [
    {"id": "all", "label": "Todo"},
    {"id": "wallpapers", "label": "Wallpapers"},
    {"id": "illustrations", "label": "Ilustraciones"},
    {"id": "characters", "label": "Personajes"},
    {"id": "backgrounds", "label": "Escenarios"},
    {"id": "videos", "label": "Vídeos"},
]

PROMOTIONAL_ITEMS = [
    {
        "id": "wallpaper-edu-entre-mundos",
        "title": "Edu: entre dos mundos",
        "description": (
            "Edu atraviesa a toda velocidad la frontera entre Furrielva y "
            "Kingdom Ketchup."
        ),
        "type": "image",
        "category": "wallpapers",
        "src": "assets/images/gallery/wallpapers/edu_entre_mundos.png",
        "alt": "Edu corre desde Furrielva hacia Kingdom Ketchup con el movil en la mano.",
        "fit": "cover",
        "downloadable": True,
        "spoiler": False,
        "origin": "promotional",
    },
    {
        "id": "wallpaper-jose-guardian",
        "title": "José: guardián de Ciudad Paloma",
        "description": (
            "José contempla Ciudad Paloma con su armadura, su espada y una "
            "escolta inesperadamente numerosa."
        ),
        "type": "image",
        "category": "wallpapers",
        "src": "assets/images/gallery/wallpapers/jose_guardian_ciudad_paloma.png",
        "alt": "José con armadura y espada rodeado de palomas sobre la ciudad.",
        "fit": "cover",
        "downloadable": True,
        "spoiler": False,
        "origin": "promotional",
    },
    {
        "id": "wallpaper-samu-dos-lados",
        "title": "Samu: dos lados del cristal",
        "description": (
            "El Samu humano y el Samu transformado comparten el mismo atardecer "
            "sin llegar a ocupar el mismo lado."
        ),
        "type": "image",
        "category": "wallpapers",
        "src": "assets/images/gallery/wallpapers/samu_dos_lados.png",
        "alt": "Samu humano y Samu transformado separados por una cristalera al atardecer.",
        "fit": "cover",
        "downloadable": True,
        "spoiler": False,
        "origin": "promotional",
    },
    {
        "id": "wallpaper-seraphyna-escenario",
        "title": "Seraphyna: reina del escenario",
        "description": (
            "Seraphyna domina Ecchi Land mientras una presencia silenciosa "
            "observa el concierto desde las sombras."
        ),
        "type": "image",
        "category": "wallpapers",
        "src": "assets/images/gallery/wallpapers/seraphyna_en_escenario.png",
        "alt": "Seraphyna canta ante una multitud iluminada por luces magenta.",
        "fit": "cover",
        "downloadable": True,
        "spoiler": False,
        "origin": "promotional",
    },
    {
        "id": "illustration-elion-titiritero",
        "title": "Elion Husk: el titiritero",
        "description": (
            "Elion dirige a los brainrot como piezas de una ofensiva que lleva "
            "demasiado tiempo preparando."
        ),
        "type": "image",
        "category": "illustrations",
        "src": "assets/images/cg/shared/elion_controla_brainrot.png",
        "alt": "Elion Husk controla a tres brainrot bajo una luna roja.",
        "fit": "contain",
        "downloadable": False,
        "spoiler": True,
        "spoilerReason": "Revela al responsable de la corrupción y su relación con los brainrot.",
        "origin": "promotional",
    },
    {
        "id": "illustration-elion-model-sheet",
        "title": "Elion Husk: hoja de diseño",
        "description": (
            "Estudio de silueta, expresiones y vistas del antagonista que mueve "
            "los hilos desde fuera de plano."
        ),
        "type": "image",
        "category": "illustrations",
        "src": "assets/images/gallery/concept_art/elion_husk_hoja_diseno.png",
        "alt": "Hoja de diseño de Elion Husk con cuerpo entero y varias expresiones.",
        "fit": "contain",
        "downloadable": False,
        "spoiler": True,
        "spoilerReason": "Muestra el aspecto completo de Elion Husk.",
        "origin": "promotional",
    },
    {
        "id": "video-samu-presentacion",
        "title": "Samu: estado despierto",
        "description": (
            "Concepto animado de presentación: del Samu humano al protagonista "
            "transformado en apenas tres segundos."
        ),
        "type": "video",
        "category": "videos",
        "src": "assets/video/gallery/samu_presentacion_personaje.mp4",
        "alt": "Presentación animada de Samu humano y transformado.",
        "fit": "cover",
        "downloadable": False,
        "spoiler": False,
        "origin": "promotional",
    },
]

def to_relative(path: Path) -> str:
    return path.relative_to(ROOT).as_posix()


def copy_promotional_assets(source_dir: Path) -> None:
    missing = [name for name in PROMOTIONAL_FILES if not (source_dir / name).is_file()]
    if missing:
        raise FileNotFoundError(
            "Faltan recursos promocionales en "
            f"{source_dir}: {', '.join(sorted(missing))}"
        )

    for source_name, destination in PROMOTIONAL_FILES.items():
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source_dir / source_name, destination)


def iter_strings(value: Any) -> Iterable[str]:
    if isinstance(value, str):
        yield value
    elif isinstance(value, dict):
        for child in value.values():
            yield from iter_strings(child)
    elif isinstance(value, list):
        for child in value:
            yield from iter_strings(child)


def chapter_sort_key(path: Path) -> int:
    match = re.search(r"(\d+)$", path.stem)
    return int(match.group(1)) if match else 999


def excluded_art_path(path: str) -> bool:
    lowered = path.lower()
    parts = set(Path(lowered).parts)
    return bool(
        {"legacy", "source", "sources"} & parts
        or "_source" in lowered
        or "contact_canvas" in lowered
    )


def lightweight_variant(path: str) -> str:
    """Usa la salida base cuando el recurso referenciado es un duplicado 4K."""
    candidate_path = ROOT / Path(path)
    stem = candidate_path.stem
    if re.search(r"_4k$", stem, flags=re.IGNORECASE):
        candidate = candidate_path.with_name(
            re.sub(r"_4k$", "", stem, flags=re.IGNORECASE) + candidate_path.suffix
        )
        if candidate.is_file():
            return to_relative(candidate)
    return path.replace("\\", "/")


def normalize_words(stem: str) -> str:
    cleaned = stem
    while re.search(r"_(?:4k|v\d+|2x|3d)$", cleaned, flags=re.IGNORECASE):
        cleaned = re.sub(
            r"_(?:4k|v\d+|2x|3d)$", "", cleaned, flags=re.IGNORECASE
        )
    cleaned = re.sub(r"[_-]+", " ", cleaned).strip()
    phrase_titles = {
        "golden cap portal activation": "El portal de la Chapa Dorada",
        "golden cap reveal": "La Chapa Dorada",
        "ketchlings factory welcome": "Bienvenida de los Ketchlings",
        "zip sombra 1": "La sombra de Zip I",
        "zip sombra 2": "La sombra de Zip II",
        "abrazo trio": "El abrazo del trío",
        "foto trio": "Foto del trío",
        "tres escenario": "Los tres en el escenario",
        "kingdom ketchup production floor": "Planta de producción de Kingdom Ketchup",
        "kingdom ketchup production floor corrupted": "Planta de producción corrompida",
        "kingdom ketchup trono video final": "Sala del trono de Kingdom Ketchup",
        "mapa furrielva furry maps": "Mapa de Furrielva en Furry Maps",
        "skyline eechi land": "Horizonte de Ecchi Land",
        "skyline amanecer": "Ecchi Land al amanecer",
        "backstage mesa": "Mesa del backstage",
    }
    if cleaned.casefold() in phrase_titles:
        return phrase_titles[cleaned.casefold()]
    words = cleaned.split()
    special = {
        "airi": "AI.RI",
        "a": "a",
        "bathroom": "Baño",
        "calmandose": "calmándose",
        "caido": "caído",
        "callejon": "Callejón",
        "cicular": "Circular",
        "con": "con",
        "corrupcion": "corrupción",
        "de": "de",
        "del": "del",
        "desmadrandose": "desmadrándose",
        "dia": "Día",
        "diapason": "Diapasón",
        "edu": "Edu",
        "ecchi": "Ecchi",
        "elion": "Elion",
        "en": "en",
        "epica": "épica",
        "estanterias": "estanterías",
        "furrielva": "Furrielva",
        "husk": "Husk",
        "habitacion": "Habitación",
        "heroes": "héroes",
        "interio": "interior",
        "interior": "interior",
        "jamon": "Jamón",
        "jose": "José",
        "ketchup": "Ketchup",
        "kingdom": "Kingdom",
        "la": "la",
        "neon": "neón",
        "samu": "Samu",
        "seraphyna": "Seraphyna",
        "trio": "trío",
        "tunel": "túnel",
        "ultimo": "Último",
        "vacio": "vacío",
        "zip": "Zip",
    }
    return " ".join(special.get(word.lower(), word.capitalize()) for word in words)


def slug(value: str) -> str:
    ascii_value = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode()
    result = re.sub(r"[^a-z0-9]+", "-", ascii_value.lower()).strip("-")
    return result or "art"


def unique_id(prefix: str, source: str, used: set[str]) -> str:
    base = f"{prefix}-{slug(Path(source).stem)}"
    if base not in used:
        used.add(base)
        return base
    digest = hashlib.sha1(source.encode("utf-8")).hexdigest()[:7]
    result = f"{base}-{digest}"
    used.add(result)
    return result


def collect_referenced_art(used_ids: set[str]) -> list[dict[str, Any]]:
    references: dict[str, list[tuple[int, str]]] = defaultdict(list)

    for chapter_path in sorted((ROOT / "chapters").glob("chapter*.json"), key=chapter_sort_key):
        chapter_number = chapter_sort_key(chapter_path)
        chapter = json.loads(chapter_path.read_text(encoding="utf-8"))
        chapter_title = chapter.get("title") or f"Capítulo {chapter_number}"
        for value in iter_strings(chapter):
            normalized = value.replace("\\", "/")
            if not normalized.startswith(
                ("assets/images/backgrounds/", "assets/images/cg/")
            ):
                continue
            if excluded_art_path(normalized):
                continue
            normalized = lightweight_variant(normalized)
            references[normalized].append((chapter_number, chapter_title))

    items: list[dict[str, Any]] = []
    for source, chapters in sorted(references.items()):
        absolute = ROOT / Path(source)
        if not absolute.is_file():
            raise FileNotFoundError(f"Recurso referenciado inexistente: {source}")

        chapter_number, chapter_title = min(chapters, key=lambda item: item[0])
        is_cg = source.startswith("assets/images/cg/")
        category = "illustrations" if is_cg else "backgrounds"
        item_id = unique_id("cg" if is_cg else "bg", source, used_ids)
        final_spoiler = chapter_number >= 5
        title = normalize_words(absolute.stem)
        items.append(
            {
                "id": item_id,
                "title": title,
                "description": (
                    f"Ilustración narrativa de {chapter_title}."
                    if is_cg
                    else f"Escenario de {chapter_title}."
                ),
                "type": "image",
                "category": category,
                "src": source,
                "alt": title,
                "fit": "cover",
                "downloadable": False,
                "spoiler": final_spoiler,
                **(
                    {"spoilerReason": "Muestra localizaciones o acontecimientos de la recta final."}
                    if final_spoiler
                    else {}
                ),
                "chapter": chapter_number,
                "origin": "chapter",
            }
        )
    return items


def pose_label(pose_key: str) -> str:
    labels = {
        "neutral": "Neutral",
        "happy": "Feliz",
        "sad": "Triste",
        "angry": "Enfadado",
        "surprised": "Sorprendido",
        "alarmed": "Alarmado",
        "shocked": "Impactado",
        "worried": "Preocupado",
        "thinking": "Pensativo",
        "determined": "Decidido",
        "embarrassed": "Avergonzado",
        "clapping": "Aplaudiendo",
        "curious": "Curioso",
        "facepalm": "Facepalm",
        "epic": "Épico",
        "bua": "Llorando",
        "human": "Forma humana",
        "silueta": "Silueta",
        "security": "Seguridad",
        "charred_blink": "Carbonizado",
        "charred_shake": "Sacudiéndose",
        "zip_happy": "Zip feliz",
        "zip_surprised": "Zip sorprendido",
        "zip_worried": "Zip preocupado",
    }
    return labels.get(pose_key, normalize_words(pose_key))


def collect_pose_animation(
    character_path: Path,
    character: dict[str, Any],
    pose_key: str,
) -> dict[str, Any] | None:
    animations = character.get("animations") or character.get("poseAnimations") or {}
    config = animations.get(pose_key)
    if not config:
        return None

    source_frames = config if isinstance(config, list) else config.get("frames", [])
    if not isinstance(source_frames, list) or not source_frames:
        return None

    poses = character.get("poses") or {}
    default_duration = 85
    if isinstance(config, dict):
        try:
            default_duration = max(40, int(config.get("frameMs", 85)))
        except (TypeError, ValueError):
            default_duration = 85

    frames: list[dict[str, Any]] = []
    for frame in source_frames:
        value = (
            frame.get("src") or frame.get("image") or frame.get("pose")
            if isinstance(frame, dict)
            else frame
        )
        if not isinstance(value, str) or not value:
            continue
        source = poses.get(value, value)
        source = lightweight_variant(source.replace("\\", "/"))
        if not (ROOT / Path(source)).is_file():
            raise FileNotFoundError(
                f"Frame de animación inexistente para {character_path.name} "
                f"({pose_key}): {source}"
            )
        duration = default_duration
        if isinstance(frame, dict):
            try:
                duration = max(40, int(frame.get("duration", default_duration)))
            except (TypeError, ValueError):
                duration = default_duration
        frames.append({"src": source, "duration": duration})

    if not frames:
        return None

    delay_range: int | float | list[int | float] = [1800, 4200]
    loop = True
    if isinstance(config, dict):
        delay_range = (
            config.get("delayRange")
            or config.get("idleRange")
            or config.get("loopDelay")
            or config.get("delayMs")
            or delay_range
        )
        loop = config.get("loop", True) is not False
    return {"frames": frames, "delayRange": delay_range, "loop": loop}


def collect_character_poses(
    character_path: Path, character: dict[str, Any]
) -> list[dict[str, Any]]:
    poses = character.get("poses") or {}
    default_pose = character.get("defaultPose") or "neutral"
    ordered_keys = [default_pose, *(key for key in poses if key != default_pose)]
    result: list[dict[str, Any]] = []
    used_pose_ids: set[str] = set()

    for pose_key in ordered_keys:
        source = poses.get(pose_key)
        if not isinstance(source, str) or not source or excluded_art_path(source):
            continue
        source = lightweight_variant(source.replace("\\", "/"))
        if not (ROOT / Path(source)).is_file():
            raise FileNotFoundError(
                f"Pose inexistente para {character_path.name} ({pose_key}): {source}"
            )
        pose_id = slug(pose_key)
        if pose_id in used_pose_ids:
            raise ValueError(
                f"ID de pose duplicado en {character_path.name}: {pose_id}"
            )
        used_pose_ids.add(pose_id)
        human_form = pose_key == "human"
        pose_type = "video" if Path(source).suffix.lower() in {".mp4", ".webm"} else "image"
        animation = (
            collect_pose_animation(character_path, character, pose_key)
            if pose_type == "image"
            else None
        )
        result.append(
            {
                "id": pose_id,
                "key": pose_key,
                "label": pose_label(pose_key),
                "type": pose_type,
                "src": source,
                "alt": f"{character.get('name') or character_path.stem}, pose {pose_label(pose_key).lower()}.",
                "spoiler": human_form,
                **({"animation": animation} if animation else {}),
                **(
                    {
                        "spoilerReason": "Revela el resultado de la reversión del final luminoso."
                    }
                    if human_form
                    else {}
                ),
            }
        )
    return result


def collect_characters(used_ids: set[str]) -> list[dict[str, Any]]:
    items: list[dict[str, Any]] = []
    for character_path in sorted((ROOT / "characters").glob("*.json")):
        if character_path.stem.lower() in LEGACY_CHARACTER_KEYS:
            continue
        character = json.loads(character_path.read_text(encoding="utf-8"))
        poses = collect_character_poses(character_path, character)
        if not poses:
            continue
        source = poses[0]["src"]

        name = character.get("name") or normalize_words(character_path.stem)
        character_key = character_path.stem.lower()
        final_spoiler = character_key in {
            "airi_adult",
            "amalgama",
            "amalgama_final",
            "elion_husk",
        }
        item_id = unique_id("char", source, used_ids)
        items.append(
            {
                "id": item_id,
                "title": name,
                "description": (
                    f"Diseño canónico de {name} con {len(poses)} "
                    f"{'pose disponible' if len(poses) == 1 else 'poses disponibles'}."
                ),
                "type": "image",
                "category": "characters",
                "src": source,
                "alt": f"Diseño de personaje de {name}.",
                "fit": "contain",
                "downloadable": False,
                "spoiler": final_spoiler,
                **(
                    {"spoilerReason": "Revela una identidad o forma de la recta final."}
                    if final_spoiler
                    else {}
                ),
                "origin": "character",
                "poses": poses,
            }
        )
    return items


def open_rgba(path: Path) -> Image.Image:
    with Image.open(path) as source:
        return ImageOps.exif_transpose(source).convert("RGBA")


def thumbnail_canvas(
    path: Path, fit: str, size: tuple[int, int] = THUMB_SIZE
) -> Image.Image:
    image = open_rgba(path)
    if fit == "cover":
        fitted = ImageOps.fit(image, size, method=Image.Resampling.LANCZOS)
        background = Image.new("RGBA", size, (9, 7, 29, 255))
        background.alpha_composite(fitted)
        return background.convert("RGB")

    canvas = Image.new("RGBA", size, (9, 7, 29, 255))
    inset_x = max(12, round(size[0] * 0.06))
    inset_y = max(8, round(size[1] * 0.04))
    image.thumbnail((size[0] - inset_x * 2, size[1] - inset_y * 2), Image.Resampling.LANCZOS)
    x = (size[0] - image.width) // 2
    y = size[1] - image.height - inset_y
    canvas.alpha_composite(image, (x, y))
    return canvas.convert("RGB")


def video_frame(
    video_path: Path, size: tuple[int, int] = THUMB_SIZE
) -> Image.Image:
    with tempfile.TemporaryDirectory(prefix="illo-gallery-") as temp_dir:
        frame_path = Path(temp_dir) / "poster.png"
        command = [
            "ffmpeg",
            "-y",
            "-v",
            "error",
            "-ss",
            "2.70",
            "-i",
            str(video_path),
            "-frames:v",
            "1",
            str(frame_path),
        ]
        try:
            subprocess.run(command, check=True)
        except (FileNotFoundError, subprocess.CalledProcessError) as error:
            raise RuntimeError(
                "ffmpeg es necesario para generar la miniatura del vídeo de galería"
            ) from error
        return thumbnail_canvas(frame_path, "cover", size)


def generate_thumbnails(items: list[dict[str, Any]]) -> None:
    THUMB_DIR.mkdir(parents=True, exist_ok=True)
    expected: set[Path] = set()
    for item in items:
        destination = THUMB_DIR / f"{item['id']}.webp"
        expected.add(destination.resolve())
        source = ROOT / Path(item["src"])
        if item["type"] == "video":
            thumb = video_frame(source)
        else:
            thumb = thumbnail_canvas(source, item.get("fit", "cover"))
        thumb.save(destination, "WEBP", quality=82, method=6)
        item["thumbnail"] = to_relative(destination)

        for pose in item.get("poses", []):
            pose_destination = THUMB_DIR / f"{item['id']}--pose-{pose['id']}.webp"
            expected.add(pose_destination.resolve())
            if pose.get("type") == "video":
                pose_thumb = video_frame(ROOT / Path(pose["src"]), POSE_THUMB_SIZE)
            else:
                pose_thumb = thumbnail_canvas(
                    ROOT / Path(pose["src"]), "contain", POSE_THUMB_SIZE
                )
            pose_thumb.save(pose_destination, "WEBP", quality=80, method=6)
            pose["thumbnail"] = to_relative(pose_destination)

    # La carpeta es generada: quitar miniaturas huerfanas mantiene el catalogo limpio.
    for old_thumb in THUMB_DIR.glob("*.webp"):
        if old_thumb.resolve() not in expected:
            old_thumb.unlink()


def validate_items(items: list[dict[str, Any]]) -> None:
    ids: set[str] = set()
    sources: set[str] = set()
    for item in items:
        if item["id"] in ids:
            raise ValueError(f"ID de galeria duplicado: {item['id']}")
        if item["src"] in sources:
            raise ValueError(f"Recurso de galeria duplicado: {item['src']}")
        if item["category"] not in {entry["id"] for entry in CATEGORY_DEFINITIONS}:
            raise ValueError(f"Categoria desconocida: {item['category']}")
        if not (ROOT / Path(item["src"])).is_file():
            raise FileNotFoundError(f"No existe {item['src']}")
        pose_ids: set[str] = set()
        for pose in item.get("poses", []):
            if pose["id"] in pose_ids:
                raise ValueError(
                    f"ID de pose duplicado en {item['title']}: {pose['id']}"
                )
            if not (ROOT / Path(pose["src"])).is_file():
                raise FileNotFoundError(f"No existe {pose['src']}")
            for frame in pose.get("animation", {}).get("frames", []):
                if not (ROOT / Path(frame["src"])).is_file():
                    raise FileNotFoundError(f"No existe {frame['src']}")
            pose_ids.add(pose["id"])
        ids.add(item["id"])
        sources.add(item["src"])


def build_manifest(source_dir: Path, copy_assets: bool) -> dict[str, Any]:
    if copy_assets:
        copy_promotional_assets(source_dir)

    static_items = [*PROMOTIONAL_ITEMS]
    used_ids = {item["id"] for item in static_items}
    items = [dict(item) for item in static_items]
    items.extend(collect_referenced_art(used_ids))
    items.extend(collect_characters(used_ids))

    # Una ilustración promocional puede pasar a formar parte del guion canónico.
    # En ese caso se conserva su ficha curada y no se crea una segunda tarjeta.
    unique_items: list[dict[str, Any]] = []
    used_sources: set[str] = set()
    for item in items:
        if item["src"] in used_sources:
            continue
        used_sources.add(item["src"])
        unique_items.append(item)
    items = unique_items

    order = {entry["id"]: index for index, entry in enumerate(CATEGORY_DEFINITIONS)}
    items.sort(
        key=lambda item: (
            order.get(item["category"], 999),
            item.get("chapter", -1),
            item["title"].casefold(),
        )
    )
    validate_items(items)
    generate_thumbnails(items)

    counts = {
        category["id"]: sum(
            1 for item in items if item["category"] == category["id"]
        )
        for category in CATEGORY_DEFINITIONS
        if category["id"] != "all"
    }
    counts["all"] = len(items)
    counts["characterPoses"] = sum(
        len(item.get("poses", [])) for item in items if item["category"] == "characters"
    )
    counts["animatedCharacterPoses"] = sum(
        1
        for item in items
        if item["category"] == "characters"
        for pose in item.get("poses", [])
        if pose.get("animation")
    )
    return {
        "version": f"gallery-{date.today().isoformat()}-3",
        "generatedAt": date.today().isoformat(),
        "title": "Galería de Project AI.ri: Transfurmados",
        "description": "Arte canónico, ilustraciones promocionales y extras animados.",
        "categories": CATEGORY_DEFINITIONS,
        "counts": counts,
        "items": items,
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--source",
        type=Path,
        default=DEFAULT_SOURCE,
        help="Carpeta que contiene los siete recursos promocionales.",
    )
    parser.add_argument(
        "--no-copy",
        action="store_true",
        help="No volver a copiar los recursos promocionales; solo reconstruir catálogo y miniaturas.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    manifest = build_manifest(args.source.resolve(), not args.no_copy)
    MANIFEST_PATH.parent.mkdir(parents=True, exist_ok=True)
    MANIFEST_PATH.write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(
        f"Galería: {manifest['counts']['all']} entradas, "
        f"{len(list(THUMB_DIR.glob('*.webp')))} miniaturas -> {MANIFEST_PATH}"
    )


if __name__ == "__main__":
    main()
