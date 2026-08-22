"""Descarga y prepara un catálogo de PNG reales para Matiz.

Las fuentes se buscan y se conservan como URLs en cada JSON. El catálogo
incluye 100 Pokémon oficiales y 100 retos adicionales de personajes conocidos
de animación, videojuegos y logos PNG. Este script no dibuja imágenes: limpia
el fondo y genera la base y la máscara alfa que necesita el canvas del juego.
"""

from __future__ import annotations

import colorsys
import json
import math
import re
import time
from collections import Counter, deque
from pathlib import Path
from urllib.error import HTTPError
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
EXTRA_CHARACTERS = [
    ("simpsons-marge-hair", "Marge Simpson", "https://image.pngaaa.com/148/983148-middle.png", "Pon el color de su pelo", "Pngaaa"),
    ("simpsons-bart-shirt", "Bart Simpson", "https://image.pngaaa.com/148/983148-middle.png", "Pon el color de su camiseta", "Pngaaa"),
    ("simpsons-bart-shorts", "Bart Simpson", "https://image.pngaaa.com/148/983148-middle.png", "Pon el color de sus pantalones", "Pngaaa"),
    ("simpsons-lisa-dress", "Lisa Simpson", "https://image.pngaaa.com/148/983148-middle.png", "Pon el color de su vestido", "Pngaaa"),
    ("simpsons-maggie-outfit", "Maggie Simpson", "https://image.pngaaa.com/148/983148-middle.png", "Pon el color de su ropa", "Pngaaa"),
    ("simpsons-homer-pants", "Homer Simpson", "https://image.pngaaa.com/148/983148-middle.png", "Pon el color de sus pantalones", "Pngaaa"),
    ("simpsons-marge-dress", "Marge Simpson", "https://image.pngaaa.com/148/983148-middle.png", "Pon el color de su vestido", "Pngaaa"),
    ("futurama-leela-hair", "Leela · Futurama", "https://flyclipart.com/thumb2/futurama-leela-fry-bender-png-image-546259.png", "Pon el color de su pelo", "FlyClipart"),
    ("futurama-fry-jacket", "Fry · Futurama", "https://flyclipart.com/thumb2/futurama-leela-fry-bender-png-image-546259.png", "Pon el color de su chaqueta", "FlyClipart"),
    ("futurama-bender-body", "Bender · Futurama", "https://flyclipart.com/thumb2/futurama-leela-fry-bender-png-image-546259.png", "Pon el color de su cuerpo", "FlyClipart"),
    ("family-guy-peter-pants", "Peter Griffin", "https://www.nicepng.com/png/detail/888-8883757_watch-family-guy-online-free-stuck-together-torn.png", "Pon el color de sus pantalones", "NicePNG"),
    ("family-guy-lois-blouse", "Lois Griffin", "https://www.nicepng.com/png/detail/888-8883757_watch-family-guy-online-free-stuck-together-torn.png", "Pon el color de su camiseta", "NicePNG"),
    ("family-guy-meg-shirt", "Meg Griffin", "https://www.nicepng.com/png/detail/888-8883757_watch-family-guy-online-free-stuck-together-torn.png", "Pon el color de su camiseta", "NicePNG"),
    ("family-guy-chris-shirt", "Chris Griffin", "https://www.nicepng.com/png/detail/888-8883757_watch-family-guy-online-free-stuck-together-torn.png", "Pon el color de su camiseta", "NicePNG"),
    ("family-guy-stewie-overalls", "Stewie Griffin", "https://www.nicepng.com/png/detail/888-8883757_watch-family-guy-online-free-stuck-together-torn.png", "Pon el color de su ropa", "NicePNG"),
    ("family-guy-brian-collar", "Brian Griffin", "https://www.nicepng.com/png/detail/888-8883757_watch-family-guy-online-free-stuck-together-torn.png", "Pon el color de su collar", "NicePNG"),
    ("sponge-body", "Bob Esponja", "https://www.vhv.rs/dpng/d/405-4054868_spongebob-squarepants-download-png-image-spongebob-squarepants-spongebob.png", "Pon el color de su cuerpo", "VHV"),
    ("sponge-patrick-shorts", "Patricio Estrella", "https://www.vhv.rs/dpng/d/405-4054868_spongebob-squarepants-download-png-image-spongebob-squarepants-spongebob.png", "Pon el color de sus pantalones", "VHV"),
    ("sponge-patrick-body", "Patricio Estrella", "https://www.vhv.rs/dpng/d/405-4054868_spongebob-squarepants-download-png-image-spongebob-squarepants-spongebob.png", "Pon el color de su cuerpo", "VHV"),
    ("sponge-squidward-shirt", "Calamardo", "https://www.vhv.rs/dpng/d/405-4054868_spongebob-squarepants-download-png-image-spongebob-squarepants-spongebob.png", "Pon el color de su camiseta", "VHV"),
    ("sponge-sandy-suit", "Arenita", "https://www.vhv.rs/dpng/d/405-4054868_spongebob-squarepants-download-png-image-spongebob-squarepants-spongebob.png", "Pon el color de su traje", "VHV"),
    ("adventure-finn-shirt", "Finn · Hora de Aventuras", "https://freepngimg.com/save/127354-and-jake-adventure-finn-time/900x900", "Pon el color de su camiseta", "FreePNGimg"),
    ("adventure-finn-backpack", "Finn · Hora de Aventuras", "https://freepngimg.com/save/127354-and-jake-adventure-finn-time/900x900", "Pon el color de su mochila", "FreePNGimg"),
    ("adventure-finn-shorts", "Finn · Hora de Aventuras", "https://freepngimg.com/save/127354-and-jake-adventure-finn-time/900x900", "Pon el color de sus pantalones", "FreePNGimg"),
    ("adventure-jake-body", "Jake · Hora de Aventuras", "https://freepngimg.com/save/127354-and-jake-adventure-finn-time/900x900", "Pon el color de su cuerpo", "FreePNGimg"),
    ("rick-hair", "Rick Sanchez", "https://freepngimg.com/save/27467-rick-and-morty-transparent-image/612x792", "Pon el color de su pelo", "FreePNGimg"),
    ("rick-coat", "Rick Sanchez", "https://freepngimg.com/save/27467-rick-and-morty-transparent-image/612x792", "Pon el color de su bata", "FreePNGimg"),
    ("morty-shirt", "Morty Smith", "https://freepngimg.com/save/27467-rick-and-morty-transparent-image/612x792", "Pon el color de su camiseta", "FreePNGimg"),
    ("morty-pants", "Morty Smith", "https://freepngimg.com/save/27467-rick-and-morty-transparent-image/612x792", "Pon el color de sus pantalones", "FreePNGimg"),
    ("southpark-cartman-jacket", "Eric Cartman", "https://pngimg.com/uploads/south_park/south_park_PNG37.png", "Pon el color de su chaqueta", "pngimg"),
    ("southpark-stan-hat", "Stan Marsh", "https://pngimg.com/uploads/south_park/south_park_PNG37.png", "Pon el color de su gorro", "pngimg"),
    ("southpark-kyle-hat", "Kyle Broflovski", "https://pngimg.com/uploads/south_park/south_park_PNG37.png", "Pon el color de su gorro", "pngimg"),
    ("southpark-kenny-parka", "Kenny McCormick", "https://pngimg.com/uploads/south_park/south_park_PNG37.png", "Pon el color de su parka", "pngimg"),
    ("southpark-cartman-gloves", "Eric Cartman", "https://pngimg.com/uploads/south_park/south_park_PNG37.png", "Pon el color de sus guantes", "pngimg"),
    ("shrek-skin", "Shrek", "https://image.pngaaa.com/345/41345-middle.png", "Pon el color de su piel", "Pngaaa"),
    ("shrek-fiona-dress", "Fiona · Shrek", "https://image.pngaaa.com/345/41345-middle.png", "Pon el color de su vestido", "Pngaaa"),
    ("shrek-donkey-body", "Burro · Shrek", "https://image.pngaaa.com/345/41345-middle.png", "Pon el color de su cuerpo", "Pngaaa"),
    ("shrek-puss-hat", "Gato con Botas", "https://image.pngaaa.com/345/41345-middle.png", "Pon el color de su gorro", "Pngaaa"),
    ("looney-daffy-body", "Pato Lucas", "https://www.clipartmax.com/png/middle/110-1103705_black-duck-cartoon-character.png", "Pon el color de su cuerpo", "ClipartMax"),
    ("looney-tweety-body", "Piolín", "https://www.clipartmax.com/png/middle/110-1103705_black-duck-cartoon-character.png", "Pon el color de su cuerpo", "ClipartMax"),
    ("looney-sylvester-body", "Silvestre", "https://www.clipartmax.com/png/middle/110-1103705_black-duck-cartoon-character.png", "Pon el color de su cuerpo", "ClipartMax"),
]

