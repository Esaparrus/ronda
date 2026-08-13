from pathlib import Path
import re

from PIL import Image, ImageFilter, ImageOps


ROOT = Path(r"C:\Users\Esparrus\Desktop\cartas")
SOURCE = ROOT / "apps" / "web" / "public" / "cards"
OUTPUT = SOURCE / "pixel-art-simple"
CARD_RE = re.compile(r"(?:oros|copas|espadas|bastos)-(?:[1-7]|10|11|12)\.png$")
LOW_SIZE = (120, 160)
PALETTE_COLORS = 32


def source_files():
    return sorted(f for f in SOURCE.glob("*.png") if CARD_RE.fullmatch(f.name))


def make_global_palette(files):
    contact = Image.new("RGB", (LOW_SIZE[0] * 10, LOW_SIZE[1] * 4), "white")
    for index, path in enumerate(files):
        with Image.open(path) as image:
            thumb = image.convert("RGB").resize(LOW_SIZE, Image.Resampling.LANCZOS)
        x = (index % 10) * LOW_SIZE[0]
        y = (index // 10) * LOW_SIZE[1]
        contact.paste(thumb, (x, y))
    return contact.quantize(colors=PALETTE_COLORS, method=Image.Quantize.MEDIANCUT)


def pixelate(path, palette):
    with Image.open(path) as image:
        original = image.convert("RGB")
        low = original.resize(LOW_SIZE, Image.Resampling.LANCZOS)
        low = ImageOps.autocontrast(low, cutoff=1)
        low = low.filter(ImageFilter.UnsharpMask(radius=1, percent=140, threshold=3))
        low = low.quantize(palette=palette, dither=Image.Dither.NONE).convert("RGB")
        return low.resize(original.size, Image.Resampling.NEAREST)


def main():
    files = source_files()
    OUTPUT.mkdir(parents=True, exist_ok=True)
    palette = make_global_palette(files)
    for path in files:
        pixelate(path, palette).save(OUTPUT / path.name, format="PNG", optimize=True)
    print(f"created {len(files)} cards in {OUTPUT}")


if __name__ == "__main__":
    main()
