// Resolver de combinaciones de Chinchón. Contrato §5.4, §5.5, §5.9.
//
// Algoritmo (al pie de la letra del §5.9):
//   1. Indexa las cartas de la mano 0..n-1 (n <= 8). Cada subconjunto = máscara.
//   2. Enumera TODAS las combinaciones válidas como máscaras:
//        - Grupos: 3-4 cartas del mismo rango, o 2 + un comodín.
//        - Escaleras: 3+ cartas consecutivas del mismo palo (1..12, sin vuelta),
//          con o sin comodín.
//        - Se descartan las combinaciones con >1 comodín.
//   3. best(mask) = min( puntos(mask), min sobre c ⊆ mask de best(mask \ c) )
//      con memoización. n <= 8 => <= 256 estados => instantáneo.
//   4. Reconstruye la solución guardando la combinación elegida en cada estado.
//
// Desempate (§5.9): deadwood mínimo → MÁS cartas en combinaciones → MENOS
// combinaciones (preferir largas) → orden estable por CardId.
//
// Nota de implementación: el algoritmo es exactamente el del contrato; lo que
// está afinado es *cómo* se ejecuta. Ver el bloque "Búferes reutilizables".
import {
  parseCardId,
  cardPoints as pointsOf,
  SUITS,
  type Card,
  type CardId,
  type ChinchonConfig,
} from '@ronda/protocol';

// ---------------------------------------------------------------------------
// Tipos públicos
// ---------------------------------------------------------------------------

export interface MeldSolution {
  /** Combinaciones: cada una es una lista de CardId (3-4 cartas válidas). */
  melds: CardId[][];
  /** Cartas sueltas (no en ninguna combinación). */
  leftovers: CardId[];
  /** Puntos de las cartas sueltas con la mejor combinación. */
  deadwood: number;
}

// ---------------------------------------------------------------------------
// Búferes reutilizables
// ---------------------------------------------------------------------------
//
// `solveHand` se llama muchísimo (la IA de la máquina evalúa cada descarte, y
// `closableDiscards` resuelve 8 manos por turno), siempre de forma síncrona y
// nunca de forma reentrante: ninguna de estas funciones se llama a sí misma ni
// cede el control. Por eso todo el estado de trabajo vive en búferes de módulo
// que se reciclan entre llamadas, en vez de reasignarse en cada una. Esto
// elimina ~10 asignaciones (y varios KB) por resolución.
//
// Invariante que hay que mantener si se toca este fichero: entre `indexHand()`
// y el final de `solveHand()` no puede colarse otra llamada a `indexHand()` /
// `enumerateMelds()` / `solveHand()`.

const MAX_N = 8;
const NSTATES_MAX = 1 << MAX_N; // 256

/** Índice de palo (mismo orden que SUITS del protocolo) para las tablas planas. */
const SUIT_TO_INDEX = new Map<string, number>(SUITS.map((s, i) => [s, i]));

/** Cartas de la mano actual; solo son válidas las `n` primeras posiciones. */
const scratchCards: Card[] = [];
/** presence[palo * 13 + rango] = índice de la carta en la mano, o -1. */
const presence = new Int8Array(4 * 13);
/** Cuántas cartas reales hay de cada palo (para podar palos sin escalera posible). */
const suitCount = new Int8Array(4);
/** Cuántas cartas hay de cada rango, y sus índices en la mano. */
const rankCount = new Int8Array(13);
const rankSlots = new Int8Array(13 * 4);
/** Rangos presentes, en orden de primera aparición en la mano. */
const ranksSeen = new Int8Array(13);
let ranksSeenLen = 0;
/** Índice del primer comodín de la mano, o -1. */
let firstJoker = -1;

/** Combinaciones enumeradas (máscaras) y su popcount. */
const meldBuf = new Int32Array(NSTATES_MAX);
const meldPopBuf = new Int32Array(NSTATES_MAX);
/** Deduplicación de máscaras por "generación", sin reservar un Set por llamada. */
const seenGen = new Int32Array(NSTATES_MAX);
let gen = 0;
let meldCount = 0;

/** Combinaciones agrupadas por su bit más bajo: byLow[bit * NSTATES_MAX + k]. */
const byLow = new Int32Array(MAX_N * NSTATES_MAX);
const byLowLen = new Int32Array(MAX_N);

/** Memoización de best(mask) y decisión tomada en cada estado. */
const memoDead = new Int32Array(NSTATES_MAX);
const memoUsed = new Int32Array(NSTATES_MAX);
const memoMeldCount = new Int32Array(NSTATES_MAX);
const choice = new Int32Array(NSTATES_MAX);

// ---------------------------------------------------------------------------
// Paso 1: indexado de la mano
// ---------------------------------------------------------------------------

