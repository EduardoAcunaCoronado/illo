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


def compose(
    source_path: Path,
    generated_path: Path,
    output_path: Path,
    boxes: list[tuple[int, int, int, int]],
    feather: float,
    match_ring: int,
    respect_generated_alpha: bool,
) -> None:
    source = Image.open(source_path).convert("RGBA")
    generated_rgba = Image.open(generated_path).convert("RGBA").resize(
        source.size, Image.Resampling.LANCZOS
    )
    generated = generated_rgba.convert("RGB")

    mask = Image.new("L", source.size, 0)
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
    args = parser.parse_args()
    compose(
        args.source,
        args.generated,
        args.output,
        args.eye,
        args.feather,
        args.match_ring,
        args.respect_generated_alpha,
    )
    print(args.output.resolve())


if __name__ == "__main__":
    main()
