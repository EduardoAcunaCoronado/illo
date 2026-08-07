#!/usr/bin/env python3
"""Compone un fotograma de parpadeo sin alterar el resto del sprite.

La imagen generada sirve únicamente como fuente para las zonas oculares. El
lienzo, el canal alfa y todos los píxeles fuera de las máscaras proceden del
sprite original.
"""

from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter


def parse_box(value: str) -> tuple[int, int, int, int]:
    parts = tuple(int(part.strip()) for part in value.split(","))
    if len(parts) != 4:
        raise argparse.ArgumentTypeError("La máscara debe ser x1,y1,x2,y2")
    x1, y1, x2, y2 = parts
    if x2 <= x1 or y2 <= y1:
        raise argparse.ArgumentTypeError("La máscara debe tener área positiva")
    return parts


def estimate_registration_offset(
    source: Image.Image,
    generated: Image.Image,
    boxes: list[tuple[int, int, int, int]],
    radius: int,
) -> tuple[int, int]:
    """Alinea la fuente usando solamente un anillo exterior a los ojos.

    La búsqueda ignora el interior de las máscaras —que debe cambiar entre
    fotogramas— y compensa pequeñas diferencias globales de color antes de
    puntuar. Así una recreación de ImageGen puede aportar sólo los párpados sin
    introducir un salto de dos o tres píxeles en la animación.
    """

    if radius <= 0:
        return 0, 0

    sample = Image.new("L", source.size, 0)
    draw = ImageDraw.Draw(sample)
    margin = max(18, radius * 3)
    guard = 4
    for x1, y1, x2, y2 in boxes:
        draw.ellipse((x1 - margin, y1 - margin, x2 + margin, y2 + margin), fill=255)
        draw.ellipse((x1 - guard, y1 - guard, x2 + guard, y2 + guard), fill=0)

    source_rgb = np.asarray(source.convert("RGB"), dtype=np.float32)
    generated_rgb = np.asarray(generated.convert("RGB"), dtype=np.float32)
    source_alpha = np.asarray(source.getchannel("A"))
    generated_alpha = np.asarray(generated.getchannel("A"))
    ring = np.asarray(sample) > 0
    height, width = ring.shape
    best = (float("inf"), 0, 0)

    for offset_y in range(-radius, radius + 1):
        y0 = max(0, offset_y)
        y1 = min(height, height + offset_y)
        gy0 = y0 - offset_y
        gy1 = y1 - offset_y
        for offset_x in range(-radius, radius + 1):
            x0 = max(0, offset_x)
            x1 = min(width, width + offset_x)
            gx0 = x0 - offset_x
            gx1 = x1 - offset_x
            valid = (
                ring[y0:y1, x0:x1]
                & (source_alpha[y0:y1, x0:x1] > 220)
                & (generated_alpha[gy0:gy1, gx0:gx1] > 220)
            )
            if valid.sum() < 200:
                continue
            delta = (
                source_rgb[y0:y1, x0:x1][valid]
                - generated_rgb[gy0:gy1, gx0:gx1][valid]
            )
            color_offset = np.median(delta, axis=0)
            score = float(np.median(np.abs(delta - color_offset)))
            score += (abs(offset_x) + abs(offset_y)) * 0.01
            candidate = (score, offset_x, offset_y)
            if candidate < best:
                best = candidate

    return best[1], best[2]


