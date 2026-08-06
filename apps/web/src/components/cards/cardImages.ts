// Baraja española de `public/cards/`: los 40 naipes de la baraja corta, que
// desde P31 son exactamente las cartas que reparten los tres juegos. No hay
// carta jugable sin imagen, así que esto siempre devuelve una ruta — no
// existe el caso "píntala de otra manera", y por eso `PlayingCard` ya no
// lleva baraja SVG de respaldo.
//
// Formato WebP a 320×448: la carta más grande que pinta la app son los 120 px
// CSS de `size='lg'` y del `clamp()` de /mesa, así que 320 px cubre pantallas
// de hasta 2,6× sin pesar como los PNG de origen (7,5 MB la baraja entera
// contra ~0,6 MB en WebP, que se descargan por la red del móvil de cada
// jugador).
import type { Rank, Suit } from '@ronda/protocol';

/** Ruta de la imagen de una carta. */
export function cardImageSrc(suit: Suit, rank: Rank): string {
  return `/cards/${suit}-${rank}.webp`;
}
