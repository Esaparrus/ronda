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
// Indexado de la mano (una sola vez, compartido)
// ---------------------------------------------------------------------------

interface IndexedHand {
  cards: Card[]; // cartas únicas, índice = bit
  n: number;
  fullMask: number;
}

/** Indexa la mano: cartas únicas con points calculados según config. */
function indexHand(hand: CardId[], config: ChinchonConfig): IndexedHand {
  const seen = new Set<CardId>();
  const cards: Card[] = [];
  for (const id of hand) {
    if (seen.has(id)) throw new Error(`indexHand: carta repetida en la mano: ${id}`);
    seen.add(id);
    const r = parseCardId(id);
    if (!r.ok) throw new Error(`indexHand: id inválido: ${id}`);
    cards.push({ ...r.value, points: pointsOf(r.value, config) });
  }
  const n = cards.length;
  if (n > 8) throw new Error(`indexHand: mano demasiado grande (n=${n})`);
  return { cards, n, fullMask: n === 0 ? 0 : (1 << n) - 1 };
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

/** Enumera las combinaciones a partir de un IndexedHand (sin re-indexar). */
function enumerateMeldsIndexed(idx: IndexedHand): number[] {
  const { cards, n } = idx;
  const melds = new Set<number>();

  const addMask = (idxs: number[]) => {
    let m = 0;
    for (const i of idxs) m |= 1 << i;
    melds.add(m);
  };

  const jokerIndices: number[] = [];
  const bySuitRank = new Map<string, number>(); // "suit-rank" -> index
  const byRank = new Map<number, number[]>(); // rank -> indices

  for (let i = 0; i < n; i++) {
    const c = cards[i];
    if (!c) continue;
    if (c.isJoker) {
      jokerIndices.push(i);
    } else if (c.suit !== null && c.rank !== null) {
      bySuitRank.set(`${c.suit}-${c.rank}`, i);
      const arr = byRank.get(c.rank);
      if (arr) arr.push(i);
      else byRank.set(c.rank, [i]);
    }
  }
  const firstJoker = jokerIndices[0];

  // --- Grupos: mismo rango, tamaño 3-4; o pareja + comodín. ---
  for (const [, idxs] of byRank) {
    if (idxs.length >= 3) {
      for (let i = 0; i < idxs.length; i++) {
        const a = idxs[i];
        if (a === undefined) continue;
        for (let j = i + 1; j < idxs.length; j++) {
          const b = idxs[j];
          if (b === undefined) continue;
          for (let k = j + 1; k < idxs.length; k++) {
            const c = idxs[k];
            if (c === undefined) continue;
            addMask([a, b, c]);
            for (let l = k + 1; l < idxs.length; l++) {
              const d = idxs[l];
              if (d === undefined) continue;
              addMask([a, b, c, d]);
            }
          }
        }
      }
    }
    if (idxs.length === 2 && firstJoker !== undefined) {
      const a = idxs[0];
      const b = idxs[1];
      if (a !== undefined && b !== undefined) addMask([a, b, firstJoker]);
    }
  }

  // --- Escaleras: consecutivas mismo palo, longitud >= 3, sin vuelta 12->1. ---
  for (const suit of SUITS) {
    for (let start = 1; start <= 12; start++) {
      for (let len = 3; start + len - 1 <= 12; len++) {
        const present: number[] = [];
        let missing = 0;
        for (let r = start; r < start + len; r++) {
          const idxF = bySuitRank.get(`${suit}-${r}`);
          if (idxF !== undefined) present.push(idxF);
          else missing++;
        }
        if (missing === 0) {
          addMask(present);
        } else if (missing === 1 && present.length >= 2 && firstJoker !== undefined) {
          addMask([...present, firstJoker]);
        }
      }
    }
  }

  return [...melds];
}

/**
 * Enumera TODAS las combinaciones válidas de la mano como máscaras de bits.
 * API pública del contrato §5.9 paso 2. Sin duplicados.
 */
export function enumerateMelds(hand: CardId[], config: ChinchonConfig): number[] {
  return enumerateMeldsIndexed(indexHand(hand, config));
}

// ---------------------------------------------------------------------------
// Paso 3 y 4: best(mask) con memoización + reconstrucción
// ---------------------------------------------------------------------------

/**
 * Resuelve la mejor combinación de una mano (deadwood mínimo). Contrato §5.9.
 *
 * Desempate: deadwood mínimo → MÁS cartas en combinaciones → MENOS
 * combinaciones (preferir largas) → orden estable por CardId (al reconstruir).
 */
export function solveHand(hand: CardId[], config: ChinchonConfig): MeldSolution {
  const idx = indexHand(hand, config);
  const { cards, n, fullMask } = idx;
  if (n === 0) return { melds: [], leftovers: [], deadwood: 0 };

  const meldMasks = enumerateMeldsIndexed(idx);
  const M = meldMasks.length;
  // Precomputa popcount por combinación (Int32Array para acceso rápido).
  const meldPop = new Int32Array(M);
  for (let mi = 0; mi < M; mi++) {
    const cm = meldMasks[mi];
    if (cm !== undefined) meldPop[mi] = popcount(cm);
  }

  // Optimización "bit más bajo": para resolver best(mask), basta considerar las
  // combinaciones que contienen el bit menos significativo puesto de `mask`
  // (esa carta o forma parte de alguna combinación o queda suelta). Esto reduce
  // el número de combinaciones exploradas por estado de M a las relevantes.
  const meldsByLowestBit: number[][] = Array.from({ length: n }, () => []);
  for (let mi = 0; mi < M; mi++) {
    const cm = meldMasks[mi];
    if (cm === undefined) continue;
    // Índice del bit menos significativo (exacto para enteros de 32 bits).
    const lowest = 31 - Math.clz32(cm & -cm);
    if (lowest >= 0 && lowest < n) {
      meldsByLowestBit[lowest]?.push(mi);
    }
  }

  // Memoización con arrays tipados planos (sin boxing).
  const NSTATES = 1 << n;
  const memoDead = new Int32Array(NSTATES).fill(-1);
  const memoUsed = new Int32Array(NSTATES);
  const memoMeldCount = new Int32Array(NSTATES);
  const choice = new Int32Array(NSTATES);

  function best(mask: number): void {
    if (memoDead[mask] !== -1) return;

    // El bit menos significativo puesto es la "carta clave". Dos opciones:
    //   (a) queda suelta: sumar sus puntos + best(mask sin ese bit);
    //   (b) forma parte de alguna combinación que lo incluye: best(mask \ meld).
    // La base "todo suelto" queda cubierta por aplicar (a) recursivamente.
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
      const lowCard = cards[lowestBit];

      // (a) Queda suelta.
      if (lowestBit >= 0 && lowestBit < n && lowCard) {
        const rest = mask & ~low;
        best(rest);
        const aDead = (memoDead[rest] ?? 0) + lowCard.points;
        const aUsed = memoUsed[rest] ?? 0;
        const aMeld = memoMeldCount[rest] ?? 0;
        bDead = aDead;
        bUsed = aUsed;
        bMeldCount = aMeld;
        // choice 0 = la carta baja queda suelta.
      }

      // (b) Forma parte de una combinación que la incluye.
      const candidates = (lowestBit >= 0 && lowestBit < n ? meldsByLowestBit[lowestBit] : null) ?? [];
      for (const mi of candidates) {
        const cm = meldMasks[mi];
        if (cm === undefined) continue;
        if ((cm & mask) === cm) {
          const rest = mask & ~cm;
          best(rest);
          const cDead = memoDead[rest] ?? 0;
          const cUsed = memoUsed[rest] ?? 0;
          const cMeld = memoMeldCount[rest] ?? 0;
          const candDead = cDead;
          const candUsed = (meldPop[mi] ?? 0) + cUsed;
          const candMeld = 1 + cMeld;
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
      const c = lowBit >= 0 && lowBit < n ? cards[lowBit] : undefined;
      if (c) leftovers.push(c.id);
      mask &= ~low;
      continue;
    }
    const idsInMeld: CardId[] = [];
    for (let i = 0; i < n; i++) {
      if (cm & (1 << i)) {
        const c = cards[i];
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
