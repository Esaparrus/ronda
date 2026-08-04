// Baraja española fotográfica servida desde `public/cards/`. Convive con la
// baraja SVG de `cardArt.tsx`, no la sustituye: solo existen imágenes de los
// **40 naipes** de la baraja corta (1-7, 10-12 en los cuatro palos).
//
// Consecuencia directa, y por eso este módulo devuelve `null` en vez de una
// ruta inventada: Pocha (§9) y Mus (§12) juegan con esos 40 exactos, así que
// se ven enteramente con imagen; Chinchón (§5) reparte 48 naipes + 2
// comodines, así que sus ochos, nueves y comodines caen en el dibujo SVG.
// `PlayingCard` decide con `cardImageSrc()`, nunca con el juego en curso: el
// componente no sabe —ni debe saber— a qué se está jugando.
//
// Formato WebP a 320×448: la carta más grande que pinta la app son los 120 px
// CSS de `size='lg'` y del `clamp()` de /mesa, así que 320 px cubre pantallas
// de hasta 2,6× sin pesar como los PNG de origen (7,5 MB la baraja entera
// contra ~0,8 MB en WebP, que se descargan por la red del móvil de cada
// jugador).
import type { Rank, Suit } from '@ronda/protocol';

/** Rangos con imagen: la baraja corta española, sin ochos ni nueves. */
const IMAGE_RANKS: ReadonlySet<number> = new Set([1, 2, 3, 4, 5, 6, 7, 10, 11, 12]);

/**
 * Ruta de la imagen de una carta, o `null` si no hay imagen para ella
 * (comodín, ocho o nueve). Quien llame debe tratar `null` como "píntala con
 * el dibujo SVG", no como un error.
 */
export function cardImageSrc(suit: Suit | null, rank: Rank | null): string | null {
  if (suit === null || rank === null) return null;
  if (!IMAGE_RANKS.has(rank)) return null;
  return `/cards/${suit}-${rank}.webp`;
}