EXTRA_LOGOS = [
    ("adidas", "Adidas", "https://upload.wikimedia.org/wikipedia/commons/thumb/2/20/Adidas_Logo.svg/960px-Adidas_Logo.svg.png?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail", "Pon el color del logo", "Wikimedia Commons"),
    ("amazon", "Amazon", "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/Amazon_logo.svg/960px-Amazon_logo.svg.png?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail", "Pon el color del logo", "Wikimedia Commons"),
    ("apple", "Apple", "https://upload.wikimedia.org/wikipedia/commons/thumb/f/fa/Apple_logo_black.svg/960px-Apple_logo_black.svg.png?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail", "Pon el color del logo", "Wikimedia Commons"),
    ("coca-cola", "Coca-Cola", "https://upload.wikimedia.org/wikipedia/commons/thumb/c/ce/Coca-Cola_logo.svg/960px-Coca-Cola_logo.svg.png?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail", "Pon el color del logo", "Wikimedia Commons"),
    ("facebook", "Facebook", "https://upload.wikimedia.org/wikipedia/commons/thumb/5/51/Facebook_f_logo_%282019%29.svg/960px-Facebook_f_logo_%282019%29.svg.png?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail", "Pon el color del logo", "Wikimedia Commons"),
    ("futurama", "Futurama", "https://upload.wikimedia.org/wikipedia/commons/thumb/8/84/Futurama_1999_logo.svg/960px-Futurama_1999_logo.svg.png?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail", "Pon el color del logo", "Wikimedia Commons"),
    ("instagram", "Instagram", "https://upload.wikimedia.org/wikipedia/commons/thumb/9/95/Instagram_logo_2022.svg/960px-Instagram_logo_2022.svg.png?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail", "Pon el color del logo", "Wikimedia Commons"),
    ("linkedin", "LinkedIn", "https://upload.wikimedia.org/wikipedia/commons/thumb/1/19/LinkedIn_logo.svg/960px-LinkedIn_logo.svg.png?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail", "Pon el color del logo", "Wikimedia Commons"),
    ("nintendo", "Nintendo", "https://upload.wikimedia.org/wikipedia/commons/thumb/5/51/Nintendo_logo.svg/960px-Nintendo_logo.svg.png?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail", "Pon el color del logo", "Wikimedia Commons"),
    ("playstation", "PlayStation", "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/PlayStation_logo_and_wordmark.svg/960px-PlayStation_logo_and_wordmark.svg.png?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail", "Pon el color del logo", "Wikimedia Commons"),
    ("reddit", "Reddit", "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b4/Reddit_logo.svg/960px-Reddit_logo.svg.png?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail", "Pon el color del logo", "Wikimedia Commons"),
    ("spotify", "Spotify", "https://upload.wikimedia.org/wikipedia/commons/thumb/2/24/Spotify_New_Full_Logo_RGB_Green.png/960px-Spotify_New_Full_Logo_RGB_Green.png?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail", "Pon el color del logo", "Wikimedia Commons"),
    ("telegram", "Telegram", "https://upload.wikimedia.org/wikipedia/commons/thumb/8/82/Telegram_logo.svg/960px-Telegram_logo.svg.png?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail", "Pon el color del logo", "Wikimedia Commons"),
    ("simpsons", "Los Simpson", "https://upload.wikimedia.org/wikipedia/commons/thumb/9/98/The_Simpsons_yellow_logo.svg/960px-The_Simpsons_yellow_logo.svg.png?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail", "Pon el color del logo", "Wikimedia Commons"),
    ("whatsapp", "WhatsApp", "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6b/WhatsApp.svg/960px-WhatsApp.svg.png?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail", "Pon el color del logo", "Wikimedia Commons"),
    ("bmw", "BMW", "https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/BMW.svg/960px-BMW.svg.png?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail", "Pon el color del logo", "Wikimedia Commons"),
    ("burger-king", "Burger King", "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4b/Burger_King_logo_%281999%E2%80%932020%29.svg/960px-Burger_King_logo_%281999%E2%80%932020%29.svg.png?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail", "Pon el color del logo", "Wikimedia Commons"),
    ("epic-games", "Epic Games", "https://upload.wikimedia.org/wikipedia/commons/thumb/3/31/Epic_Games_logo.svg/960px-Epic_Games_logo.svg.png?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail", "Pon el color del logo", "Wikimedia Commons"),
    ("lego", "LEGO", "https://upload.wikimedia.org/wikipedia/commons/thumb/2/24/LEGO_logo.svg/960px-LEGO_logo.svg.png?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail", "Pon el color del logo", "Wikimedia Commons"),
    ("mercedes", "Mercedes-Benz", "https://upload.wikimedia.org/wikipedia/commons/thumb/3/32/Mercedes-Benz_Star_2022.svg/960px-Mercedes-Benz_Star_2022.svg.png?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail", "Pon el color del logo", "Wikimedia Commons"),
    ("microsoft", "Microsoft", "https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/Microsoft_logo.svg/960px-Microsoft_logo.svg.png?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail", "Pon el color del logo", "Wikimedia Commons"),
    ("nintendo-switch", "Nintendo Switch", "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5d/Nintendo_Switch_Logo.svg/960px-Nintendo_Switch_Logo.svg.png?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail", "Pon el color del logo", "Wikimedia Commons"),
    ("pepsi", "Pepsi", "https://upload.wikimedia.org/wikipedia/commons/thumb/6/68/Pepsi_2023.svg/960px-Pepsi_2023.svg.png?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail", "Pon el color del logo", "Wikimedia Commons"),
    ("roblox", "Roblox", "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4b/Roblox_Logo_2022.svg/960px-Roblox_Logo_2022.svg.png?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail", "Pon el color del logo", "Wikimedia Commons"),
    ("steam", "Steam", "https://upload.wikimedia.org/wikipedia/commons/thumb/a/ae/Steam_logo.svg/960px-Steam_logo.svg.png?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail", "Pon el color del logo", "Wikimedia Commons"),
    ("toyota", "Toyota", "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c8/Toyota_logo.svg/960px-Toyota_logo.svg.png?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail", "Pon el color del logo", "Wikimedia Commons"),
    ("angry-birds", "Angry Birds", "https://upload.wikimedia.org/wikipedia/commons/thumb/9/93/Angry_Birds_logo.svg/960px-Angry_Birds_logo.svg.png?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail", "Pon el color del logo", "Wikimedia Commons"),
    ("call-of-duty", "Call of Duty", "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c3/Call_of_Duty_logo.svg/960px-Call_of_Duty_logo.svg.png?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail", "Pon el color del logo", "Wikimedia Commons"),
    ("counter-strike-2", "Counter-Strike 2", "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b8/Counter-Strike_2_logo.svg/960px-Counter-Strike_2_logo.svg.png?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail", "Pon el color del logo", "Wikimedia Commons"),
    ("dc-comics", "DC Comics", "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3d/DC_Comics_logo.svg/960px-DC_Comics_logo.svg.png?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail", "Pon el color del logo", "Wikimedia Commons"),
    ("disney", "Disney", "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a4/Disney_wordmark.svg/960px-Disney_wordmark.svg.png?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail", "Pon el color del logo", "Wikimedia Commons"),
    ("marvel", "Marvel", "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b9/Marvel_Logo.svg/960px-Marvel_Logo.svg.png?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail", "Pon el color del logo", "Wikimedia Commons"),
    ("overwatch-2", "Overwatch 2", "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c7/Overwatch_2_logo.svg/960px-Overwatch_2_logo.svg.png?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail", "Pon el color del logo", "Wikimedia Commons"),
    ("pixar", "Pixar", "https://upload.wikimedia.org/wikipedia/commons/thumb/4/40/Pixar_logo.svg/960px-Pixar_logo.svg.png?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail", "Pon el color del logo", "Wikimedia Commons"),
    ("sonic-logo", "Sonic the Hedgehog", "https://upload.wikimedia.org/wikipedia/commons/thumb/0/09/Sonic_the_Hedgehog_logo.svg/960px-Sonic_the_Hedgehog_logo.svg.png?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail", "Pon el color del logo", "Wikimedia Commons"),
    ("star-wars", "Star Wars", "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6c/Star_Wars_Logo.svg/960px-Star_Wars_Logo.svg.png?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail", "Pon el color del logo", "Wikimedia Commons"),
    ("valorant", "Valorant", "https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/Valorant_logo.svg/960px-Valorant_logo.svg.png?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail", "Pon el color del logo", "Wikimedia Commons"),
    ("dora-explorer", "Dora la Exploradora", "https://upload.wikimedia.org/wikipedia/commons/thumb/5/57/Dora_the_Explorer_logo.svg/960px-Dora_the_Explorer_logo.svg.png?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail", "Pon el color del logo", "Wikimedia Commons"),
    ("family-guy", "Padre de Familia", "https://upload.wikimedia.org/wikipedia/commons/thumb/a/aa/Family_Guy_Logo.svg/960px-Family_Guy_Logo.svg.png?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail", "Pon el color del logo", "Wikimedia Commons"),
    ("looney-tunes", "Looney Tunes", "https://upload.wikimedia.org/wikipedia/commons/thumb/7/77/Looney_Tunes_logo.svg/960px-Looney_Tunes_logo.svg.png?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail", "Pon el color del logo", "Wikimedia Commons"),
    ("naruto", "Naruto", "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c9/Naruto_logo.svg/960px-Naruto_logo.svg.png?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail", "Pon el color del logo", "Wikimedia Commons"),
    ("pocoyo", "Pocoyó", "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/Pocoyo_logo.svg/960px-Pocoyo_logo.svg.png?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail", "Pon el color del logo", "Wikimedia Commons"),
    ("south-park", "South Park", "https://upload.wikimedia.org/wikipedia/commons/thumb/1/13/South_Park_logo.svg/960px-South_Park_logo.svg.png?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail", "Pon el color del logo", "Wikimedia Commons"),
    ("flintstones", "Los Picapiedra", "https://upload.wikimedia.org/wikipedia/commons/thumb/8/89/The_Flintstones_logo.svg/960px-The_Flintstones_logo.svg.png?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail", "Pon el color del logo", "Wikimedia Commons"),
    ("powerpuff-girls", "Las Supernenas", "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f1/The_Powerpuff_Girls_logo.svg/960px-The_Powerpuff_Girls_logo.svg.png?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail", "Pon el color del logo", "Wikimedia Commons"),
    ("tom-and-jerry", "Tom y Jerry", "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cb/Tom_and_Jerry_logo.svg/960px-Tom_and_Jerry_logo.svg.png?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail", "Pon el color del logo", "Wikimedia Commons"),
    ("warner-bros", "Warner Bros.", "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d2/Warner_Bros._%282019%29_logo.svg/960px-Warner_Bros._%282019%29_logo.svg.png?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail", "Pon el color del logo", "Wikimedia Commons"),
    ("android", "Android", "https://upload.wikimedia.org/wikipedia/commons/thumb/6/64/Android_logo_2019_%28stacked%29.svg/960px-Android_logo_2019_%28stacked%29.svg.png?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail", "Pon el color del logo", "Wikimedia Commons"),
    ("gitlab", "GitLab", "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e1/GitLab_logo.svg/960px-GitLab_logo.svg.png?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail", "Pon el color del logo", "Wikimedia Commons"),
    ("gmail", "Gmail", "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7e/Gmail_icon_%282020%29.svg/960px-Gmail_icon_%282020%29.svg.png?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail", "Pon el color del logo", "Wikimedia Commons"),
    ("chrome", "Google Chrome", "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Google_Chrome_icon_%28September_2014%29.svg/960px-Google_Chrome_icon_%28September_2014%29.svg.png?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail", "Pon el color del logo", "Wikimedia Commons"),
    ("nasa", "NASA", "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/NASA_logo.svg/960px-NASA_logo.svg.png?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail", "Pon el color del logo", "Wikimedia Commons"),
    ("opera", "Opera", "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6e/Opera_2015_logo.svg/960px-Opera_2015_logo.svg.png?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail", "Pon el color del logo", "Wikimedia Commons"),
    ("slack", "Slack", "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b9/Slack_Technologies_Logo.svg/960px-Slack_Technologies_Logo.svg.png?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail", "Pon el color del logo", "Wikimedia Commons"),
    ("spacex", "SpaceX", "https://upload.wikimedia.org/wikipedia/commons/thumb/d/de/SpaceX-Logo.svg/960px-SpaceX-Logo.svg.png?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail", "Pon el color del logo", "Wikimedia Commons"),
    ("stack-overflow", "Stack Overflow", "https://upload.wikimedia.org/wikipedia/commons/thumb/0/02/Stack_Overflow_logo.svg/960px-Stack_Overflow_logo.svg.png?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail", "Pon el color del logo", "Wikimedia Commons"),
    ("twitch", "Twitch", "https://upload.wikimedia.org/wikipedia/commons/thumb/2/26/Twitch_logo.svg/960px-Twitch_logo.svg.png?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail", "Pon el color del logo", "Wikimedia Commons"),
    ("champions-league", "Champions League", "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0a/UEFA_Champions_League_logo.svg/960px-UEFA_Champions_League_logo.svg.png?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail", "Pon el color del logo", "Wikimedia Commons"),
    ("windows", "Windows", "https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Windows_logo_-_2021.svg/960px-Windows_logo_-_2021.svg.png?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail", "Pon el color del logo", "Wikimedia Commons"),
]


