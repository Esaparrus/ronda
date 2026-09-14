"""Build the 1-100 Orden deck from the ChatGPT-generated face artwork.

The source illustration intentionally contains no text. Pillow adds the exact
numbering and deterministic colour/constellation variations so every card is
unique while the complete deck remains visually coherent.
"""

from __future__ import annotations

import colorsys
import math
import random
from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance, ImageFont, ImageOps


HERE = Path(__file__).resolve().parent
CARD_DIR = HERE.parent / "public" / "cards" / "orden"
SOURCE = HERE / "assets" / "order-card-face-art.png"
CARD_SIZE = (700, 1000)
OUTPUT_SIZE = (420, 600)

DISPLAY_FONT = Path("C:/Windows/Fonts/georgiab.ttf")
INDEX_FONT = Path("C:/Windows/Fonts/bahnschrift.ttf")


def fit_source(source: Image.Image) -> Image.Image:
    """Crop the generated portrait to the exact 7:10 card ratio."""

    target_ratio = CARD_SIZE[0] / CARD_SIZE[1]
    source_ratio = source.width / source.height
    if source_ratio < target_ratio:
        target_height = round(source.width / target_ratio)
        top = (source.height - target_height) // 2
        source = source.crop((0, top, source.width, top + target_height))
    elif source_ratio > target_ratio:
        target_width = round(source.height * target_ratio)
        left = (source.width - target_width) // 2
        source = source.crop((left, 0, left + target_width, source.height))
    return source.resize(CARD_SIZE, Image.Resampling.LANCZOS).convert("RGB")


def card_palette(value: int) -> tuple[tuple[int, int, int], tuple[int, int, int]]:
    """Move through five readable colour families as the deck ascends."""

    anchors = (190, 216, 258, 338, 22, 48)
    position = (value - 1) / 99 * (len(anchors) - 1)
    index = min(int(position), len(anchors) - 2)
    fraction = position - index
    hue_a = anchors[index]
    hue_b = anchors[index + 1]
    hue = hue_a + (hue_b - hue_a) * fraction

    dark = colorsys.hsv_to_rgb(hue / 360, 0.67, 0.37)
    accent = colorsys.hsv_to_rgb(hue / 360, 0.58, 0.76)
    return (
        tuple(round(channel * 255) for channel in dark),
        tuple(round(channel * 255) for channel in accent),
    )


def tint_art(base: Image.Image, value: int) -> tuple[Image.Image, tuple[int, int, int]]:
    dark, accent = card_palette(value)
    gray = ImageOps.grayscale(base)
    themed = ImageOps.colorize(gray, black=dark, white=(246, 224, 184))
    card = Image.blend(base, themed, 0.38)

    # A soft, value-specific ink wash makes adjacent cards distinct without
    # compromising the quiet ivory number medallion.
    wash = Image.new("RGB", CARD_SIZE, accent)
    mask = Image.new("L", CARD_SIZE, 0)
    mask_draw = ImageDraw.Draw(mask)
    sweep = (value * 37) % 700
    mask_draw.ellipse((sweep - 440, -300, sweep + 520, 1320), fill=38)
    mask = mask.filter(ImageFilter.GaussianBlur(160))
    card.paste(Image.blend(card, wash, 0.28), mask=mask)
    return ImageEnhance.Contrast(card).enhance(1.04), accent


def fitted_font(text: str, max_width: int) -> ImageFont.FreeTypeFont:
    size = 310
    while size > 120:
        font = ImageFont.truetype(DISPLAY_FONT, size)
        bounds = font.getbbox(text, stroke_width=4)
        if bounds[2] - bounds[0] <= max_width:
            return font
        size -= 4
    return ImageFont.truetype(DISPLAY_FONT, size)


