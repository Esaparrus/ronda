from collections import deque
from pathlib import Path
import re

from PIL import Image, ImageDraw, ImageFilter, ImageOps


ROOT = Path(r"C:\Users\Esparrus\Desktop\cartas")
SOURCE = ROOT / "apps" / "web" / "public" / "cards"
OUTPUT = SOURCE / "pixel-art-final"
LOW_SIZE = (120, 160)
FINAL_SIZE = (480, 640)

WHITE = (255, 255, 255)
BLACK = (0, 0, 0)
RED = (220, 38, 28)
BLUE = (26, 96, 184)
GOLD = (237, 187, 28)
GREEN = (32, 126, 56)
BROWN = (122, 74, 22)
GRAY = (116, 120, 128)
PALETTE = [WHITE, BLACK, RED, BLUE, GOLD, GREEN, BROWN, GRAY, (241, 107, 26), (19, 154, 142)]
SUIT_COLOR = {"oros": GOLD, "copas": RED, "espadas": BLUE, "bastos": GREEN}

DIGITS = {
    "0": ("111", "101", "101", "101", "111"),
    "1": ("010", "110", "010", "010", "111"),
    "2": ("111", "001", "111", "100", "111"),
    "3": ("111", "001", "111", "001", "111"),
    "4": ("101", "101", "111", "001", "001"),
    "5": ("111", "100", "111", "001", "111"),
    "6": ("111", "100", "111", "101", "111"),
    "7": ("111", "001", "001", "001", "001"),
    "8": ("111", "101", "111", "101", "111"),
    "9": ("111", "101", "111", "001", "111"),
}


def draw_digit(draw, x, y, char, color, scale=2):
    glyph = DIGITS[char]
    for row, line in enumerate(glyph):
        for col, bit in enumerate(line):
            if bit == "1":
                draw.rectangle(
                    (x + col * scale, y + row * scale,
                     x + col * scale + scale - 1, y + row * scale + scale - 1),
                    fill=color,
                )


def draw_number(draw, x, y, value, color):
    text = str(value)
    for i, char in enumerate(text):
        draw_digit(draw, x + i * 8, y, char, color)


