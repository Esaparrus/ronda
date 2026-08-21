# Fuentes de los retos de Matiz

Las escenas de animación se guardan localmente para que el juego no dependa de
peticiones externas durante una partida.

- Popeye (1929): https://commons.wikimedia.org/wiki/File:Popeye_el_marino.jpg — dominio público; autor original: E. C. Segar.
- Humpty Dumpty (1936): https://commons.wikimedia.org/wiki/File:GreedyHumptyDumptyCC1936.jpg — dominio público.
- Zhenya (1948): https://commons.wikimedia.org/wiki/File:Zhenya004.jpg — dominio público.
- Hunky and Spunky (1938): https://commons.wikimedia.org/wiki/File:HunkyandSpunkyCC1938.jpg — dominio público.
- Cartela de Porky / Looney Tunes (1943): https://commons.wikimedia.org/wiki/File:Thats_all_folks_cl%C3%A0ssic_-Daffy_Comando_1943.png — dominio público.

Robot retro, Gato astral, Monstruo pizza, Cohete color y Logo Rayo son
composiciones originales creadas para este proyecto.

Cada reto tiene una base y una máscara alfa preparadas a nivel de píxel. La
base deja transparente la zona objetivo y la interfaz la pinta en el canvas
con la mezcla del jugador. El preparador integrado en
`/juegos/matiz/preparar` permite repetir el proceso con cualquier imagen:
elegir un píxel, ajustar la tolerancia y descargar la base, la máscara y el
JSON del nuevo reto.