# Algunas fuentes descargadas desde buscadores traen una cuadrícula gris/blanca
# incrustada en la propia imagen, aunque el archivo se anuncie como PNG
# transparente. En esos casos limpiamos todos los neutros claros y elegimos
# manualmente una zona de juego que sí sea reconocible.
GLOBAL_NEUTRAL_CLEANUP = {
    "logo-png-google",
    "logo-png-nike",
}

# Otras fuentes llevan una cuadrícula 255/238 o 255/240 dentro de huecos
# cerrados de la ilustración. Eliminamos solo los componentes que contienen
# ese gris de cuadrícula para conservar la ropa blanca real del personaje.
CHECKERBOARD_CLEANUP = {
    "toon-futurama-leela-hair",
    "toon-futurama-fry-jacket",
    "toon-futurama-bender-body",
    "toon-shrek-skin",
    "toon-shrek-fiona-dress",
    "toon-shrek-donkey-body",
    "toon-shrek-puss-hat",
}

TARGET_OVERRIDES = {
    "cartoon-crash": (232, 84, 18),
    "cartoon-mickey": (218, 34, 46),
    "cartoon-mario": (18, 78, 174),
    "logo-png-nike": (0, 0, 0),
}

TARGET_OVERRIDES.update({
    "toon-simpsons-marge-hair": (35, 115, 176),
    "toon-simpsons-bart-shirt": [244,105,36],
    "toon-simpsons-bart-shorts": [54,102,182],
    "toon-simpsons-lisa-dress": [225,45,52],
    "toon-simpsons-maggie-outfit": [92,160,214],
    "toon-simpsons-homer-pants": [54,102,182],
    "toon-simpsons-marge-dress": [91,170,86],
    "toon-futurama-leela-hair": [125,49,146],
    "toon-futurama-fry-jacket": [180,38,41],
    "toon-futurama-bender-body": [157,161,158],
    "toon-family-guy-peter-pants": [84,150,67],
    "toon-family-guy-lois-blouse": [56,152,133],
    "toon-family-guy-meg-shirt": [233,148,180],
    "toon-family-guy-chris-shirt": [72,132,202],
    "toon-family-guy-stewie-overalls": [210,38,39],
    "toon-family-guy-brian-collar": [213,45,42],
    "toon-sponge-body": [247,224,46],
    "toon-sponge-patrick-shorts": [111,178,84],
    "toon-sponge-patrick-body": [239,151,166],
    "toon-sponge-squidward-shirt": [168,108,102],
    "toon-sponge-sandy-suit": [245,245,238],
    "toon-adventure-finn-shirt": [52,143,208],
    "toon-adventure-finn-backpack": [79,161,71],
    "toon-adventure-finn-shorts": [31,86,161],
    "toon-adventure-jake-body": [247,207,45],
    "toon-rick-hair": [113,194,218],
    "toon-rick-coat": [245,245,240],
    "toon-morty-shirt": [241,203,54],
    "toon-morty-pants": [64,105,180],
    "toon-southpark-cartman-jacket": [215,45,38],
    "toon-southpark-stan-hat": [47,99,190],
    "toon-southpark-kyle-hat": [64,145,61],
    "toon-southpark-kenny-parka": [238,115,38],
    "toon-southpark-cartman-gloves": [246,199,45],
    "toon-shrek-skin": [111,151,58],
    "toon-shrek-fiona-dress": [75,155,82],
    "toon-shrek-donkey-body": [113,113,104],
    "toon-shrek-puss-hat": [43,82,157],
    "toon-looney-daffy-body": [35,38,42],
    "toon-looney-tweety-body": [247,222,52],
    "toon-looney-sylvester-body": [115,120,126],
})


