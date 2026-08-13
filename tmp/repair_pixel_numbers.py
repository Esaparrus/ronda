from pathlib import Path
import re
from statistics import median

import cv2
import numpy as np
from PIL import Image, ImageDraw


ROOT = Path(r"C:\Users\Esparrus\Desktop\cartas")
CARDS = ROOT / "apps" / "web" / "public" / "cards" / "pixel-art-simple"
CARD_RE = re.compile(r"(oros|copas|espadas|bastos)-(1|2|3|4|5|6|7|10|11|12)\.png$")
LOW_SIZE = (120, 168)

SUIT_COLORS = {
    "oros": (143, 92, 8),
    "copas": (179, 27, 22),
    "espadas": (17, 79, 149),
    "bastos": (20, 105, 47),
}

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


def draw_number(draw, x, y, text, color):
    for digit_index, char in enumerate(text):
        glyph = DIGITS[char]
        start_x = x + digit_index * 4
        for row, line in enumerate(glyph):
            for col, bit in enumerate(line):
                if bit == "1":
                    draw.point((start_x + col, y + row), fill=color)


def repair(path):
    match = CARD_RE.fullmatch(path.name)
    if not match:
        return
    suit, value = match.groups()
    with Image.open(path) as source:
        low = source.convert("RGB").resize(LOW_SIZE, Image.Resampling.NEAREST)

    text_width = len(value) * 4 - 1
    x = 17 + (10 - text_width) // 2
    y = 19

    # Inpaint only dark/colored digit pixels in a narrow corner window.
    # Long frame lines are protected, so no large rectangle is erased.
    rgb = np.array(low)
    gray = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY)
    saturation = rgb.max(axis=2) - rgb.min(axis=2)
    candidate = (gray < 205) | (saturation > 30)
    region = np.zeros_like(candidate, dtype=bool)
    region[16:30, 14:29] = True
    def longest_run(values):
        best = current = 0
        for value in values:
            current = current + 1 if value else 0
            best = max(best, current)
        return best

    row_lines = [longest_run(candidate[row, :]) > 20 for row in range(candidate.shape[0])]
    col_lines = [longest_run(candidate[:, col]) > 20 for col in range(candidate.shape[1])]
    protected = np.zeros_like(candidate, dtype=bool)
    for row, is_line in enumerate(row_lines):
        if is_line:
            protected[row, 14:29] = True
    for col, is_line in enumerate(col_lines):
        if is_line:
            protected[16:30, col] = True
    top_mask = region & candidate & ~protected
    full_mask = top_mask | np.rot90(top_mask, 2)
    bgr = cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)
    cleaned = cv2.inpaint(bgr, (full_mask.astype(np.uint8) * 255), 2, cv2.INPAINT_TELEA)
    low = Image.fromarray(cv2.cvtColor(cleaned, cv2.COLOR_BGR2RGB), "RGB").convert("RGBA")

    index_layer = Image.new("RGBA", LOW_SIZE, (0, 0, 0, 0))
    index_draw = ImageDraw.Draw(index_layer)
    draw_number(index_draw, x, y, value, SUIT_COLORS[suit] + (255,))
    low_rgba = low.convert("RGBA")
    low_rgba.alpha_composite(index_layer)
    low_rgba.alpha_composite(index_layer.transpose(Image.Transpose.ROTATE_180))
    low_rgba.resize((480, 672), Image.Resampling.NEAREST).convert("RGB").save(path, format="PNG", optimize=True)


def main():
    files = sorted(path for path in CARDS.glob("*.png") if CARD_RE.fullmatch(path.name))
    for path in files:
        repair(path)
    print(f"repaired numbers in {len(files)} cards")


if __name__ == "__main__":
    main()
