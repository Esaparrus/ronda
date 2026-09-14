// Evaluación de una mano de Mus: fuerza, grande, chica, pares, juego y punto.
// Contrato §12.6. Todo puro y sin estado: estas funciones no saben de turnos,
// ni de envites, ni de parejas -- solo de cuatro cartas.
import { parseCardId, type CardId, type Rank } from '@ronda/protocol';

// ---------------------------------------------------------------------------
// Fuerza de las cartas (§12.6)
// ---------------------------------------------------------------------------

/**
 * Fuerza con `ochoReyes = true`: los Treses valen como Rey y los Doses como
 * As, así que hay 8 cartas de máxima y 8 de mínima y solo quedan 8 escalones.
 *
 *   Rey/Tres > Caballo > Sota > Siete > Seis > Cinco > Cuatro > As/Dos
 */
const FUERZA_OCHO_REYES: Readonly<Record<number, number>> = {
  12: 8, // Rey
  3: 8, // Tres, vale como Rey
  11: 7, // Caballo
  10: 6, // Sota
  7: 5,
  6: 4,
  5: 3,
  4: 2,
  1: 1, // As
  2: 1, // Dos, vale como As
};

/**
 * Fuerza con `ochoReyes = false`, tal y como la congela §12.6: "el Tres va
 * entre la Sota y el Siete, y el Dos entre el Cuatro y el As".
 *
 *   Rey > Caballo > Sota > Tres > Siete > Seis > Cinco > Cuatro > Dos > As
 *
 * OJO: esta NO es la escala que usan la mayoría de las mesas sin ocho reyes,
 * donde el Tres es simplemente un 3 (por debajo del Cuatro) y el Dos un 2. El
 * contrato dice otra cosa, lo dice dos veces y de forma internamente
 * coherente (§12.6 y el test dorado §12.13.2), así que se implementa lo que
 * dice el contrato. Está anotado para que corregirlo, si algún día se decide,
 * sea cambiar esta tabla y nada más.
 */
const FUERZA_SIN_OCHO_REYES: Readonly<Record<number, number>> = {
  12: 10, // Rey
  11: 9, // Caballo
  10: 8, // Sota
  3: 7, // Tres, entre la Sota y el Siete (§12.6)
  7: 6,
  6: 5,
  5: 4,
  4: 3,
  2: 2, // Dos, entre el Cuatro y el As (§12.6)
  1: 1, // As
};

/**
 * Fuerza de un rango para comparar Grande y Chica. Cuanto más alto, más
 * fuerte. Las dos escalas solo se comparan consigo mismas: nunca se mezclan
 * manos evaluadas con configuraciones distintas.
 */
export function fuerzaMus(rank: Rank, ochoReyes: boolean): number {
  const tabla = ochoReyes ? FUERZA_OCHO_REYES : FUERZA_SIN_OCHO_REYES;
  return tabla[rank] ?? 0;
}

/** Rangos de una mano, en el orden en que vengan. Lanza si hay una carta corrupta. */
export function ranksOf(hand: readonly CardId[]): Rank[] {
  return hand.map((id) => {
    const parsed = parseCardId(id);
    if (!parsed.ok || parsed.value.rank === null) {
      throw new Error(`mus: cardId inválida en la mano: ${id}`);
    }
    return parsed.value.rank;
  });
}

/** Fuerzas de una mano ordenadas de mayor a menor (§12.6, Grande). */
export function fuerzasDesc(hand: readonly CardId[], ochoReyes: boolean): number[] {
  return ranksOf(hand)
    .map((r) => fuerzaMus(r, ochoReyes))
    .sort((a, b) => b - a);
}

// ---------------------------------------------------------------------------
// Grande y Chica (§12.6.1, §12.6.2)
// ---------------------------------------------------------------------------

/**
 * Compara dos manos a Grande. Devuelve >0 si `a` gana, <0 si gana `b`, 0 si
 * son exactamente iguales (el desempate por cercanía al mano es cosa del
 * reducer, §12.9, no de esta función).
 *
 * Algoritmo del contrato: las 4 cartas ordenadas de mayor a menor, una a una,
 * hasta que una difiera.
 */
export function compareGrande(a: readonly CardId[], b: readonly CardId[], ochoReyes: boolean): number {
  const fa = fuerzasDesc(a, ochoReyes);
  const fb = fuerzasDesc(b, ochoReyes);
  for (let i = 0; i < Math.max(fa.length, fb.length); i++) {
    const x = fa[i] ?? 0;
    const y = fb[i] ?? 0;
    if (x !== y) return x - y;
  }
  return 0;
}

/**
 * Compara dos manos a Chica: gana la más baja, comparando de menor a mayor.
 * Devuelve >0 si `a` gana (es decir, si `a` es más baja).
 */
export function compareChica(a: readonly CardId[], b: readonly CardId[], ochoReyes: boolean): number {
  const fa = fuerzasDesc(a, ochoReyes).slice().reverse();
  const fb = fuerzasDesc(b, ochoReyes).slice().reverse();
  for (let i = 0; i < Math.max(fa.length, fb.length); i++) {
    const x = fa[i] ?? Number.MAX_SAFE_INTEGER;
    const y = fb[i] ?? Number.MAX_SAFE_INTEGER;
    if (x !== y) return y - x; // más baja gana
  }
  return 0;
}