def request_bytes(url: str) -> bytes:
    request = Request(url, headers={"User-Agent": "Mozilla/5.0 Matiz real catalog"})
    if "upload.wikimedia.org" in url:
        time.sleep(1.1)
    for attempt in range(6):
        try:
            with urlopen(request, timeout=45) as response:
                return response.read()
        except HTTPError as error:
            if error.code not in {429, 500, 502, 503, 504} or attempt == 5:
                raise
            time.sleep(min(2 ** attempt, 16))
    raise RuntimeError(f"No se pudo descargar {url}")


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


def clean_image(
    image: Image.Image,
    remove_global_neutrals: bool = False,
    remove_checkerboard_neutrals: bool = False,
) -> Image.Image:
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

    if remove_checkerboard_neutrals:
        neutral_counts: Counter[int] = Counter()
        for red, green, blue, alpha in rgba.getdata():
            if alpha and red == green == blue and 180 <= red < 252:
                neutral_counts[red] += 1
        checker_values = {
            value for value, count in neutral_counts.items()
            if count >= max(64, round(width * height * 0.0005))
        }
        visited = bytearray(width * height)
        for start_y in range(height):
            for start_x in range(width):
                start_index = start_y * width + start_x
                if visited[start_index] or not is_background(pixels[start_x, start_y]):
                    continue
                component: list[tuple[int, int]] = []
                pending = deque([(start_x, start_y)])
                visited[start_index] = 1
                has_checker_value = False
                while pending:
                    x, y = pending.popleft()
                    component.append((x, y))
                    red, green, blue, alpha = pixels[x, y]
                    if alpha and red == green == blue and red in checker_values:
                        has_checker_value = True
                    for next_x, next_y in (
                        (x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1),
                        (x + 1, y + 1), (x - 1, y - 1), (x + 1, y - 1), (x - 1, y + 1),
                    ):
                        if not (0 <= next_x < width and 0 <= next_y < height):
                            continue
                        next_index = next_y * width + next_x
                        if visited[next_index] or not is_background(pixels[next_x, next_y]):
                            continue
                        visited[next_index] = 1
                        pending.append((next_x, next_y))
                if has_checker_value:
                    for x, y in component:
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
        cleaned = clean_image(
            image,
            remove_global_neutrals=name in GLOBAL_NEUTRAL_CLEANUP,
            remove_checkerboard_neutrals=name in CHECKERBOARD_CLEANUP,
        )
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
    for slug, title, source, subtitle, label in EXTRA_CHARACTERS:
        cache_suffix = "-clean.source" if slug.startswith(("rick-", "morty-", "southpark-")) else ".source"
        source_path = cached_download(source, SOURCE_DIR / "extra-characters" / f"{slug}{cache_suffix}")
        manifest.append(process_source(f"toon-{slug}", title, subtitle, source, label, source_path))
    for slug, title, source, subtitle, label in EXTRA_LOGOS:
        source_path = cached_download(source, SOURCE_DIR / "extra-logos" / f"{slug}.source")
        manifest.append(process_source(f"logo-extra-{slug}", title, subtitle, source, label, source_path))
    MANIFEST_PATH.parent.mkdir(parents=True, exist_ok=True)
    MANIFEST_PATH.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Generados {len(manifest)} retos reales en {ASSET_DIR}")


if __name__ == "__main__":
    main()
