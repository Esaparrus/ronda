from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "apps" / "web" / "public" / "cards" / "moderna"
CARD_SIZE = (320, 448)
SUITS = ("oros", "copas", "espadas", "bastos")

# The generated reference sheets intentionally share the same four-column
# layout.  Their lower rows are visually smaller, so every detected card is
# cropped independently and normalised to one 5:7 canvas for the web app.
SHEETS = (
    {
        "path": ROOT / "baraja-espanola-moderna.png",
        "ranks": (1, 5, 10, 11, 12),
        "columns": ((35, 254), (279, 498), (525, 739), (765, 980)),
        "rows": ((46, 364), (378, 696), (709, 996), (1005, 1259), (1269, 1505)),
    },
    {
        "path": ROOT / "baraja-espanola-moderna-complemento.png",
        "ranks": (2, 3, 4, 6, 7),
        "columns": ((36, 254), (282, 499), (522, 739), (764, 982)),
        "rows": ((47, 365), (379, 697), (709, 1001), (1012, 1262), (1275, 1506)),
    },
)


def main() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)

    written: list[Path] = []
    for sheet in SHEETS:
        source_path = sheet["path"]
        with Image.open(source_path) as source:
            source = source.convert("RGB")
            for row_index, rank in enumerate(sheet["ranks"]):
                top, bottom = sheet["rows"][row_index]
                for column_index, suit in enumerate(SUITS):
                    left, right = sheet["columns"][column_index]
                    card = source.crop((left, top, right, bottom))
                    # Direct resizing corrects the varying presentation size
                    # of the contact sheet while preserving the entire card.
                    card = card.resize(CARD_SIZE, Image.Resampling.LANCZOS)
                    output_path = OUTPUT / f"{suit}-{rank}.webp"
                    card.save(output_path, format="WEBP", quality=88, method=6)
                    written.append(output_path)

    if len(written) != 40 or len(set(written)) != 40:
        raise RuntimeError(f"Expected 40 unique cards, created {len(set(written))}")

    wrong_size = [path for path in written if Image.open(path).size != CARD_SIZE]
    if wrong_size:
        raise RuntimeError(f"Cards with an unexpected size: {wrong_size}")

    print(f"Created 40 uniform cards in {OUTPUT}")


if __name__ == "__main__":
    main()