// ---------------------------------------------------------------------------
// Pares (§12.6.3)
// ---------------------------------------------------------------------------

export type ParesKind = 'duples' | 'medias' | 'pareja';

export interface Pares {
  kind: ParesKind;
  /** Piedras que valen en el recuento (§12.6): duples 3, medias 2, pareja 1. */
  piedras: number;
  /**
   * Clave de comparación, en fuerzas y de mayor a menor. Duples lleva dos
   * elementos (pareja alta, pareja baja); medias y pareja, uno.
   */
  key: number[];
}

/** Categoría como número, para comparar: duples > medias > pareja. */
const PARES_ORDER: Readonly<Record<ParesKind, number>> = { duples: 3, medias: 2, pareja: 1 };

/**
 * Pares de una mano, o null si no tiene ninguno. Contrato §12.6.3.
 *
 * Las parejas se forman sobre la FUERZA, no sobre el rango: con
 * `ochoReyes = true` un Rey y un Tres son pareja de reyes, y un As y un Dos
 * son pareja de ases. Es la razón de ser de la variante.
 *
 * Con 4 cartas solo hay cuatro repartos posibles:
 *   4 iguales      -> duples (se comparan como dos parejas de esa carta)
 *   2+2            -> duples
 *   3+1            -> medias
 *   2+1+1          -> pareja
 *   1+1+1+1        -> null
 */
export function paresOf(hand: readonly CardId[], ochoReyes: boolean): Pares | null {
  const counts = new Map<number, number>();
  for (const rank of ranksOf(hand)) {
    const f = fuerzaMus(rank, ochoReyes);
    counts.set(f, (counts.get(f) ?? 0) + 1);
  }

  const cuadruple = [...counts.entries()].find(([, n]) => n === 4);
  if (cuadruple) {
    const f = cuadruple[0];
    return { kind: 'duples', piedras: 3, key: [f, f] };
  }

  const trio = [...counts.entries()].find(([, n]) => n === 3);
  if (trio) return { kind: 'medias', piedras: 2, key: [trio[0]] };

  const pairs = [...counts.entries()]
    .filter(([, n]) => n === 2)
    .map(([f]) => f)
    .sort((a, b) => b - a);

  if (pairs.length === 2) {
    return { kind: 'duples', piedras: 3, key: pairs };
  }
  if (pairs.length === 1) {
    const only = pairs[0];
    if (only !== undefined) return { kind: 'pareja', piedras: 1, key: [only] };
  }
  return null;
}

/**
 * Compara dos jugadas de pares. Devuelve >0 si `a` gana. Categoría primero
 * y, dentro de la misma categoría, la carta más alta (y en duples, la
 * segunda si empatan las altas). 0 si son idénticas.
 */
export function comparePares(a: Pares, b: Pares): number {
  const ca = PARES_ORDER[a.kind];
  const cb = PARES_ORDER[b.kind];
  if (ca !== cb) return ca - cb;
  for (let i = 0; i < Math.max(a.key.length, b.key.length); i++) {
    const x = a.key[i] ?? 0;
    const y = b.key[i] ?? 0;
    if (x !== y) return x - y;
  }
  return 0;
}

// ---------------------------------------------------------------------------
// Juego y punto (§12.6.4, §12.6 bis)
// ---------------------------------------------------------------------------

/**
 * Suma de juego de una mano. Contrato §12.6.4: Rey, Caballo y Sota cuentan
 * **10** y el resto por su número (As = 1).
 *
 * `ochoReyes` NO interviene aquí: es una decisión tomada por Unai al cerrar
 * §12.6 -- la variante cambia la fuerza con la que se comparan Grande y
 * Chica, pero no lo que suma cada carta. El Tres suma 3 y el Dos suma 2
 * siempre. Por eso esta función no recibe config: no hay nada que configurar.
 */
export function juegoSuma(hand: readonly CardId[]): number {
  return ranksOf(hand).reduce((sum, rank) => sum + (rank >= 10 ? 10 : rank), 0);
}

/** ¿Llega a 31? Solo quienes tienen juego juegan el lance (§12.6.4). */
export function tieneJuego(suma: number): boolean {
  return suma >= 31;
}

/**
 * Orden de mejor juego del contrato: 31, 32, 40, 37, 36, 35, 34, 33 (de mejor
 * a peor). Devuelve un número comparable: cuanto más alto, mejor juego. 0 si
 * la mano no tiene juego.
 *
 * 38 y 39 no aparecen porque son imposibles con esta baraja: harían falta un
 * 8 o un 9, que no existen (§12.1).
 */
const JUEGO_ORDER: readonly number[] = [31, 32, 40, 37, 36, 35, 34, 33];

export function juegoRank(suma: number): number {
  const i = JUEGO_ORDER.indexOf(suma);
  if (i === -1) return 0;
  return JUEGO_ORDER.length - i;
}

/** Piedras que vale el juego en el recuento (§12.6.4): 31 vale 3, el resto 2. */
export function juegoPiedras(suma: number): number {
  return suma === 31 ? 3 : 2;
}

/**
 * Al punto (§12.6 bis): solo se juega si NADIE llega a 31, y gana la suma más
 * alta. Devuelve la propia suma, que es la clave de comparación.
 */
export function puntoValor(hand: readonly CardId[]): number {
  return juegoSuma(hand);
}
