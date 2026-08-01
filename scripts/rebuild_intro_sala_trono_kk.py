"""Reconstruye en 4K la introducción de la sala del trono de Kingdom Ketchup.

El plano se mantiene fijo a partir de una única sala 3D. Las piezas móviles son
renders 3D con transparencia (guindilla, gota y salpicadura); no se dibujan
formas vectoriales. El vídeo original aporta la duración, el audio y la guía de
ritmo de la lluvia de ketchup.
"""

from __future__ import annotations

import argparse
import math
import random
import subprocess
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont, ImageOps


WIDTH = 3840
HEIGHT = 2160
FPS = 24
FRAME_COUNT = 241
DURATION = (FRAME_COUNT - 1) / FPS


def font(path: Path, size: int) -> ImageFont.FreeTypeFont:
    try:
        return ImageFont.truetype(str(path), size=size)
    except OSError:
        return ImageFont.truetype("arialbd.ttf", size=size)


def draw_embossed_text(
    draw: ImageDraw.ImageDraw,
    center: tuple[int, int],
    text: str,
    typeface: ImageFont.FreeTypeFont,
    spacing: int,
    stroke: int,
) -> None:
    """Texto dorado nítido, centrado y con relieve discreto."""
    bbox = draw.multiline_textbbox(
        (0, 0), text, font=typeface, spacing=spacing, align="center", stroke_width=stroke
    )
    width = bbox[2] - bbox[0]
    height = bbox[3] - bbox[1]
    x = center[0] - width // 2
    y = center[1] - height // 2
    draw.multiline_text(
        (x + 7, y + 11), text, font=typeface, spacing=spacing, align="center",
        fill=(45, 9, 3, 205), stroke_width=stroke + 2, stroke_fill=(38, 6, 2, 210),
    )
    draw.multiline_text(
        (x, y), text, font=typeface, spacing=spacing, align="center",
        fill=(224, 137, 24, 255), stroke_width=stroke + 1, stroke_fill=(84, 27, 3, 255),
    )
    draw.multiline_text(
        (x, y - 3), text, font=typeface, spacing=spacing, align="center",
        fill=(255, 211, 91, 255), stroke_width=max(1, stroke - 2), stroke_fill=(255, 231, 128, 175),
    )


