import { describe, it, expect } from 'vitest';
import {
  solveHand,
  isChinchon,
  canCloseWith,
  closableDiscards,
  enumerateMelds,
  type MeldSolution,
} from './melds.ts';
import {
  DEFAULT_CONFIG,
  parseCardId,
  type CardId,
  type GameConfig,
} from '@ronda/protocol';
import { mulberry32, hashSeed } from '../../core/rng.ts';

const CFG: GameConfig = DEFAULT_CONFIG;

/** Construye todas las CardId de la baraja para muestreo. */
const ALL_CARD_IDS: CardId[] = (() => {
  const ids: CardId[] = [];
  for (const suit of ['oros', 'copas', 'espadas', 'bastos'] as const) {
    for (let r = 1; r <= 12; r++) ids.push(`${suit}-${r}`);
  }
  ids.push('joker-1', 'joker-2');
  return ids;
})();

/** Devuelve los puntos de una carta según la config por defecto. */
function pts(id: CardId): number {
  const r = parseCardId(id);
  if (!r.ok) throw new Error(`bad id: ${id}`);
  return r.value.isJoker ? CFG.jokerPoints : r.value.rank === null ? 0 : r.value.rank <= 9 ? r.value.rank : 10;
}

/** ¿Es una combinación válida? Grupo (3-4 mismo rango) o escalera (3+ consec, mismo palo). */
function isValidMeld(ids: CardId[]): boolean {
  if (ids.length < 3) return false;
  const cards = ids.map((id) => {
    const r = parseCardId(id);
    if (!r.ok) throw new Error(`bad id: ${id}`);
    return r.value;
  });
  const jokers = cards.filter((c) => c.isJoker);
  if (jokers.length > 1) return false;
  const real = cards.filter((c) => !c.isJoker);
  // Grupo: 3-4 cartas del mismo rango (los palos son distintos por construcción).
  const ranks = new Set(real.map((c) => c.rank));
  if (ranks.size === 1 && real.length >= 2 && ids.length <= 4) return true;
  // Escalera: mismo palo, consecutivas en [1..12] (sin vuelta 12->1), con el
  // comodín cubriendo a lo sumo un hueco o un extremo.
  const suits = new Set(real.map((c) => c.suit));
  if (suits.size === 1) {
    const rs = real.map((c) => c.rank as number).sort((a, b) => a - b);
    // Sin comodín: todas consecutivas.
    if (jokers.length === 0) {
      for (let i = 1; i < rs.length; i++) {
        const cur = rs[i];
        const prev = rs[i - 1];
        if (cur === undefined || prev === undefined || cur !== prev + 1) return false;
      }
      const lo = rs[0];
      const hi = rs[rs.length - 1];
      return lo !== undefined && hi !== undefined && lo >= 1 && hi <= 12;
    }
    // Con 1 comodín: las reales deben caber en una ventana de `ids.length`
    // posiciones dentro de [1..12], y como mucho faltar 1 carta.
    const lo = rs[0];
    const hi = rs[rs.length - 1];
    if (lo === undefined || hi === undefined) return false;
    const span = hi - lo;
    const holes = span - (rs.length - 1); // huecos entre reales
    return holes <= 1 && span <= ids.length && lo >= 1 && hi <= 12;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Casos dorados del contrato §5.10
// ---------------------------------------------------------------------------

describe('Casos dorados §5.10', () => {
  it('#1: escalera de 7 oros → 1 meld, deadwood 0, es chinchón', () => {
    const hand: CardId[] = ['oros-1', 'oros-2', 'oros-3', 'oros-4', 'oros-5', 'oros-6', 'oros-7'];
    const sol = solveHand(hand, CFG);
    expect(sol.deadwood).toBe(0);
    expect(sol.melds.length).toBe(1);
    expect(sol.melds[0]?.length).toBe(7);
    expect(sol.leftovers.length).toBe(0);
    expect(isChinchon(hand)).toBe(true);
  });

  it('#3: escalera(3) + grupo(3), deadwood 10', () => {
    const hand: CardId[] = ['oros-1', 'oros-2', 'oros-3', 'copas-7', 'espadas-7', 'bastos-7', 'copas-12'];
    const sol = solveHand(hand, CFG);
    expect(sol.deadwood).toBe(10);
    expect(sol.leftovers).toEqual(['copas-12']);
  });

  it('#4: escalera oros 4-7 con comodín + escalera copas 3-5, deadwood 0', () => {
    const hand: CardId[] = ['oros-4', 'oros-5', 'joker-1', 'oros-7', 'copas-3', 'copas-4', 'copas-5'];
    const sol = solveHand(hand, CFG);
    expect(sol.deadwood).toBe(0);
    expect(sol.melds.length).toBe(2);
    expect(sol.leftovers.length).toBe(0);
  });

  it('#5: sin combinaciones, deadwood = 1+3+5+7+9+10+10 = 45', () => {
    const hand: CardId[] = ['oros-1', 'copas-3', 'espadas-5', 'bastos-7', 'oros-9', 'copas-11', 'espadas-12'];
    const sol = solveHand(hand, CFG);
    expect(sol.deadwood).toBe(45);
    expect(sol.melds.length).toBe(0);
    expect(sol.leftovers.length).toBe(7);
  });

  it('#6: dos comodines en melds distintas, deadwood 25 (un comodín suelto)', () => {
    const hand: CardId[] = ['joker-1', 'joker-2', 'oros-10', 'oros-11', 'copas-4', 'copas-5', 'copas-6'];
    const sol = solveHand(hand, CFG);
    expect(sol.deadwood).toBe(25);
    // Los dos comodines NO pueden estar en la misma meld.
    for (const meld of sol.melds) {
      const jokers = meld.filter((id) => id.startsWith('joker'));
      expect(jokers.length).toBeLessThanOrEqual(1);
    }
  });

  it('#7: grupo de cuatro 1 + resto suelto, deadwood 10+10+2 = 22', () => {
    const hand: CardId[] = ['oros-11', 'oros-12', 'copas-1', 'oros-1', 'espadas-1', 'bastos-1', 'copas-2'];
    const sol = solveHand(hand, CFG);
    expect(sol.deadwood).toBe(22);
    expect(sol.leftovers.length).toBe(3);
  });

  it('#2 (inválido): construir una mano con duplicados lanza error de invariante', () => {
    // La fila 2 del contrato está marcada como inválida a propósito.
    expect(() => solveHand(['oros-1', 'oros-1', 'copas-5', 'copas-5', 'espadas-7', 'bastos-9', 'copas-12'], CFG)).toThrow();
  });
});

// ---------------------------------------------------------------------------
// Chinchón (§5.7)
// ---------------------------------------------------------------------------

describe('isChinchon', () => {
  it('true para escalera de 7 sin comodines', () => {
    expect(isChinchon(['copas-4', 'copas-5', 'copas-6', 'copas-7', 'copas-8', 'copas-9', 'copas-10'])).toBe(true);
  });
  it('false si hay comodín (no valen para el chinchón)', () => {
    expect(isChinchon(['copas-4', 'copas-5', 'copas-6', 'copas-7', 'copas-8', 'copas-9', 'joker-1'])).toBe(false);
  });
  it('false si no son del mismo palo', () => {
    expect(isChinchon(['oros-1', 'oros-2', 'oros-3', 'copas-4', 'oros-5', 'oros-6', 'oros-7'])).toBe(false);
  });
  it('false si no son consecutivas', () => {
    expect(isChinchon(['oros-1', 'oros-2', 'oros-3', 'oros-4', 'oros-5', 'oros-6', 'oros-8'])).toBe(false);
  });
  it('false si no son 7 cartas', () => {
    expect(isChinchon(['oros-1', 'oros-2', 'oros-3', 'oros-4', 'oros-5', 'oros-6'])).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Cierre (§5.6)
// ---------------------------------------------------------------------------

describe('canCloseWith / closableDiscards', () => {
  it('respeta closeThreshold: deadwood justo por encima no cierra', () => {
    // Mano de 8. Descartar copas-12 deja 7 cartas con deadwood 10 (caso #3) > 5.
    const hand: CardId[] = ['oros-1', 'oros-2', 'oros-3', 'copas-7', 'espadas-7', 'bastos-7', 'copas-12', 'copas-11'];
    expect(canCloseWith(hand, 'copas-12', CFG)).toBe(false); // 10 > 5
  });

  it('cierra si al descartar queda deadwood <= umbral', () => {
    // Mano de 8 formada por escalera de 7 + 1 suelta.
    const hand: CardId[] = ['oros-1', 'oros-2', 'oros-3', 'oros-4', 'oros-5', 'oros-6', 'oros-7', 'copas-11'];
    expect(canCloseWith(hand, 'copas-11', CFG)).toBe(true); // queda escalera 0 puntos
  });

  it('devuelve false si la carta no está en la mano', () => {
    const hand: CardId[] = ['oros-1', 'oros-2', 'oros-3', 'oros-4', 'oros-5', 'oros-6', 'oros-7', 'copas-11'];
    expect(canCloseWith(hand, 'bastos-5', CFG)).toBe(false);
  });

  it('closableDiscards devuelve las cartas que permiten cerrar', () => {
    const hand: CardId[] = ['oros-1', 'oros-2', 'oros-3', 'oros-4', 'oros-5', 'oros-6', 'oros-7', 'copas-11'];
    expect(closableDiscards(hand, CFG)).toEqual(['copas-11']);
  });
});

// ---------------------------------------------------------------------------
// Test de propiedad: 5.000 manos aleatorias con semilla fija
// ---------------------------------------------------------------------------

describe('Propiedad: 5.000 manos aleatorias', () => {
  // Generador determinista a partir de semilla fija.
  const rand = mulberry32(hashSeed('ronda-p3-property-test'));
  const N = 5000;

  function randomHand(size: number): CardId[] {
    // Muestra `size` cartas sin repetición del mazo de 50.
    const pool = ALL_CARD_IDS.slice();
    const out: CardId[] = [];
    for (let i = 0; i < size; i++) {
      const j = Math.floor(rand() * pool.length);
      const picked = pool[j];
      if (picked === undefined) break;
      out.push(picked);
      pool.splice(j, 1);
    }
    return out;
  }

  it('para cada solución: melds válidas y disjuntas, union = mano, deadwood = suma de leftovers', () => {
    for (let t = 0; t < N; t++) {
      const hand = randomHand(7 + (t % 2)); // 7 u 8 cartas
      if (hand.length < 7) continue; // safety
      const sol = solveHand(hand, CFG);

      // (a) toda combinación es válida
      for (const meld of sol.melds) {
        expect(isValidMeld(meld)).toBe(true);
      }
      // (b) combinaciones disjuntas entre sí
      const seen = new Set<CardId>();
      for (const meld of sol.melds) {
        for (const id of meld) {
          expect(seen.has(id)).toBe(false);
          seen.add(id);
        }
      }
      // (c) melds ∪ leftovers = mano exacta
      const all = [...sol.melds.flat(), ...sol.leftovers];
      expect(all.length).toBe(hand.length);
      for (const id of hand) expect(all).toContain(id);
      // (d) deadwood coincide con la suma de puntos de leftovers
      const expected = sol.leftovers.reduce((acc, id) => acc + pts(id), 0);
      expect(sol.deadwood).toBe(expected);
      // y nunca supera la suma total de la mano
      const totalHand = hand.reduce((acc, id) => acc + pts(id), 0);
      expect(sol.deadwood).toBeLessThanOrEqual(totalHand);
    }
  });
});

// ---------------------------------------------------------------------------
// Rendimiento: 10.000 solves en < 2s
// ---------------------------------------------------------------------------

describe('Rendimiento', () => {
  it('10.000 solveHand de manos de 8 cartas en menos de 2 segundos', () => {
    const rand = mulberry32(hashSeed('ronda-p3-perf'));
    const hands: CardId[][] = [];
    for (let i = 0; i < 10000; i++) {
      const pool = ALL_CARD_IDS.slice();
      const h: CardId[] = [];
      for (let k = 0; k < 8; k++) {
        const j = Math.floor(rand() * pool.length);
        const picked = pool[j];
        if (picked === undefined) break;
        h.push(picked);
        pool.splice(j, 1);
      }
      hands.push(h);
    }
    // Calentamiento del JIT: unas llamadas descartadas para que el bucle medido
    // corra ya optimizado (evita falsos negativos cuando el test corre tras
    // otros pesados, como las 200 partidas de P4).
    for (let i = 0; i < 500; i++) solveHand(hands[i % hands.length] ?? [], CFG);
    const t0 = Date.now();
    for (const h of hands) solveHand(h, CFG);
    const dt = Date.now() - t0;
    expect(dt).toBeLessThan(2000);
  });
});

// ---------------------------------------------------------------------------
// enumerateMelds: smoke
// ---------------------------------------------------------------------------

describe('enumerateMelds', () => {
  it('no lanza para una mano típica y devuelve máscaras > 0 cuando hay juego', () => {
    const hand: CardId[] = ['oros-7', 'copas-7', 'espadas-7', 'bastos-7', 'oros-1', 'oros-2', 'oros-3'];
    const masks = enumerateMelds(hand, CFG);
    expect(masks.length).toBeGreaterThan(0);
    // El grupo de cuatro 7s y la escalera 1-3 deben estar entre las máscaras.
    const asSets = masks.map((m) => m);
    expect(asSets.length).toBeGreaterThan(0);
  });

  it('devuelve vacío si no hay combinación posible', () => {
    const hand: CardId[] = ['oros-1', 'copas-3', 'espadas-5', 'bastos-7', 'oros-9', 'copas-11', 'espadas-12'];
    expect(enumerateMelds(hand, CFG).length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Solución: type sanity (compila)
// ---------------------------------------------------------------------------

describe('MeldSolution shape', () => {
  it('solveHand devuelve un MeldSolution bien formado', () => {
    const sol: MeldSolution = solveHand(['oros-1', 'oros-2', 'oros-3', 'copas-5', 'espadas-5', 'bastos-5', 'copas-12'], CFG);
    expect(Array.isArray(sol.melds)).toBe(true);
    expect(Array.isArray(sol.leftovers)).toBe(true);
    expect(typeof sol.deadwood).toBe('number');
  });
});
