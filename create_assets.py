#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Generador de Assets para Visual Novel Engine
Crea imágenes PNG de prueba para todos los fondos y personajes
"""

from PIL import Image, ImageDraw, ImageFont
import os
import sys
from pathlib import Path

# Crear directorios si no existen
os.makedirs('assets/backgrounds', exist_ok=True)
os.makedirs('assets/characters', exist_ok=True)

def create_background(filename, color, title):
    """Crea una imagen de fondo con color y texto"""
    width, height = 1920, 1080
    img = Image.new('RGB', (width, height), color)
    draw = ImageDraw.Draw(img, 'RGBA')

    # Superposición oscura
    overlay = Image.new('RGBA', (width, height), (0, 0, 0, 30))
    img.paste(overlay, (0, 0), overlay)

    # Dibujar texto
    try:
        font = ImageFont.truetype("arial.ttf", 80)
    except:
        font = ImageFont.load_default()

    text_color = (255, 255, 255, 200)
    bbox = draw.textbbox((0, 0), title, font=font)
    text_w = bbox[2] - bbox[0]
    text_h = bbox[3] - bbox[1]
    x = (width - text_w) // 2
    y = (height - text_h) // 2

    draw.text((x, y), title, fill=text_color, font=font)

    filepath = f'assets/backgrounds/{filename}.png'
    img.save(filepath)
    print(f'[OK] {filepath}')

def create_character(filename, color, name):
    """Crea un sprite de personaje simple"""
    width, height = 300, 600
    img = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Convertir color hex a RGB si es necesario
    if isinstance(color, str):
        color = tuple(int(color[i:i+2], 16) for i in (1, 3, 5))

    # Dibujar silueta simple
    center_x = width // 2

    # Cabeza
    draw.ellipse([center_x - 40, 40, center_x + 40, 120], fill=color)

    # Cuerpo
    draw.rectangle([center_x - 35, 120, center_x + 35, 280], fill=color)

    # Brazos
    draw.rectangle([center_x - 90, 140, center_x - 35, 165], fill=color)
    draw.rectangle([center_x + 35, 140, center_x + 90, 165], fill=color)

    # Piernas
    draw.rectangle([center_x - 25, 280, center_x - 5, 480], fill=color)
    draw.rectangle([center_x + 5, 280, center_x + 25, 480], fill=color)

    # Nombre debajo
    try:
        font = ImageFont.truetype("arial.ttf", 18)
    except:
        font = ImageFont.load_default()

    text_color = (255, 255, 255, 220)
    bbox = draw.textbbox((0, 0), name, font=font)
    text_w = bbox[2] - bbox[0]
    x = (width - text_w) // 2

    draw.text((x, 510), name, fill=text_color, font=font)

    filepath = f'assets/characters/{filename}.png'
    img.save(filepath)
    print(f'[OK] {filepath}')

def main():
    print('')
    print('=' * 70)
    print('  GENERADOR DE ASSETS - Visual Novel Engine')
    print('=' * 70)
    print('')

    # Fondos necesarios
    print('[*] Generando FONDOS...')
    print('')

    backgrounds = [
        ('cafe', (139, 115, 85), 'Cafe Acogedor'),
        ('light_path', (200, 200, 100), 'Camino Iluminado'),
        ('dark_path', (50, 50, 50), 'Camino Oscuro'),
        ('night_forest', (20, 30, 50), 'Bosque Nocturno'),
        ('forest', (34, 139, 34), 'Bosque Oscuro'),
        ('apartment', (211, 211, 211), 'Apartamento'),
        ('temple', (74, 74, 58), 'Templo Antiguo'),
        ('beach', (135, 206, 235), 'Playa Soleada'),
        ('night', (26, 26, 58), 'Noche Estrellada'),
        ('dream', (100, 50, 150), 'Sueno Confuso'),
    ]

    for filename, color, title in backgrounds:
        create_background(filename, color, title)

    print('')
    print('[*] Generando PERSONAJES...')
    print('')

    # Personajes necesarios
    characters = [
        ('luna', 'ff69b4', 'Luna'),
        ('alex', '00d4ff', 'Alex'),
        ('sage', '90ee90', 'Sage'),
        ('raven', '4b0082', 'Raven'),
    ]

    for filename, color, name in characters:
        create_character(filename, color, name)

    print('')
    print('=' * 70)
    print('[OK] ASSETS CREADOS EXITOSAMENTE!')
    print('=' * 70)
    print('')
    print('Archivos generados:')
    print(f'  - {len(backgrounds)} fondos en assets/backgrounds/')
    print(f'  - {len(characters)} personajes en assets/characters/')
    print('')
    print('Ya puedes:')
    print('  1. Abrir index.html en tu navegador')
    print('  2. Hacer clic en "Comenzar"')
    print('  3. Disfrutar tu visual novel!')
    print('')
    print('=' * 70)
    print('')

if __name__ == '__main__':
    main()