def compose(
    source_path: Path,
    generated_path: Path,
    output_path: Path,
    boxes: list[tuple[int, int, int, int]],
    feather: float,
    match_ring: int,
    respect_generated_alpha: bool,
    offset_x: int,
    offset_y: int,
    auto_align: int,
    mask_from_eye_whites: bool = False,
    white_threshold: int = 185,
    white_chroma: int = 55,
    mask_dilate: int = 5,
) -> None:
    source = Image.open(source_path).convert("RGBA")
    generated_rgba = Image.open(generated_path).convert("RGBA").resize(
        source.size, Image.Resampling.LANCZOS
    )
    auto_x, auto_y = estimate_registration_offset(
        source, generated_rgba, boxes, auto_align
    )
    offset_x += auto_x
    offset_y += auto_y
    if offset_x or offset_y:
        shifted = Image.new("RGBA", source.size, (0, 0, 0, 0))
        shifted.alpha_composite(generated_rgba, (offset_x, offset_y))
        generated_rgba = shifted
    if auto_align > 0:
        print(f"Alineacion automatica: x={auto_x:+d}, y={auto_y:+d}")
    generated = generated_rgba.convert("RGB")

    mask = Image.new("L", source.size, 0)
    if mask_from_eye_whites:
        source_values = np.asarray(source.convert("RGB"), dtype=np.int16)
        luminance = source_values.mean(axis=2)
        chroma = source_values.max(axis=2) - source_values.min(axis=2)
        whites = (luminance >= white_threshold) & (chroma <= white_chroma)
        selected = np.zeros(whites.shape, dtype=np.uint8)
        for x1, y1, x2, y2 in boxes:
            selected[y1:y2, x1:x2] = np.where(
                whites[y1:y2, x1:x2], 255, selected[y1:y2, x1:x2]
            )
        mask = Image.fromarray(selected, "L")
        if mask_dilate > 0:
            kernel = mask_dilate * 2 + 1
            if kernel % 2 == 0:
                kernel += 1
            mask = mask.filter(ImageFilter.MaxFilter(kernel))
    else:
        draw = ImageDraw.Draw(mask)
        for box in boxes:
            draw.ellipse(box, fill=255)
    if feather > 0:
        mask = mask.filter(ImageFilter.GaussianBlur(feather))
    if respect_generated_alpha:
        mask_values_alpha = np.asarray(generated_rgba.getchannel("A"), dtype=np.float32)
        mask_values_base = np.asarray(mask, dtype=np.float32)
        mask = Image.fromarray(
            np.minimum(mask_values_base, mask_values_alpha).astype(np.uint8), "L"
        )

    source_rgb = np.asarray(source.convert("RGB"), dtype=np.float32)
    generated_rgb = np.asarray(generated, dtype=np.float32)
    mask_values = np.asarray(mask)
    if match_ring > 0:
        kernel = max(3, match_ring * 2 + 1)
        if kernel % 2 == 0:
            kernel += 1
        expanded = np.asarray(mask.filter(ImageFilter.MaxFilter(kernel)))
        generated_alpha = np.asarray(generated_rgba.getchannel("A"))
        source_alpha = np.asarray(source.getchannel("A"))
        color_samples = (
            (expanded > 20)
            & (mask_values < 20)
            & (generated_alpha > 240)
            & (source_alpha > 240)
        )
    else:
        color_samples = (mask_values > 20) & (generated_rgb.mean(axis=2) > 75)
    if color_samples.any():
        offset = np.median(
            source_rgb[color_samples] - generated_rgb[color_samples], axis=0
        )
        generated_rgb = np.clip(generated_rgb + offset, 0, 255)

    adjusted = Image.fromarray(generated_rgb.astype(np.uint8), "RGB").convert("RGBA")
    result = Image.composite(adjusted, source, mask)
    result.putalpha(source.getchannel("A"))

    # Garantía: ningún píxel totalmente exterior a la máscara puede cambiar.
    result_values = np.asarray(result)
    source_values = np.asarray(source)
    outside = mask_values == 0
    if not np.array_equal(result_values[outside], source_values[outside]):
        raise RuntimeError("Se detectaron cambios fuera de las zonas oculares")

    output_path.parent.mkdir(parents=True, exist_ok=True)
    if output_path.suffix.lower() == ".webp":
        result.save(output_path, "WEBP", lossless=True, method=6)
    else:
        result.save(output_path)

    written = Image.open(output_path).convert("RGBA")
    if written.size != source.size:
        raise RuntimeError("El archivo final no conserva las dimensiones")
    if written.getchannel("A").tobytes() != source.getchannel("A").tobytes():
        raise RuntimeError("El archivo final no conserva el canal alfa")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--generated", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--eye", type=parse_box, action="append", required=True)
    parser.add_argument("--feather", type=float, default=2.0)
    parser.add_argument(
        "--match-ring",
        type=int,
        default=0,
        help="Iguala el color usando un anillo exterior de este ancho en píxeles",
    )
    parser.add_argument(
        "--respect-generated-alpha",
        action="store_true",
        help="No compone píxeles transparentes de la imagen generada",
    )
    parser.add_argument("--offset-x", type=int, default=0)
    parser.add_argument("--offset-y", type=int, default=0)
    parser.add_argument(
        "--auto-align",
        type=int,
        default=0,
        metavar="RADIUS",
        help="Busca el mejor desplazamiento en un radio de N pixeles",
    )
    parser.add_argument(
        "--mask-from-eye-whites",
        action="store_true",
        help=(
            "Deriva la mascara de los blancos reales del ojo dentro de --eye; "
            "evita copiar nariz, cejas o piel de un redibujo completo"
        ),
    )
    parser.add_argument("--white-threshold", type=int, default=185)
    parser.add_argument("--white-chroma", type=int, default=55)
    parser.add_argument("--mask-dilate", type=int, default=5)
    args = parser.parse_args()
    compose(
        args.source,
        args.generated,
        args.output,
        args.eye,
        args.feather,
        args.match_ring,
        args.respect_generated_alpha,
        args.offset_x,
        args.offset_y,
        args.auto_align,
        args.mask_from_eye_whites,
        args.white_threshold,
        args.white_chroma,
        args.mask_dilate,
    )
    print(args.output.resolve())


if __name__ == "__main__":
    main()