def draw_suit_icon(draw, cx, cy, suit, color, scale=1):
    if suit == "oros":
        r = 6 * scale
        draw.ellipse((cx - r, cy - r, cx + r, cy + r), fill=BLACK)
        draw.ellipse((cx - r + scale, cy - r + scale, cx + r - scale, cy + r - scale), fill=color)
        draw.rectangle((cx - scale, cy - scale, cx + scale, cy + scale), fill=GOLD)
    elif suit == "copas":
        w = 7 * scale
        h = 7 * scale
        draw.rectangle((cx - w, cy - h, cx + w, cy + h // 2), fill=BLACK)
        draw.polygon([(cx - w, cy + h // 2), (cx + w, cy + h // 2), (cx + 2 * scale, cy + h), (cx - 2 * scale, cy + h)], fill=BLACK)
        draw.rectangle((cx - w + scale, cy - h + scale, cx + w - scale, cy + h // 2 - scale), fill=color)
        draw.rectangle((cx - scale, cy + h // 2, cx + scale, cy + h + 3 * scale), fill=BLACK)
        draw.rectangle((cx - 4 * scale, cy + h + 3 * scale, cx + 4 * scale, cy + h + 5 * scale), fill=BLACK)
    elif suit == "espadas":
        draw.polygon([(cx, cy - 11 * scale), (cx + 4 * scale, cy + 4 * scale), (cx, cy + 7 * scale), (cx - 4 * scale, cy + 4 * scale)], fill=BLACK)
        draw.polygon([(cx, cy - 9 * scale), (cx + 2 * scale, cy + 3 * scale), (cx, cy + 5 * scale), (cx - 2 * scale, cy + 3 * scale)], fill=color)
        draw.rectangle((cx - 7 * scale, cy + 5 * scale, cx + 7 * scale, cy + 7 * scale), fill=GOLD)
        draw.rectangle((cx - scale, cy + 7 * scale, cx + scale, cy + 11 * scale), fill=RED)
    else:
        draw.line((cx - 7 * scale, cy + 8 * scale, cx + 7 * scale, cy - 8 * scale), fill=BLACK, width=4 * scale)
        draw.line((cx - 6 * scale, cy + 7 * scale, cx + 6 * scale, cy - 7 * scale), fill=color, width=2 * scale)
        draw.ellipse((cx - 9 * scale, cy - 11 * scale, cx - scale, cy - 3 * scale), fill=BLACK)
        draw.ellipse((cx + scale, cy - 11 * scale, cx + 9 * scale, cy - 3 * scale), fill=BLACK)
        draw.ellipse((cx - 9 * scale, cy + 3 * scale, cx - scale, cy + 11 * scale), fill=BLACK)
        draw.ellipse((cx + scale, cy + 3 * scale, cx + 9 * scale, cy + 11 * scale), fill=BLACK)
        draw.ellipse((cx - 7 * scale, cy - 9 * scale, cx - 3 * scale, cy - 5 * scale), fill=color)
        draw.ellipse((cx + 3 * scale, cy - 9 * scale, cx + 7 * scale, cy - 5 * scale), fill=color)
        draw.ellipse((cx - 7 * scale, cy + 5 * scale, cx - 3 * scale, cy + 9 * scale), fill=color)
        draw.ellipse((cx + 3 * scale, cy + 5 * scale, cx + 7 * scale, cy + 9 * scale), fill=color)


def remove_connected_background(image):
    rgb = image.convert("RGB")
    width, height = rgb.size
    pixels = rgb.load()
    border = []
    for x in range(width):
        border.extend([(x, 0), (x, height - 1)])
    for y in range(height):
        border.extend([(0, y), (width - 1, y)])
    samples = [pixels[x, y] for x, y in border]
    bg = tuple(sum(c[i] for c in samples) // len(samples) for i in range(3))

    def is_background(x, y):
        r, g, b = pixels[x, y]
        dist = sum((v - bg[i]) ** 2 for i, v in enumerate((r, g, b))) ** 0.5
        maxc, minc = max(r, g, b), min(r, g, b)
        low_saturation_light = (maxc - minc) < 34 and maxc > 145
        return dist < 58 or low_saturation_light

    seen = set()
    queue = deque()
    for point in border:
        if point not in seen and is_background(*point):
            seen.add(point)
            queue.append(point)
    while queue:
        x, y = queue.popleft()
        for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
            if 0 <= nx < width and 0 <= ny < height and (nx, ny) not in seen and is_background(nx, ny):
                seen.add((nx, ny))
                queue.append((nx, ny))

    out = rgb.convert("RGBA")
    alpha = Image.new("L", (width, height), 255)
    alpha_pixels = alpha.load()
    for x, y in seen:
        alpha_pixels[x, y] = 0
    out.putalpha(alpha)
    return out


def fixed_palette(image):
    palette_image = Image.new("P", (len(PALETTE), 1))
    flat_palette = [channel for color in PALETTE for channel in color]
    palette_image.putpalette(flat_palette + [0] * (768 - len(flat_palette)))
    palette_image.putdata(range(len(PALETTE)))
    return image.convert("RGB").quantize(palette=palette_image, dither=Image.Dither.NONE).convert("RGB")


def prepare_figure(source_image):
    # Strip the old rounded frame and leave only the figure artwork.
    crop = source_image.crop((58, 68, 422, 600))
    cutout = remove_connected_background(crop)
    # Remove remnants of the source card's long gray inner frame near the crop edges.
    pixels = cutout.load()
    width, height = cutout.size
    for y in range(height):
        for x in range(width):
            if pixels[x, y][3] == 0:
                continue
            r, g, b, _ = pixels[x, y]
            near_gray = max(r, g, b) - min(r, g, b) < 24 and 90 < (r + g + b) / 3 < 220
            near_edge = x < 34 or x >= width - 34 or y < 28 or y >= height - 28
            if near_gray and near_edge:
                pixels[x, y] = (0, 0, 0, 0)
    bbox = cutout.getbbox()
    if bbox:
        cutout = cutout.crop(bbox)
    cutout.thumbnail((82, 112), Image.Resampling.LANCZOS)
    cutout = cutout.resize(cutout.size, Image.Resampling.NEAREST)
    alpha = cutout.getchannel("A")
    outline_alpha = alpha.filter(ImageFilter.MaxFilter(3))
    outline = Image.new("RGBA", cutout.size, BLACK + (0,))
    outline.putalpha(outline_alpha)
    outline.alpha_composite(cutout)
    return outline


def pip_positions(value):
    layouts = {
        1: [(0, 0)],
        2: [(0, -1), (0, 1)],
        3: [(0, -1), (0, 0), (0, 1)],
        4: [(-1, -1), (1, -1), (-1, 1), (1, 1)],
        5: [(-1, -1), (1, -1), (0, 0), (-1, 1), (1, 1)],
        6: [(-1, -1), (-1, 0), (-1, 1), (1, -1), (1, 0), (1, 1)],
        7: [(-1, -1), (-1, 0), (-1, 1), (0, 0), (1, -1), (1, 0), (1, 1)],
    }
    return layouts[value]


def add_corner_index(card, value, suit):
    layer = Image.new("RGBA", card.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    color = SUIT_COLOR[suit]
    draw_number(draw, 5, 5, value, color)
    draw_suit_icon(draw, 9, 28, suit, color, scale=1)
    bottom = layer.transpose(Image.Transpose.ROTATE_180)
    card.alpha_composite(layer)
    card.alpha_composite(bottom)


def build_card(source_image, suit, value):
    canvas = Image.new("RGBA", LOW_SIZE, WHITE + (255,))
    draw = ImageDraw.Draw(canvas)

    # One shared white card, one shared black frame, same margins everywhere.
    draw.rectangle((20, 13, 99, 147), outline=BLACK, width=1)

    if value <= 7:
        pip_layer = Image.new("RGBA", LOW_SIZE, (0, 0, 0, 0))
        pip_draw = ImageDraw.Draw(pip_layer)
        xs = { -1: 40, 0: 60, 1: 80 }
        ys = { -1: 47, 0: 80, 1: 113 }
        for px, py in pip_positions(value):
            draw_suit_icon(pip_draw, xs[px], ys[py], suit, SUIT_COLOR[suit], scale=1)
        canvas.alpha_composite(pip_layer)
    else:
        figure = prepare_figure(source_image)
        x = (LOW_SIZE[0] - figure.width) // 2
        y = 22 + max(0, (112 - figure.height) // 2)
        canvas.alpha_composite(figure, (x, y))

    add_corner_index(canvas, value, suit)
    canvas = fixed_palette(canvas.convert("RGB"))
    return canvas.resize(FINAL_SIZE, Image.Resampling.NEAREST)


def main():
    OUTPUT.mkdir(parents=True, exist_ok=True)
    for source in sorted(SOURCE.glob("*.png")):
        match = re.match(r"(oros|copas|espadas|bastos)-(\d+)\.png$", source.name)
        if not match:
            continue
        suit, value_text = match.groups()
        value = int(value_text)
        with Image.open(source) as source_image:
            result = build_card(source_image.convert("RGB"), suit, value)
        result.save(OUTPUT / source.name, format="PNG", optimize=True)
    print(f"created {len(list(OUTPUT.glob('*.png')))} cards in {OUTPUT}")


if __name__ == "__main__":
    main()