def build_master(source: Path, output: Path, font_path: Path) -> np.ndarray:
    image = Image.open(source).convert("RGB")
    image = ImageOps.fit(
        image, (WIDTH, HEIGHT), method=Image.Resampling.LANCZOS, centering=(0.5, 0.5)
    )
    image = ImageEnhance.Contrast(image).enhance(1.018)
    image = image.filter(ImageFilter.UnsharpMask(radius=1.15, percent=108, threshold=3))

    labels = Image.new("RGBA", image.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(labels)
    side_font = font(font_path, 50)
    center_font = font(font_path, 68)
    draw_embossed_text(draw, (330, 695), "IN\nKETCHUP\nWE\nTRUST", side_font, 12, 3)
    draw_embossed_text(draw, (3510, 695), "IN\nKETCHUP\nWE\nTRUST", side_font, 12, 3)
    draw_embossed_text(draw, (1920, 605), "KINGDOM\nKETCHUP", center_font, 9, 4)

    image = Image.alpha_composite(image.convert("RGBA"), labels).convert("RGB")
    output.parent.mkdir(parents=True, exist_ok=True)
    image.save(output, quality=97)
    return cv2.cvtColor(np.asarray(image), cv2.COLOR_RGB2BGR)


def load_sprite(path: Path) -> np.ndarray:
    image = Image.open(path).convert("RGBA")
    bbox = image.getchannel("A").getbbox()
    if bbox:
        image = image.crop(bbox)
    return cv2.cvtColor(np.asarray(image), cv2.COLOR_RGBA2BGRA)


def alpha_blend(frame: np.ndarray, sprite: np.ndarray, x: int, y: int, opacity: float = 1.0) -> None:
    if sprite.size == 0 or opacity <= 0:
        return
    h, w = sprite.shape[:2]
    x0, y0 = max(0, x), max(0, y)
    x1, y1 = min(frame.shape[1], x + w), min(frame.shape[0], y + h)
    if x0 >= x1 or y0 >= y1:
        return
    sx0, sy0 = x0 - x, y0 - y
    crop = sprite[sy0:sy0 + y1 - y0, sx0:sx0 + x1 - x0]
    alpha = crop[:, :, 3:4].astype(np.float32) / 255.0 * opacity
    region = frame[y0:y1, x0:x1].astype(np.float32)
    frame[y0:y1, x0:x1] = np.clip(
        crop[:, :, :3].astype(np.float32) * alpha + region * (1.0 - alpha), 0, 255
    ).astype(np.uint8)


def transformed(sprite: np.ndarray, width: int, angle: float = 0.0, y_scale: float = 1.0) -> np.ndarray:
    scale = width / sprite.shape[1]
    height = max(2, int(round(sprite.shape[0] * scale * y_scale)))
    resized = cv2.resize(sprite, (width, height), interpolation=cv2.INTER_LANCZOS4)
    if abs(angle) < 0.05:
        return resized
    h, w = resized.shape[:2]
    matrix = cv2.getRotationMatrix2D((w / 2, h / 2), angle, 1.0)
    cos_v, sin_v = abs(matrix[0, 0]), abs(matrix[0, 1])
    bound_w = max(2, int(h * sin_v + w * cos_v))
    bound_h = max(2, int(h * cos_v + w * sin_v))
    matrix[0, 2] += bound_w / 2 - w / 2
    matrix[1, 2] += bound_h / 2 - h / 2
    return cv2.warpAffine(
        resized, matrix, (bound_w, bound_h), flags=cv2.INTER_LANCZOS4,
        borderMode=cv2.BORDER_CONSTANT, borderValue=(0, 0, 0, 0),
    )


def motion_blurred(sprite: np.ndarray, distance: int) -> np.ndarray:
    """Desenfoque vertical direccional conservando el canal alfa."""
    distance = max(1, min(35, distance))
    if distance <= 2:
        return sprite
    kernel = np.zeros((distance, 1), dtype=np.float32)
    kernel[:, 0] = np.linspace(0.25, 1.0, distance, dtype=np.float32)
    kernel /= kernel.sum()
    channels = [cv2.filter2D(sprite[:, :, i], -1, kernel) for i in range(4)]
    return cv2.merge(channels)


def smoothstep(value: float) -> float:
    value = max(0.0, min(1.0, value))
    return value * value * (3.0 - 2.0 * value)


@dataclass(frozen=True)
class ChiliFall:
    start: float
    duration: float
    x: int
    drift: int
    width: int
    rotation: float
    spin: float
    depth: float


@dataclass(frozen=True)
class DropFall:
    start: float
    duration: float
    x: int
    impact_y: int
    width: int
    drift: int
    depth: float


# Ritmo basado en la lectura fotograma a fotograma del original: las guindillas
# dominan el primer tercio y las gotas grandes escalonan los impactos posteriores.
CHILIES = (
    ChiliFall(0.05, 2.90, 580, 90, 152, -28, 150, 0.82),
    ChiliFall(0.30, 3.05, 1150, -130, 126, 22, -125, 0.72),
    ChiliFall(0.58, 2.75, 1660, 75, 180, -52, 168, 1.00),
    ChiliFall(0.82, 3.10, 2260, 115, 139, 13, 130, 0.78),
    ChiliFall(1.10, 2.75, 2860, -95, 195, 38, -145, 1.08),
    ChiliFall(1.42, 2.70, 3320, -80, 122, -18, 118, 0.70),
    ChiliFall(1.78, 2.45, 1930, 65, 112, 70, -174, 0.67),
)

DROPS = (
    DropFall(0.35, 2.55, 340, 1590, 70, 35, 0.58),
    DropFall(0.95, 2.70, 3390, 1640, 84, -45, 0.65),
    DropFall(1.45, 2.40, 905, 1770, 108, 55, 0.78),
    DropFall(1.95, 2.85, 2790, 1730, 96, -60, 0.72),
    DropFall(2.50, 2.45, 1440, 1900, 136, 45, 0.90),
    DropFall(3.05, 2.75, 2340, 1840, 126, -40, 0.86),
    DropFall(3.65, 2.35, 520, 1790, 116, 55, 0.76),
    DropFall(4.15, 2.55, 3240, 1900, 152, -65, 0.97),
    DropFall(4.85, 2.45, 1110, 1970, 150, 35, 0.94),
    DropFall(5.40, 2.60, 2700, 2010, 166, -55, 1.02),
    DropFall(6.10, 2.30, 1710, 2070, 190, 35, 1.10),
    DropFall(6.65, 2.45, 2240, 2065, 180, -32, 1.08),
    DropFall(7.25, 2.20, 1940, 2135, 232, 0, 1.28),
)


def make_background_drops() -> tuple[DropFall, ...]:
    rng = random.Random(21609)
    events: list[DropFall] = []
    for _ in range(46):
        start = rng.uniform(-2.2, 8.8)
        duration = rng.uniform(2.6, 4.6)
        x = rng.randint(170, WIDTH - 170)
        impact = rng.randint(1300, 2020)
        width = rng.randint(18, 46)
        drift = rng.randint(-28, 28)
        events.append(DropFall(start, duration, x, impact, width, drift, rng.uniform(0.25, 0.48)))
    return tuple(events)


BACKGROUND_DROPS = make_background_drops()


def zoomed_master(master: np.ndarray, time_s: float) -> np.ndarray:
    eased = smoothstep(time_s / DURATION)
    zoom = 1.0 + 0.018 * eased
    crop_w = int(round(WIDTH / zoom))
    crop_h = int(round(HEIGHT / zoom))
    x0 = (WIDTH - crop_w) // 2
    y0 = max(0, min(HEIGHT - crop_h, (HEIGHT - crop_h) // 2 - int(13 * eased)))
    crop = master[y0:y0 + crop_h, x0:x0 + crop_w]
    return cv2.resize(crop, (WIDTH, HEIGHT), interpolation=cv2.INTER_CUBIC)


def composite_drop(
    frame: np.ndarray,
    drop_sprite: np.ndarray,
    splash_sprite: np.ndarray,
    event: DropFall,
    time_s: float,
    splash: bool,
) -> None:
    progress = (time_s - event.start) / event.duration
    if progress < 0:
        return

    if progress <= 1.0:
        eased = progress * progress
        width = max(8, int(event.width * (0.72 + 0.28 * eased)))
        sprite = transformed(drop_sprite, width, event.drift * 0.04, 0.86 + 0.32 * eased)
        sprite = motion_blurred(sprite, int(3 + 25 * eased))
        x = int(event.x + event.drift * math.sin(progress * math.pi))
        y = int(-sprite.shape[0] * 0.65 + (event.impact_y + sprite.shape[0] * 0.55) * eased)
        opacity = min(1.0, progress * 9.0)
        alpha_blend(frame, sprite, x - sprite.shape[1] // 2, y - sprite.shape[0] // 2, opacity)
        return

    if not splash:
        return
    after = time_s - (event.start + event.duration)
    if after < 0 or after > 0.82:
        return
    phase = after / 0.82
    splash_width = max(16, int(event.width * (1.45 + 1.25 * smoothstep(phase))))
    splash_img = transformed(splash_sprite, splash_width, 0.0, 0.82 - 0.25 * phase)
    opacity = 1.0 - smoothstep(max(0.0, (phase - 0.28) / 0.72))
    y = event.impact_y - int(splash_img.shape[0] * 0.72)
    x = event.x - splash_img.shape[1] // 2
    alpha_blend(frame, splash_img, x, y, opacity)
    # Reflejo corto sobre el suelo mojado; procede del mismo render 3D.
    if event.impact_y > 1740:
        reflection = cv2.flip(splash_img, 0)
        reflection[:, :, 3] = cv2.GaussianBlur(reflection[:, :, 3], (0, 0), 7)
        alpha_blend(frame, reflection, x, event.impact_y - int(splash_img.shape[0] * 0.03), opacity * 0.10)


def composite_chili(frame: np.ndarray, chili: np.ndarray, event: ChiliFall, time_s: float) -> None:
    progress = (time_s - event.start) / event.duration
    if not 0.0 <= progress <= 1.0:
        return
    eased = progress * progress
    width = int(event.width * (0.82 + 0.18 * eased))
    sprite = transformed(chili, width, event.rotation + event.spin * progress)
    sprite = motion_blurred(sprite, int(2 + 13 * eased))
    x = int(event.x + event.drift * math.sin(progress * math.pi))
    y = int(-sprite.shape[0] * 0.60 + (HEIGHT + sprite.shape[0] * 0.35) * eased)
    opacity = min(1.0, progress * 10.0, (1.0 - progress) * 8.0)
    alpha_blend(frame, sprite, x - sprite.shape[1] // 2, y - sprite.shape[0] // 2, opacity)


def render(
    master: np.ndarray,
    chili: np.ndarray,
    drop: np.ndarray,
    splash: np.ndarray,
    original: Path,
    output: Path,
) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    command = [
        "ffmpeg", "-y", "-hide_banner", "-loglevel", "warning",
        "-f", "rawvideo", "-pix_fmt", "bgr24", "-s", f"{WIDTH}x{HEIGHT}",
        "-r", str(FPS), "-i", "pipe:0", "-i", str(original),
        "-map", "0:v:0", "-map", "1:a:0?", "-c:v", "libx264",
        "-preset", "medium", "-crf", "19", "-profile:v", "high", "-level", "5.1",
        "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", "-ar", "48000",
        "-movflags", "+faststart", "-frames:v", str(FRAME_COUNT), str(output),
    ]
    process = subprocess.Popen(command, stdin=subprocess.PIPE)
    if process.stdin is None:
        raise RuntimeError("No se pudo abrir el pipe de FFmpeg")

    try:
        for frame_index in range(FRAME_COUNT):
            time_s = frame_index / FPS
            frame = zoomed_master(master, time_s)

            # Profundidad: primero la lluvia distante, después los elementos principales.
            for event in BACKGROUND_DROPS:
                composite_drop(frame, drop, splash, event, time_s, splash=False)
            for event in CHILIES:
                composite_chili(frame, chili, event, time_s)
            for event in DROPS:
                composite_drop(frame, drop, splash, event, time_s, splash=True)

            # Respiración luminosa mínima, como exposición de cámara, no como filtro plano.
            light = 0.994 + 0.009 * math.sin(time_s * 2.15) + 0.004 * math.sin(time_s * 8.7)
            frame = np.clip(frame.astype(np.float32) * light, 0, 255).astype(np.uint8)
            process.stdin.write(frame.tobytes())
            if frame_index % 24 == 0:
                print(f"Render 3D: {frame_index:03d}/{FRAME_COUNT}", flush=True)
    finally:
        process.stdin.close()

    return_code = process.wait()
    if return_code != 0:
        raise subprocess.CalledProcessError(return_code, command)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--chili", type=Path, required=True)
    parser.add_argument("--drop", type=Path, required=True)
    parser.add_argument("--splash", type=Path, required=True)
    parser.add_argument("--original", type=Path, required=True)
    parser.add_argument("--master-out", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--font", type=Path, default=Path(r"C:\Windows\Fonts\georgiab.ttf"))
    args = parser.parse_args()

    master = build_master(args.source, args.master_out, args.font)
    render(
        master,
        load_sprite(args.chili),
        load_sprite(args.drop),
        load_sprite(args.splash),
        args.original,
        args.output,
    )
    subprocess.run(
        [
            "ffprobe", "-v", "error", "-show_entries",
            "format=duration,size,bit_rate:stream=codec_name,width,height,r_frame_rate,nb_frames",
            "-of", "default=noprint_wrappers=1", str(args.output),
        ],
        check=True,
    )


if __name__ == "__main__":
    main()