def draw_center_number(card: Image.Image, value: int, accent: tuple[int, int, int]) -> None:
    draw = ImageDraw.Draw(card)
    text = str(value)
    font = fitted_font(text, 438)
    bounds = draw.textbbox((0, 0), text, font=font, stroke_width=3)
    width = bounds[2] - bounds[0]
    height = bounds[3] - bounds[1]
    x = (CARD_SIZE[0] - width) / 2 - bounds[0]
    y = 500 - height / 2 - bounds[1] - 6

    draw.text(
        (x + 7, y + 10),
        text,
        font=font,
        fill=(44, 31, 28, 105),
        stroke_width=6,
        stroke_fill=(44, 31, 28, 70),
    )
    draw.text(
        (x, y),
        text,
        font=font,
        fill=(20, 37, 48),
        stroke_width=4,
        stroke_fill=accent,
    )


def draw_corner_index(card: Image.Image, value: int, accent: tuple[int, int, int]) -> None:
    text = str(value)
    size = 61 if value < 10 else 52 if value < 100 else 43
    font = ImageFont.truetype(INDEX_FONT, size)
    ink = (250, 239, 214)
    stroke = (18, 34, 43)

    def make_index() -> Image.Image:
        tile = Image.new("RGBA", (170, 116), (0, 0, 0, 0))
        draw = ImageDraw.Draw(tile)
        bounds = draw.textbbox((0, 0), text, font=font, stroke_width=3)
        width = bounds[2] - bounds[0]
        draw.rounded_rectangle((5, 6, width + 31, 87), radius=18, fill=(*stroke, 178), outline=(*accent, 230), width=3)
        draw.text((19 - bounds[0], 42 - (bounds[1] + bounds[3]) / 2), text, font=font, fill=ink, stroke_width=2, stroke_fill=stroke)
        return tile

    corner = make_index()
    card.paste(corner, (35, 36), corner)
    inverse = corner.rotate(180)
    card.paste(inverse, (CARD_SIZE[0] - 35 - inverse.width, CARD_SIZE[1] - 36 - inverse.height), inverse)


def draw_constellation(card: Image.Image, value: int, accent: tuple[int, int, int]) -> None:
    rng = random.Random(value)
    overlay = Image.new("RGBA", CARD_SIZE, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    count = 3 + (value - 1) // 20
    points: list[tuple[float, float]] = []
    for index in range(count):
        angle = (math.tau * index / count) + rng.uniform(-0.19, 0.19)
        radius_x = rng.uniform(236, 274)
        radius_y = rng.uniform(330, 386)
        point = (350 + math.cos(angle) * radius_x, 500 + math.sin(angle) * radius_y)
        points.append(point)
    for first, second in zip(points, points[1:] + points[:1]):
        draw.line((first, second), fill=(*accent, 80), width=2)
    for x, y in points:
        radius = rng.choice((4, 5, 7))
        draw.ellipse((x - radius, y - radius, x + radius, y + radius), fill=(250, 235, 204, 225), outline=(*accent, 255), width=2)
    card.paste(overlay, (0, 0), overlay)


def build_card(base: Image.Image, value: int) -> Image.Image:
    card, accent = tint_art(base, value)
    draw_constellation(card, value, accent)
    draw_center_number(card, value, accent)
    draw_corner_index(card, value, accent)
    return card


def main() -> None:
    if not SOURCE.exists():
        raise SystemExit(f"Missing generated source artwork: {SOURCE}")

    CARD_DIR.mkdir(parents=True, exist_ok=True)
    base = fit_source(Image.open(SOURCE))
    for value in range(1, 101):
        build_card(base, value).resize(OUTPUT_SIZE, Image.Resampling.LANCZOS).save(
            CARD_DIR / f"{value}.webp",
            "WEBP",
            quality=86,
            method=6,
        )
    print(f"Generated 100 cards in {CARD_DIR}")


if __name__ == "__main__":
    # Imported here to keep the palette/math helpers easy to reuse in tests.
    from PIL import ImageFilter

    main()