/**
 * Indexa la mano en `scratchCards` y deja preparadas las tablas de presencia
 * (`presence`, `suitCount`, `rankCount`/`rankSlots`, `ranksSeen`, `firstJoker`)
 * que consume la enumeración. Devuelve n y la máscara completa.
 *
 * Lanza si hay cartas repetidas o ids inválidos (invariante del contrato §5.10).
 */
function indexHand(hand: CardId[], config: ChinchonConfig): { n: number; fullMask: number } {
  const n = hand.length;
  if (n > MAX_N) throw new Error(`indexHand: mano demasiado grande (n=${n})`);

  presence.fill(-1);
  suitCount.fill(0);
  rankCount.fill(0);
  ranksSeenLen = 0;
  firstJoker = -1;
  let joker1Seen = false;
  let joker2Seen = false;

  for (let i = 0; i < n; i++) {
    const id = hand[i];
    if (id === undefined) throw new Error('indexHand: hueco en la mano');
    const r = parseCardId(id);
    if (!r.ok) throw new Error(`indexHand: id inválido: ${id}`);
    const card = r.value;
    card.points = pointsOf(card, config);
    scratchCards[i] = card;

    if (card.isJoker) {
      const isJoker2 = card.id === 'joker-2';
      if (isJoker2 ? joker2Seen : joker1Seen) {
        throw new Error(`indexHand: carta repetida en la mano: ${id}`);
      }
      if (isJoker2) joker2Seen = true;
      else joker1Seen = true;
      if (firstJoker < 0) firstJoker = i;
      continue;
    }

    const suitIdx = card.suit === null ? undefined : SUIT_TO_INDEX.get(card.suit);
    const rank = card.rank;
    if (suitIdx === undefined || rank === null) throw new Error(`indexHand: id inválido: ${id}`);

    const slot = suitIdx * 13 + rank;
    if ((presence[slot] ?? -1) >= 0) throw new Error(`indexHand: carta repetida en la mano: ${id}`);
    presence[slot] = i;
    suitCount[suitIdx] = (suitCount[suitIdx] ?? 0) + 1;

    const k = rankCount[rank] ?? 0;
    if (k === 0) ranksSeen[ranksSeenLen++] = rank;
    rankSlots[rank * 4 + k] = i;
    rankCount[rank] = k + 1;
  }

  return { n, fullMask: n === 0 ? 0 : (1 << n) - 1 };
}

/** Número de bits a 1 (cartas que ocupa una combinación). */
function popcount(x: number): number {
  let c = 0;
  while (x) {
    x &= x - 1;
    c++;
  }
  return c;
}

// ---------------------------------------------------------------------------
// Paso 2: enumeración de combinaciones válidas como máscaras
// ---------------------------------------------------------------------------

/** Apunta una máscara en `meldBuf` si no estaba ya (dedupe por generación). */
function addMeld(mask: number): void {
  if (seenGen[mask] === gen) return;
  seenGen[mask] = gen;
  meldBuf[meldCount++] = mask;
}

/**
 * Enumera las combinaciones sobre las tablas que dejó `indexHand`. Deja las
 * máscaras en `meldBuf[0..devuelto)` y devuelve cuántas hay.
 *
 * El orden de emisión es el del contrato y se mantiene estable respecto de la
 * versión anterior: primero los grupos (por orden de primera aparición del
 * rango en la mano), luego las escaleras por palo en el orden de SUITS, con
 * rango inicial ascendente y longitud ascendente.
 */
function enumerateInto(): number {
  gen++;
  meldCount = 0;

  // --- Grupos: mismo rango, tamaño 3-4; o pareja + comodín. ---
  for (let ri = 0; ri < ranksSeenLen; ri++) {
    const rank = ranksSeen[ri] ?? 0;
    const k = rankCount[rank] ?? 0;
    const base = rank * 4;
    if (k >= 3) {
      for (let i = 0; i < k; i++) {
        const a = 1 << (rankSlots[base + i] ?? 0);
        for (let j = i + 1; j < k; j++) {
          const b = a | (1 << (rankSlots[base + j] ?? 0));
          for (let l = j + 1; l < k; l++) {
            const c = b | (1 << (rankSlots[base + l] ?? 0));
            addMeld(c);
            for (let m = l + 1; m < k; m++) {
              addMeld(c | (1 << (rankSlots[base + m] ?? 0)));
            }
          }
        }
      }
    }
    if (k === 2 && firstJoker >= 0) {
      addMeld((1 << (rankSlots[base] ?? 0)) | (1 << (rankSlots[base + 1] ?? 0)) | (1 << firstJoker));
    }
  }

  // --- Escaleras: consecutivas mismo palo, longitud >= 3, sin vuelta 12->1. ---
  const jokerBit = firstJoker >= 0 ? 1 << firstJoker : 0;
  for (let s = 0; s < 4; s++) {
    // Una escalera necesita 3 cartas del palo, o 2 más el comodín. Si el palo
    // no llega, no hay ninguna ventana que pueda dar combinación: se salta
    // entero (el conjunto enumerado es el mismo, solo se evita el barrido).
    const cnt = suitCount[s] ?? 0;
    if (cnt < 2 || (cnt < 3 && jokerBit === 0)) continue;
    const base = s * 13;
    // start <= 10 porque la longitud mínima es 3 y el rango máximo es 12.
    for (let start = 1; start <= 10; start++) {
      let mask = 0;
      let present = 0;
      let missing = 0;
      for (let r = start; r <= 12; r++) {
        const at = presence[base + r] ?? -1;
        if (at >= 0) {
          mask |= 1 << at;
          present++;
        } else {
          // Con dos huecos ya no hay ventana válida, ni esta ni ninguna más
          // larga con este mismo inicio: se corta.
          if (++missing >= 2) break;
        }
        if (r - start + 1 < 3) continue;
        if (missing === 0) addMeld(mask);
        else if (present >= 2 && jokerBit !== 0) addMeld(mask | jokerBit);
      }
    }
  }

  return meldCount;
}

