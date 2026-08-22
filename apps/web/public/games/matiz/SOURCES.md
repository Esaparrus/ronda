# Fuentes de los retos de Matiz

El catálogo tiene 123 retos: los 10 retos iniciales, 100 Pokémon oficiales y
8 personajes reales de videojuegos/animación más 5 logos reales. Todas las
imágenes que consume la aplicación están guardadas como PNG local con su
`*-base.png` y `*-mask.png`; el proceso no genera dibujos nuevos.

## Pokémon oficiales

Los 100 primeros Pokémon usan los PNG oficiales de Pokémon, del 001 al 100:

- https://assets.pokemon.com/assets/cms2/img/pokedex/full/001.png
- https://assets.pokemon.com/assets/cms2/img/pokedex/full/100.png

El patrón intermedio es el mismo (`002.png`, `003.png`, etc.).

## Personajes reales

- Sonic: https://pngimg.com/image/104472 — PNG directo: https://pngimg.com/uploads/sonic_hedgehog/sonic_hedgehog_PNG32.png
- Mickey Mouse: https://www.cleanpng.com/ — imagen servida por CleanPNG: https://icon2.cleanpng.com/lnd/20241030/jf/c67e4c3bf7a96aa7822221bd175ba5.webp
- Pac-Man: https://www.pngaaa.com/detail/4435226 — PNG directo: https://image.pngaaa.com/226/4435226-middle.png
- Mario: https://www.pngkey.com/detail/u2w7e6y3y3e6u2u2_mariostanding-super-mario/ — PNG directo: https://www.pngkey.com/png/detail/218-2189527_mariostanding-super-mario.png
- Crash Bandicoot: https://www.pngaaa.com/detail/281722 — PNG directo: https://image.pngaaa.com/722/281722-middle.png
- Kirby: https://png.klev.club/4209-kirbi.html — PNG directo: https://png.klev.club/uploads/posts/2024-04/png-klev-club-4p85-p-kirbi-png-17.png
- Bugs Bunny: https://www.clipartmax.com/middle/m2H7H7m2K9d3d3K9_bugs-bunny-bugs-bunny-clipart-bugs-bunny-pinterest-bugs-bunny-clip-art/ — PNG directo: https://www.clipartmax.com/png/middle/299-2998364_bugs-bunny-bugs-bunny-clipart-bugs-bunny-pinterest-bugs-bunny-clip-art.png
- Tom y Jerry: https://www.pikpng.com/pngvi/mbbxhb_tom-and-jerry-png-images-free-tom-y-png-transparent-png/ — PNG directo: https://www.pikpng.com/pngl/m/185-1850751_tom-and-jerry-png-images-free-tom-y.png

## Logos reales

- Google: https://clipartcraft.com/explore/transparent-background-google-logo-invisible/ — PNG directo: https://clipartcraft.com/images/transparent-background-google-logo-invisible-1.png
- YouTube: https://www.citypng.com/photo/8279/hd-official-youtube-yt-logo-png — PNG directo: https://www.citypng.com/public/uploads/preview/hd-official-youtube-yt-logo-png-701751694786680qxacfiwgqw.png
- Netflix: https://pngdownload.io/png-image/netflix-logo-streaming-platform-brand-icon-transparent-png-image/ — la fuente se descargó y se convirtió a PNG local.
- McDonald’s: https://www.citypng.com/photo/4369/hd-white-mcdonalds-official-text-brand-logo-png-image — PNG directo: https://www.citypng.com/public/uploads/preview/mcdonalds-yellow-m-symbol-logo-high-resolution-70175169479008933cofjbaaw.png
- Nike: https://favpng.com/png_view/nike-logo-nike-air-force-one-swoosh-shoe-png-favpng-SRXGFaPjhcHDXrN6mVL0dYFYH.jpg — la fuente se limpió y se convirtió a PNG local.

## Preparación

`apps/web/scripts/build-matiz-real-catalog.py` descarga las fuentes, limpia
fondos neutros o cuadrículas incrustadas, deja transparente el color objetivo y
crea la base y la máscara alfa que usa el canvas. Cada reto conserva su URL de
origen en el JSON homónimo.

El preparador integrado en `/juegos/matiz/preparar` permite repetir el proceso
con una imagen propia: elegir un píxel, ajustar la tolerancia y descargar la
base, la máscara y el JSON del nuevo reto.
