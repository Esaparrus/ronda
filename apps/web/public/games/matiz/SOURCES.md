# Fuentes de los retos de Matiz

Las cuatro ilustraciones clásicas añadidas al juego proceden de Wikimedia Commons
y se guardan localmente para que el juego no dependa de una petición externa.

- Popeye (primera aparición, 1929): https://commons.wikimedia.org/wiki/File:Popeye_el_marino.jpg — dominio público; autor: E. C. Segar.
- Félix el Gato (1930): https://commons.wikimedia.org/wiki/File:Felix.svg — CC0; autor de la vectorización: Patjones.
- Krazy Kat (1918): https://commons.wikimedia.org/wiki/File:Krazykat.jpg — Public Domain Mark; autor: George Herriman.
- Little Nemo (película de 1911): https://commons.wikimedia.org/wiki/File:Little_Nemo_film_-_hand-colored_filmreel.jpg — Public Domain Mark; autor: Winsor McCay.

Las zonas de reto son máscaras alfa preparadas a partir de los píxeles de cada
fuente. La base deja transparente el color objetivo y la interfaz lo vuelve a
pintar en el canvas con la mezcla del jugador. En Popeye se selecciona el rojo
de la camiseta; en Krazy Kat, una zona conectada de tinta; y en Little Nemo,
las zonas amarillas del carrete.

El preparador integrado en `/juegos/matiz/preparar` permite repetir este
proceso con cualquier imagen: elegir un píxel, ajustar la tolerancia y
descargar la base, la máscara y el JSON del nuevo reto.