/**
 * Enumera TODAS las combinaciones válidas de la mano como máscaras de bits.
 * API pública del contrato §5.9 paso 2. Sin duplicados.
 */
export function enumerateMelds(hand: CardId[], config: ChinchonConfig): number[] {
  indexHand(hand, config);
  const m = enumerateInto();
  const out: number[] = new Array<number>(m);
  for (let i = 0; i < m; i++) out[i] = meldBuf[i] ?? 0;
  return out;
}

// ---------------------------------------------------------------------------
// Paso 3 y 4: best(mask) con memoización + reconstrucción
// ---------------------------------------------------------------------------

/** n de la mano en curso; lo leen `best` y la reconstrucción. */
let curN = 0;

/**
 * best(mask): rellena memoDead/memoUsed/memoMeldCount/choice para `mask`.
 *
 * El bit menos significativo puesto es la "carta clave". Dos opciones:
 *   (a) queda suelta: sumar sus puntos + best(mask sin ese bit);
 *   (b) forma parte de alguna combinación que lo incluye: best(mask \ meld).
 * La base "todo suelto" queda cubierta por aplicar (a) recursivamente. Basta
 * mirar las combinaciones que contienen ese bit: esa carta o entra en alguna
 * combinación o queda suelta, así que no se pierde ninguna solución.
 */
function best(mask: number): void {
  if (memoDead[mask] !== -1) return;

  let bDead = Number.MAX_SAFE_INTEGER;
  let bUsed = 0;
  let bMeldCount = 0;
  let bestChoice = 0;

  if (mask === 0) {
    // Caso base: sin cartas, 0 puntos.
    bDead = 0;
  } else {
    const low = mask & -mask;
    const lowestBit = 31 - Math.clz32(low);
    const lowCard = scratchCards[lowestBit];

    // (a) Queda suelta.
    if (lowestBit >= 0 && lowestBit < curN && lowCard) {
      const rest = mask & ~low;
      best(rest);
      bDead = (memoDead[rest] ?? 0) + lowCard.points;
      bUsed = memoUsed[rest] ?? 0;
      bMeldCount = memoMeldCount[rest] ?? 0;
      // choice 0 = la carta baja queda suelta.
    }

    // (b) Forma parte de una combinación que la incluye.
    if (lowestBit >= 0 && lowestBit < curN) {
      const bucket = lowestBit * NSTATES_MAX;
      const len = byLowLen[lowestBit] ?? 0;
      for (let b = 0; b < len; b++) {
        const mi = byLow[bucket + b] ?? 0;
        const cm = meldBuf[mi] ?? 0;
        if ((cm & mask) !== cm) continue;
        const rest = mask & ~cm;
        best(rest);
        const candDead = memoDead[rest] ?? 0;
        const candUsed = (meldPopBuf[mi] ?? 0) + (memoUsed[rest] ?? 0);
        const candMeld = 1 + (memoMeldCount[rest] ?? 0);
        // Desempate: deadwood asc, used desc, meldCount asc.
        if (
          candDead < bDead ||
          (candDead === bDead && candUsed > bUsed) ||
          (candDead === bDead && candUsed === bUsed && candMeld < bMeldCount)
        ) {
          bDead = candDead;
          bUsed = candUsed;
          bMeldCount = candMeld;
          bestChoice = cm;
        }
      }
    }
  }

  memoDead[mask] = bDead;
  memoUsed[mask] = bUsed;
  memoMeldCount[mask] = bMeldCount;
  choice[mask] = bestChoice;
}

