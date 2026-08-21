# Fuentes de los retos de Matiz

El catálogo usa personajes aislados descargados como PNG y guardados
localmente. Se ha eliminado el tablero de “transparencia” incrustado que
traían algunas descargas antes de crear las máscaras.

- Popeye (1929): https://commons.wikimedia.org/wiki/File:Popeye_el_marino.jpg — fuente conservada del reto original.
- Pikachu: https://www.clipartmax.com/middle/222-2229537_pikachu-clipart-transparent-background-pikachu-pokemon-go-png.png
- Homer Simpson: https://favpng.com/png_view/bart-simpson-homer-simpson-bart-simpson-maggie-simpson-lisa-simpson-marge-simpson-png/WsFHJLnR
- Bart Simpson: https://www.clipartmax.com/max/m2i8A0K9G6d3H7d3/
- Bob Esponja: https://www.vhv.rs/viewpic/hTbhTJo_spongebob-png-spongebob-squarepants-transparent-png/
- Bulbasaur: https://www.clipartmax.com/middle/m2H7i8G6m2N4H7H7_anime-pokemon-bulbasaur/
- Charmander: https://www.pngaaa.com/detail/589373
- Squirtle: https://www.pngaaa.com/detail/2974929
- Eevee: https://www.pngaaa.com/detail/2014863
- Psyduck: https://pngset.com/free/psyduck

Cada reto tiene una base y una máscara alfa preparadas a nivel de píxel. La
base deja transparente la zona objetivo y la interfaz la pinta en el canvas
con la mezcla del jugador. El preparador integrado en
`/juegos/matiz/preparar` permite repetir el proceso con cualquier imagen:
elegir un píxel, ajustar la tolerancia y descargar la base, la máscara y el
JSON del nuevo reto.
