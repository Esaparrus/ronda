"""Descarga y prepara un catálogo de PNG reales para Matiz.

Las fuentes se buscan y se conservan como URLs en cada JSON. El catálogo
incluye 100 Pokémon oficiales, personajes conocidos de videojuegos/animación
y logos PNG. Este script no dibuja imágenes: limpia el fondo y genera la base
y la máscara alfa que necesita el canvas del juego.
"""

from __future__ import annotations

import colorsys
import json
import math
import re
from collections import Counter, deque
from pathlib import Path
from urllib.request import Request, urlopen

from PIL import Image


ROOT = Path(__file__).resolve().parents[3]
ASSET_DIR = ROOT / "apps" / "web" / "public" / "games" / "matiz"
SOURCE_DIR = ROOT / "tmp" / "matiz-real-sources"
MANIFEST_PATH = ROOT / "tmp" / "matiz-real-manifest.json"
POKEMON_BASE = "https://assets.pokemon.com/assets/cms2/img/pokedex/full"


POKEMON = [
    ("bulbasaur", "Bulbasaur"),
    ("ivysaur", "Ivysaur"),
    ("venusaur", "Venusaur"),
    ("charmander", "Charmander"),
    ("charmeleon", "Charmeleon"),
    ("charizard", "Charizard"),
    ("squirtle", "Squirtle"),
    ("wartortle", "Wartortle"),
    ("blastoise", "Blastoise"),
    ("caterpie", "Caterpie"),
    ("metapod", "Metapod"),
    ("butterfree", "Butterfree"),
    ("weedle", "Weedle"),
    ("kakuna", "Kakuna"),
    ("beedrill", "Beedrill"),
    ("pidgey", "Pidgey"),
    ("pidgeotto", "Pidgeotto"),
    ("pidgeot", "Pidgeot"),
    ("rattata", "Rattata"),
    ("raticate", "Raticate"),
    ("spearow", "Spearow"),
    ("fearow", "Fearow"),
    ("ekans", "Ekans"),
    ("arbok", "Arbok"),
    ("pikachu", "Pikachu"),
    ("raichu", "Raichu"),
    ("sandshrew", "Sandshrew"),
    ("sandslash", "Sandslash"),
    ("nidoran-f", "Nidoran♀"),
    ("nidorina", "Nidorina"),
    ("nidoqueen", "Nidoqueen"),
    ("nidoran-m", "Nidoran♂"),
    ("nidorino", "Nidorino"),
    ("nidoking", "Nidoking"),
    ("clefairy", "Clefairy"),
    ("clefable", "Clefable"),
    ("vulpix", "Vulpix"),
    ("ninetales", "Ninetales"),
    ("jigglypuff", "Jigglypuff"),
    ("wigglytuff", "Wigglytuff"),
    ("zubat", "Zubat"),
    ("golbat", "Golbat"),
    ("oddish", "Oddish"),
    ("gloom", "Gloom"),
    ("vileplume", "Vileplume"),
    ("paras", "Paras"),
    ("parasect", "Parasect"),
    ("venonat", "Venonat"),
    ("venomoth", "Venomoth"),
    ("diglett", "Diglett"),
    ("dugtrio", "Dugtrio"),
    ("meowth", "Meowth"),
    ("persian", "Persian"),
    ("psyduck", "Psyduck"),
    ("golduck", "Golduck"),
    ("mankey", "Mankey"),
    ("primeape", "Primeape"),
    ("growlithe", "Growlithe"),
    ("arcanine", "Arcanine"),
    ("poliwag", "Poliwag"),
    ("poliwhirl", "Poliwhirl"),
    ("poliwrath", "Poliwrath"),
    ("abra", "Abra"),
    ("kadabra", "Kadabra"),
    ("alakazam", "Alakazam"),
    ("machop", "Machop"),
    ("machoke", "Machoke"),
    ("machamp", "Machamp"),
    ("bellsprout", "Bellsprout"),
    ("weepinbell", "Weepinbell"),
    ("victreebel", "Victreebel"),
    ("tentacool", "Tentacool"),
    ("tentacruel", "Tentacruel"),
    ("geodude", "Geodude"),
    ("graveler", "Graveler"),
    ("golem", "Golem"),
    ("ponyta", "Ponyta"),
    ("rapidash", "Rapidash"),
    ("slowpoke", "Slowpoke"),
    ("slowbro", "Slowbro"),
    ("magnemite", "Magnemite"),
    ("magneton", "Magneton"),
    ("farfetchd", "Farfetch’d"),
    ("doduo", "Doduo"),
    ("dodrio", "Dodrio"),
    ("seel", "Seel"),
    ("dewgong", "Dewgong"),
    ("grimer", "Grimer"),
    ("muk", "Muk"),
    ("shellder", "Shellder"),
    ("cloyster", "Cloyster"),
    ("gastly", "Gastly"),
    ("haunter", "Haunter"),
    ("gengar", "Gengar"),
    ("onix", "Onix"),
    ("drowzee", "Drowzee"),
    ("hypno", "Hypno"),
    ("krabby", "Krabby"),
    ("kingler", "Kingler"),
    ("voltorb", "Voltorb"),
]


