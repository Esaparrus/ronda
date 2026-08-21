"""Limpia fondos de tablero/blanco de PNGs aislados y los deja recortados.

Muchas galerías de PNG muestran transparencia como un tablero que acaba
incrustado en la descarga. El fondo se elimina solo cuando está conectado con
el borde, así que las zonas blancas cerradas de ojos o ropa se conservan.
"""

from __future__ import annotations

import argparse
from collections import deque
from pathlib import Path

from PIL import Image


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Limpia y recorta un PNG de Matiz")
    parser.add_argument("--input", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--max-size", default=900, type=int)
    return parser.parse_args()


def is_flat_background(pixel: tuple[int, int, int, int]) -> bool:
    red, green, blue, alpha = pixel
    if alpha == 0:
        return True
    return max(red, green, blue) - min(red, green, blue) <= 18 and min(red, green, blue) >= 175


def remove_edge_background(image: Image.Image, max_size: int) -> Image.Image:
    rgba = image.convert("RGBA")
    width, height = rgba.size
    pixels = rgba.load()
    remove = bytearray(width * height)
    pending: deque[tuple[int, int]] = deque()

    def enqueue(x: int, y: int) -> None:
        index = y * width + x
        if remove[index] or not is_flat_background(pixels[x, y]):
            return
        remove[index] = 1
        pending.append((x, y))

    for x in range(width):
        enqueue(x, 0)
        enqueue(x, height - 1)
    for y in range(height):
        enqueue(0, y)
        enqueue(width - 1, y)

    while pending:
        x, y = pending.popleft()
        for next_x, next_y in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if 0 <= next_x < width and 0 <= next_y < height:
                enqueue(next_x, next_y)

    for index, should_remove in enumerate(remove):
        if should_remove:
            pixels[index % width, index // width] = (0, 0, 0, 0)

    bbox = rgba.getchannel("A").getbbox()
    if bbox is None:
        raise ValueError("No se encontró ningún personaje después de limpiar el fondo")
    left, top, right, bottom = bbox
    padding = 8
    rgba = rgba.crop((max(0, left - padding), max(0, top - padding), min(width, right + padding), min(height, bottom + padding)))
    rgba.thumbnail((max_size, max_size), Image.Resampling.LANCZOS)
    return rgba


def main() -> None:
    args = parse_args()
    cleaned = remove_edge_background(Image.open(args.input), args.max_size)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    cleaned.save(args.output)
    print({"output": str(args.output), "size": cleaned.size})


if __name__ == "__main__":
    main()