/**
 * Resuelve la mejor combinación de una mano (deadwood mínimo). Contrato §5.9.
 *
 * Desempate: deadwood mínimo → MÁS cartas en combinaciones → MENOS
 * combinaciones (preferir largas) → orden estable por CardId (al reconstruir).
 */
export function solveHand(hand: CardId[], config: ChinchonConfig): MeldSolution {
  const { n, fullMask } = indexHand(hand, config);
  if (n === 0) return { melds: [], leftovers: [], deadwood: 0 };
  curN = n;

  const M = enumerateInto();
  for (let mi = 0; mi < M; mi++) meldPopBuf[mi] = popcount(meldBuf[mi] ?? 0);

  // Agrupa las combinaciones por su bit menos significativo, para que best()
  // solo mire las relevantes en cada estado.
  byLowLen.fill(0);
  for (let mi = 0; mi < M; mi++) {
    const cm = meldBuf[mi] ?? 0;
    // Índice del bit menos significativo (exacto para enteros de 32 bits).
    const lowest = 31 - Math.clz32(cm & -cm);
    if (lowest >= 0 && lowest < n) {
      const len = byLowLen[lowest] ?? 0;
      byLow[lowest * NSTATES_MAX + len] = mi;
      byLowLen[lowest] = len + 1;
    }
  }

  const NSTATES = 1 << n;
  memoDead.fill(-1, 0, NSTATES);

  best(fullMask);

  // Reconstrucción: recorre las decisiones de best() desde la máscara completa.
  // choice[mask] === 0 significa "el bit más bajo queda suelto" → lo mandamos a
  // leftovers y seguimos con el resto. choice[mask] !== 0 es una combinación.
  const melds: CardId[][] = [];
  const leftovers: CardId[] = [];
  let mask = fullMask;
  while (mask !== 0) {
    const cm = choice[mask];
    if (cm === undefined) break;
    if (cm === 0) {
      // El bit más bajo queda suelto.
      const low = mask & -mask;
      const lowBit = 31 - Math.clz32(low);
      const c = lowBit >= 0 && lowBit < n ? scratchCards[lowBit] : undefined;
      if (c) leftovers.push(c.id);
      mask &= ~low;
      continue;
    }
    const idsInMeld: CardId[] = [];
    for (let i = 0; i < n; i++) {
      if (cm & (1 << i)) {
        const c = scratchCards[i];
        if (c) idsInMeld.push(c.id);
      }
    }
    idsInMeld.sort();
    melds.push(idsInMeld);
    mask &= ~cm;
  }
  leftovers.sort();

  const deadwood = memoDead[fullMask] ?? 0;
  return { melds, leftovers, deadwood };
}

// ---------------------------------------------------------------------------
// Chinchón (§5.7)
// ---------------------------------------------------------------------------

/**
 * ¿Es chinchón? Solo si la mano de 7 cartas forma UNA escalera de 7 del mismo
 * palo SIN comodines. Contrato §5.7. Los comodines no valen para el chinchón.
 */
export function isChinchon(hand: CardId[]): boolean {
  if (hand.length !== 7) return false;

  const suits = new Set<string>();
  const ranks: number[] = [];
  for (const id of hand) {
    const r = parseCardId(id);
    if (!r.ok) return false;
    if (r.value.isJoker) return false;
    if (r.value.suit === null || r.value.rank === null) return false;
    suits.add(r.value.suit);
    ranks.push(r.value.rank);
  }
  if (suits.size !== 1) return false;

  ranks.sort((a, b) => a - b);
  const first = ranks[0];
  if (first === undefined) return false;
  for (let i = 0; i < ranks.length; i++) {
    if (ranks[i] !== first + i) return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// Cierre (§5.6)
// ---------------------------------------------------------------------------

/**
 * ¿Se puede cerrar descartando `discardId`? Contrato §5.6.
 * Cierra si, tras retirar discardId de la mano de 8, el deadwood es
 * <= config.closeThreshold. Devuelve false si la carta no está en la mano.
 */
export function canCloseWith(hand: CardId[], discardId: CardId, config: ChinchonConfig): boolean {
  if (hand.length !== 8) return false;
  if (!hand.includes(discardId)) return false;
  const remaining = hand.filter((id) => id !== discardId);
  const sol = solveHand(remaining, config);
  return sol.deadwood <= config.closeThreshold;
}

/**
 * Cartas cuyo descarte permite cerrar. PlayerView.me.closableDiscards.
 * Para una mano de 8, devuelve las cartas que puedes tirar para quedar <= umbral.
 */
export function closableDiscards(hand: CardId[], config: ChinchonConfig): CardId[] {
  if (hand.length !== 8) return [];
  const out: CardId[] = [];
  for (const id of hand) {
    if (canCloseWith(hand, id, config)) out.push(id);
  }
  return out.sort();
}
