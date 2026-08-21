"""Prepara un dibujo para Matiz.

Ejemplo:
  python prepare-matiz-assets.py \
    --input ../../public/games/matiz/popeye-1929.jpg \
    --output-dir ../../public/games/matiz \
    --name popeye-camiseta \
    --seed 110 175 --tolerance 75 \
    --region 60 135 220 220

La base resultante conserva el dibujo, pero hace transparentes los píxeles
seleccionados. La máscara guarda esa zona como alfa para que el navegador
pueda pintarla con el color que el jugador elija.
"""

from __future__ import annotations

import argparse
import colorsys
import json
import math
from collections import deque
from pathlib import Path

from PIL import Image


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Genera base y máscara para un reto de Matiz")
    parser.add_argument("--input", required=True, type=Path)
    parser.add_argument("--output-dir", required=True, type=Path)
    parser.add_argument("--name", required=True)
    parser.add_argument("--seed", required=True, nargs=2, type=int, metavar=("X", "Y"))
    parser.add_argument("--tolerance", default=42, type=float)
    parser.add_argument("--region", nargs=4, type=int, metavar=("LEFT", "TOP", "RIGHT", "BOTTOM"))
    parser.add_argument("--connected", action="store_true", help="Solo la zona conectada al píxel elegido")
    parser.add_argument("--hue-tolerance", type=float, help="Tolerancia de tono en grados HSV")
    parser.add_argument("--min-saturation", default=0, type=float, help="Saturación mínima en porcentaje cuando se filtra por tono")
    return parser.parse_args()


def color_distance(left: tuple[int, int, int], right: tuple[int, int, int]) -> float:
    return math.sqrt(sum((left[index] - right[index]) ** 2 for index in range(3)))


def hsv_color(color: tuple[int, int, int]) -> tuple[float, float, float]:
    red, green, blue = (channel / 255 for channel in color)
    hue, saturation, value = colorsys.rgb_to_hsv(red, green, blue)
    return hue * 360, saturation * 100, value * 100


def in_region(x: int, y: int, region: tuple[int, int, int, int] | None) -> bool:
    if region is None:
        return True
    left, top, right, bottom = region
    return left <= x < right and top <= y < bottom


def select_pixels(
    image: Image.Image,
    seed: tuple[int, int],
    tolerance: float,
    region: tuple[int, int, int, int] | None,
    connected: bool,
    hue_tolerance: float | None,
    min_saturation: float,
) -> bytearray:
    rgb = image.convert("RGB")
    width, height = rgb.size
    pixels = rgb.load()
    seed_x, seed_y = seed
    if not (0 <= seed_x < width and 0 <= seed_y < height):
        raise ValueError(f"La semilla queda fuera de la imagen: {seed}")

    target = pixels[seed_x, seed_y]
    target_hue, _, _ = hsv_color(target)
    selected = bytearray(width * height)

    def matches(x: int, y: int) -> bool:
        if not in_region(x, y, region):
            return False
        candidate = pixels[x, y]
        if color_distance(candidate, target) > tolerance and hue_tolerance is None:
            return False
        if hue_tolerance is None:
            return True
        candidate_hue, candidate_saturation, _ = hsv_color(candidate)
        hue_distance = abs(candidate_hue - target_hue)
        hue_distance = min(hue_distance, 360 - hue_distance)
        return candidate_saturation >= min_saturation and hue_distance <= hue_tolerance

    if connected:
        if not matches(seed_x, seed_y):
            raise ValueError("El píxel elegido no entra en la tolerancia")
        pending = deque([(seed_x, seed_y)])
        selected[seed_y * width + seed_x] = 1
        while pending:
            x, y = pending.popleft()
            for next_x, next_y in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                if not (0 <= next_x < width and 0 <= next_y < height):
                    continue
                index = next_y * width + next_x
                if selected[index] or not matches(next_x, next_y):
                    continue
                selected[index] = 1
                pending.append((next_x, next_y))
    else:
        for y in range(height):
            for x in range(width):
                if matches(x, y):
                    selected[y * width + x] = 1

    return selected


def write_assets(image: Image.Image, selected: bytearray, output_dir: Path, name: str) -> dict[str, object]:
    rgba = image.convert("RGBA")
    width, height = rgba.size
    base = bytearray(rgba.tobytes())
    mask = bytearray(width * height * 4)

    for pixel_index, is_selected in enumerate(selected):
        if not is_selected:
            continue
        base_index = pixel_index * 4
        # El color original desaparece de la base. El canvas lo vuelve a
        # pintar encima usando el color del jugador y la máscara alfa.
        base[base_index + 3] = 0
        mask[base_index] = 255
        mask[base_index + 1] = 255
        mask[base_index + 2] = 255
        mask[base_index + 3] = 255

    output_dir.mkdir(parents=True, exist_ok=True)
    base_path = output_dir / f"{name}-base.png"
    mask_path = output_dir / f"{name}-mask.png"
    Image.frombytes("RGBA", (width, height), bytes(base)).save(base_path)
    Image.frombytes("RGBA", (width, height), bytes(mask)).save(mask_path)

    return {
        "image": f"/games/matiz/{base_path.name}",
        "mask": f"/games/matiz/{mask_path.name}",
        "width": width,
        "height": height,
        "selectedPixels": sum(selected),
    }


def main() -> None:
    args = parse_args()
    image = Image.open(args.input)
    selected = select_pixels(
        image=image,
        seed=(args.seed[0], args.seed[1]),
        tolerance=args.tolerance,
        region=tuple(args.region) if args.region else None,
        connected=args.connected,
        hue_tolerance=args.hue_tolerance,
        min_saturation=args.min_saturation,
    )
    asset = write_assets(image, selected, args.output_dir, args.name)
    metadata_path = args.output_dir / f"{args.name}.json"
    metadata_path.write_text(json.dumps(asset, indent=2), encoding="utf-8")
    print(json.dumps(asset, indent=2))


if __name__ == "__main__":
    main()