CHARACTERS = [
    ("sonic", "Sonic", "https://pngimg.com/uploads/sonic_hedgehog/sonic_hedgehog_PNG32.png", "Pon el color de su cuerpo", "pngimg"),
    ("mickey", "Mickey Mouse", "https://icon2.cleanpng.com/lnd/20241030/jf/c67e4c3bf7a96aa7822221bd175ba5.webp", "Pon el color de su pantalón", "CleanPNG"),
    ("pacman", "Pac-Man", "https://image.pngaaa.com/226/4435226-middle.png", "Pon el color del personaje", "Pngaaa"),
    ("mario", "Mario", "https://www.pngkey.com/png/detail/218-2189527_mariostanding-super-mario.png", "Pon el color de su pantalón", "PNGkey"),
    ("crash", "Crash Bandicoot", "https://image.pngaaa.com/722/281722-middle.png", "Pon el color de su pelo", "Pngaaa"),
    ("kirby", "Kirby", "https://png.klev.club/uploads/posts/2024-04/png-klev-club-4p85-p-kirbi-png-17.png", "Pon el color de su cuerpo", "KlevClub"),
    ("bugs-bunny", "Bugs Bunny", "https://www.clipartmax.com/png/middle/299-2998364_bugs-bunny-bugs-bunny-clipart-bugs-bunny-pinterest-bugs-bunny-clip-art.png", "Pon el color de su cuerpo", "ClipartMax"),
    ("tom-jerry", "Tom y Jerry", "https://www.pikpng.com/pngl/m/185-1850751_tom-and-jerry-png-images-free-tom-y.png", "Pon el color de Tom", "PikPNG"),
]


LOGOS = [
    ("google", "Google", "https://clipartcraft.com/images/transparent-background-google-logo-invisible-1.png", "Pon el color del logo", "ClipartCraft"),
    ("youtube", "YouTube", "https://www.citypng.com/public/uploads/preview/hd-official-youtube-yt-logo-png-701751694786680qxacfiwgqw.png?v=2025091014", "Pon el color del logo", "CityPNG"),
    ("netflix", "Netflix", "https://pngdownload.io/wp-content/uploads/2025/06/Netflix-Logo-Streaming-Platform-PNG.webp", "Pon el color del logo", "PNGDownload"),
    ("mcdonalds", "McDonald’s", "https://www.citypng.com/public/uploads/preview/mcdonalds-yellow-m-symbol-logo-high-resolution-70175169479008933cofjbaaw.png?v=2026030821", "Pon el color del logo", "CityPNG"),
    ("nike", "Nike", "https://img.favpng.com/11/19/7/logo-nike-air-force-one-swoosh-shoe-png-favpng-SRXGFaPjhcHDXrN6mVL0dYFYH.jpg", "Pon el color del logo", "FavPNG"),
]


# Algunas fuentes descargadas desde buscadores traen una cuadrícula gris/blanca
# incrustada en la propia imagen, aunque el archivo se anuncie como PNG
# transparente. En esos casos limpiamos todos los neutros claros y elegimos
# manualmente una zona de juego que sí sea reconocible.
GLOBAL_NEUTRAL_CLEANUP = {
    "logo-png-google",
    "logo-png-nike",
}

TARGET_OVERRIDES = {
    "cartoon-crash": (232, 84, 18),
    "cartoon-mickey": (218, 34, 46),
    "cartoon-mario": (18, 78, 174),
    "logo-png-nike": (0, 0, 0),
}


