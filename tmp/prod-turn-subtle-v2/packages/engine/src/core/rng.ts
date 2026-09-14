// RNG determinista. Contrato §3 requisito 3.
//
// El motor es puro: NO usa Math.random ni Date. El azar se genera con mulberry32
// sembrado a partir de un hash de la `seed` de la partida, y el contador de llamadas
// (`calls`) va DENTRO del estado del juego. Así:
//   - mismo estado + misma acción ⇒ mismo resultado (determinismo).
//   - el estado es JSON-serializable puro (solo número, no función).

/**
 * Hash de cadena → entero de 32 bits. Determinista (FNV-1a modificado).
 * Nunca lanza; cualquier string da un número.
 */
export function hashSeed(seed: string): number {
  // FNV-1a 32-bit. Offset basis y prime estándar.
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    // h * 16777619 mod 2^32. Math.imul evita problemas de precisión.
    h = Math.imul(h, 0x01000193);
  }
  // Devuelve entero positivo de 32 bits.
  return h >>> 0;
}

/**
 * Crea una función generadora mulberry32 sembrada con `seedNum`.
 * Devuelve un valor en [0, 1) cada llamada.
 *
 * Implementación estándar y compacta de mulberry32.
 */
export function mulberry32(seedNum: number): () => number {
  let a = seedNum >>> 0;
  return function next(): number {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Baraja una copia de `items` con Fisher-Yates usando el RNG derivado de
 * (seed, calls). NO muta `items`. Devuelve los items barajados y cuántas
 * llamadas al RNG consumió (para que el estado pueda avanzar su contador).
 *
 * Determinismo: mismo `items` + misma `seed` + mismo `calls` ⇒ mismo orden,
 * siempre. Distinto `calls` ⇒ distinto orden (salvo casualidad astronómica).
 */
export function shuffle<T>(
  items: readonly T[],
  seed: string,
  calls: number,
): { items: T[]; calls: number } {
  const out = items.slice();
  const rand = mulberry32(hashSeed(seed));

  // Avanza el RNG `calls` veces para llegar al punto exacto del estado.
  for (let i = 0; i < calls; i++) rand();

  // Fisher-Yates de derecha a izquierda. Cada iteración consume 1 llamada.
  let consumed = calls;
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    consumed++;
    swap(out, i, j);
  }

  return { items: out, calls: consumed };
}

/** Swap seguro con indexación chequeada (noUncheckedIndexedAccess). */
function swap<T>(arr: T[], i: number, j: number): void {
  const a = arr[i];
  const b = arr[j];
  if (a === undefined || b === undefined) return;
  arr[i] = b;
  arr[j] = a;
}