def request_bytes(url: str) -> bytes:
    request = Request(url, headers={"User-Agent": "Mozilla/5.0 Matiz real catalog"})
    with urlopen(request, timeout=45) as response:
        return response.read()


def cached_download(url: str, path: Path) -> Path:
    if not path.exists() or path.stat().st_size < 100:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(request_bytes(url))
    return path


def is_background(pixel: tuple[int, int, int, int]) -> bool:
    red, green, blue, alpha = pixel
    if alpha == 0:
        return True
    return max(red, green, blue) - min(red, green, blue) <= 26 and min(red, green, blue) >= 170


def clean_image(image: Image.Image, remove_global_neutrals: bool = False) -> Image.Image:
    rgba = image.convert("RGBA")
    width, height = rgba.size
    pixels = rgba.load()
    removed = bytearray(width * height)
    pending: deque[tuple[int, int]] = deque()

    def enqueue(x: int, y: int) -> None:
        index = y * width + x
        if removed[index] or not is_background(pixels[x, y]):
            return
        removed[index] = 1
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
    for index, should_remove in enumerate(removed):
        if should_remove:
            pixels[index % width, index // width] = (0, 0, 0, 0)

    if remove_global_neutrals:
        for y in range(height):
            for x in range(width):
                red, green, blue, alpha = pixels[x, y]
                if alpha and max(red, green, blue) - min(red, green, blue) <= 26 and min(red, green, blue) >= 170:
                    pixels[x, y] = (0, 0, 0, 0)

    bbox = rgba.getchannel("A").getbbox()
    if bbox is None:
        raise ValueError("No se encontró una figura después de limpiar el fondo")
    left, top, right, bottom = bbox
    padding = max(6, round(max(width, height) * 0.012))
    rgba = rgba.crop((max(0, left - padding), max(0, top - padding), min(width, right + padding), min(height, bottom + padding)))
    longest = max(rgba.size)
    if longest < 618:
        scale = 618 / longest
        rgba = rgba.resize((round(rgba.width * scale), round(rgba.height * scale)), Image.Resampling.LANCZOS)
    else:
        rgba.thumbnail((900, 900), Image.Resampling.LANCZOS)
    return rgba


def hsv(color: tuple[int, int, int]) -> tuple[float, float, float]:
    red, green, blue = (channel / 255 for channel in color)
    hue, saturation, value = colorsys.rgb_to_hsv(red, green, blue)
    return hue * 360, saturation * 100, value * 100


def pick_target(image: Image.Image) -> tuple[int, int, int]:
    rgba = image.convert("RGBA")
    buckets: Counter[tuple[int, int, int]] = Counter()
    for red, green, blue, alpha in rgba.getdata():
        if alpha < 180:
            continue
        brightness = max(red, green, blue)
        darkest = min(red, green, blue)
        if brightness < 42 or (darkest > 242 and brightness - darkest < 18):
            continue
        buckets[tuple(min(255, round(channel / 8) * 8) for channel in (red, green, blue))] += 1
    if not buckets:
        opaque = [pixel[:3] for pixel in rgba.getdata() if pixel[3] >= 180]
        return Counter(opaque).most_common(1)[0][0] if opaque else (128, 128, 128)
    target_bucket, _ = buckets.most_common(1)[0]
    samples = [pixel[:3] for pixel in rgba.getdata() if pixel[3] >= 180 and all(abs(pixel[index] - target_bucket[index]) <= 8 for index in range(3))]
    count = max(1, len(samples))
    return tuple(round(sum(sample[index] for sample in samples) / count) for index in range(3))


def color_distance(left: tuple[int, int, int], right: tuple[int, int, int]) -> float:
    return math.sqrt(sum((left[index] - right[index]) ** 2 for index in range(3)))


def select_color(image: Image.Image, target: tuple[int, int, int]) -> bytearray:
    rgba = image.convert("RGBA")
    target_hue, target_saturation, target_value = hsv(target)
    selected = bytearray(rgba.width * rgba.height)
    tolerance = 54 if target_saturation >= 18 else 42
    pixels = rgba.load()
    for y in range(rgba.height):
        for x in range(rgba.width):
            red, green, blue, alpha = pixels[x, y]
            if alpha == 0:
                continue
            candidate = (red, green, blue)
            candidate_hue, candidate_saturation, candidate_value = hsv(candidate)
            hue_distance = min(abs(candidate_hue - target_hue), 360 - abs(candidate_hue - target_hue))
            similar_hue = target_saturation >= 18 and candidate_saturation >= max(12, target_saturation * 0.35) and hue_distance <= 18 and abs(candidate_value - target_value) <= 35
            if color_distance(candidate, target) <= tolerance or similar_hue:
                selected[y * rgba.width + x] = alpha
    if sum(1 for value in selected if value) < rgba.width * rgba.height * 0.012:
        for y in range(rgba.height):
            for x in range(rgba.width):
                pixel = pixels[x, y]
                if pixel[3] and color_distance(pixel[:3], target) <= 78:
                    selected[y * rgba.width + x] = pixel[3]
    return selected


def hex_color(color: tuple[int, int, int]) -> str:
    return "#" + "".join(f"{channel:02x}" for channel in color)


def write_assets(image: Image.Image, selected: bytearray, name: str, target: tuple[int, int, int], source: str, title: str, subtitle: str) -> dict[str, object]:
    rgba = image.convert("RGBA")
    width, height = rgba.size
    base = bytearray(rgba.tobytes())
    mask = bytearray(width * height * 4)
    selected_count = 0
    for pixel_index, alpha in enumerate(selected):
        if not alpha:
            continue
        selected_count += 1
        base_index = pixel_index * 4
        base[base_index + 3] = 0
        mask[base_index] = 255
        mask[base_index + 1] = 255
        mask[base_index + 2] = 255
        mask[base_index + 3] = alpha
    ASSET_DIR.mkdir(parents=True, exist_ok=True)
    Image.frombytes("RGBA", (width, height), bytes(base)).save(ASSET_DIR / f"{name}-base.png")
    Image.frombytes("RGBA", (width, height), bytes(mask)).save(ASSET_DIR / f"{name}-mask.png")
    metadata = {
        "id": name,
        "title": title,
        "subtitle": subtitle,
        "image": f"/games/matiz/{name}-base.png",
        "mask": f"/games/matiz/{name}-mask.png",
        "width": width,
        "height": height,
        "selectedPixels": selected_count,
        "targetHex": hex_color(target),
        "source": source,
    }
    (ASSET_DIR / f"{name}.json").write_text(json.dumps(metadata, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return metadata


def process_source(name: str, title: str, subtitle: str, source: str, source_label: str, source_path: Path) -> dict[str, object]:
    with Image.open(source_path) as image:
        cleaned = clean_image(image, remove_global_neutrals=name in GLOBAL_NEUTRAL_CLEANUP)
    target = TARGET_OVERRIDES.get(name, pick_target(cleaned))
    metadata = write_assets(cleaned, select_color(cleaned, target), name, target, source, title, subtitle)
    print(f"{name}: {metadata['targetHex']} · {metadata['selectedPixels']} píxeles · {source_label}")
    return metadata


def main() -> None:
    manifest: list[dict[str, object]] = []
    for number, (slug, title) in enumerate(POKEMON, start=1):
        name = f"pokemon-{number:03d}-{slug}"
        source = f"{POKEMON_BASE}/{number:03d}.png"
        source_path = cached_download(source, SOURCE_DIR / "pokemon" / f"{number:03d}.png")
        manifest.append(process_source(name, title, "Pon el color de su cuerpo", source, "Pokémon oficial", source_path))
    for slug, title, source, subtitle, label in CHARACTERS:
        source_path = cached_download(source, SOURCE_DIR / "characters" / f"{slug}-v2.source")
        manifest.append(process_source(f"cartoon-{slug}", title, subtitle, source, label, source_path))
    for slug, title, source, subtitle, label in LOGOS:
        source_path = cached_download(source, SOURCE_DIR / "logos" / f"{slug}.source")
        manifest.append(process_source(f"logo-png-{slug}", title, subtitle, source, label, source_path))
    MANIFEST_PATH.parent.mkdir(parents=True, exist_ok=True)
    MANIFEST_PATH.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Generados {len(manifest)} retos reales en {ASSET_DIR}")


if __name__ == "__main__":
    main()
