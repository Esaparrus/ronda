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
  RANKS,
  SUITS,
  parseCardId,
  rankPosition,
  type CardId,
  type ChinchonConfig,
} from '@ronda/protocol';
import { mulberry32, hashSeed } from '../../core/rng.ts';

const CFG: ChinchonConfig = DEFAULT_CONFIG;

/** Las 40 CardId de la baraja, para muestreo. */
const ALL_CARD_IDS: CardId[] = (() => {
  const ids: CardId[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) ids.push(`${suit}-${rank}`);
  }
  return ids;
})();

/** Devuelve los puntos de una carta. */
function pts(id: CardId): number {
  const r = parseCardId(id);
  if (!r.ok) throw new Error(`bad id: ${id}`);
  return r.value.points;
}

/**
 * ¿Es una combinación válida? Grupo (3-4 del mismo rango) o escalera (3+
 * POSICIONES seguidas del mismo palo). La escalera se mide en posiciones, no
 * en rangos: 6-7-sota es escalera (§5.4, P31).
 */
function isValidMeld(ids: CardId[]): boolean {
  if (ids.length < 3 || ids.length > 10) return false;
  const cards = ids.map((id) => {
    const r = parseCardId(id);
    if (!r.ok) throw new Error(`bad id: ${id}`);
    return r.value;
  });

  // Grupo: 3-4 cartas del mismo rango (los palos son distintos por construcción).
  const ranks = new Set(cards.map((c) => c.rank));
  if (ranks.size === 1) return ids.length <= 4;

  // Escalera: mismo palo, posiciones seguidas.
  const suits = new Set(cards.map((c) => c.suit));
  if (suits.size !== 1) return false;
  const ps = cards.map((c) => rankPosition(c.rank)).sort((a, b) => a - b);
  for (let i = 1; i < ps.length; i++) {
    const cur = ps[i];
    const prev = ps[i - 1];
    if (cur === undefined || prev === undefined || cur !== prev + 1) return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// Casos dorados del contrato §5.10
// ---------------------------------------------------------------------------

describe('Casos dorados §5.10', () => {
  it('#1: escalera de 7 oros → 1 meld, deadwood 0, es chinchón', () => {
    const hand: CardId[] = ['oros-1', 'oros-2', 'oros-3', 'oros-4', 'oros-5', 'oros-6', 'oros-7'];
    const sol = solveHand(hand);
    expect(sol.deadwood).toBe(0);
    expect(sol.melds.length).toBe(1);
    expect(sol.melds[0]?.length).toBe(7);
    expect(sol.leftovers.length).toBe(0);
    expect(isChinchon(hand)).toBe(true);
  });

  it('#3: escalera(3) + grupo(3), deadwood 10', () => {
    const hand: CardId[] = [
      'oros-1',
      'oros-2',
      'oros-3',
      'copas-7',
      'espadas-7',
      'bastos-7',
      'copas-12',
    ];
    const sol = solveHand(hand);
    expect(sol.deadwood).toBe(10);
    expect(sol.leftovers).toEqual(['copas-12']);
  });

  // P31: el caso #4 del contrato usaba un comodín para tapar un hueco. Ya no
  // hay comodines, y lo que hay que fijar en su sitio es el hueco de la
  // propia baraja: del 7 se pasa a la sota y la escalera sigue.
  it('#4: escalera oros 5-6-7-sota (cruza el hueco) + escalera copas 3-5, deadwood 0', () => {
    const hand: CardId[] = [
      'oros-5',
      'oros-6',
      'oros-7',
      'oros-10',
      'copas-3',
      'copas-4',
      'copas-5',
    ];
    const sol = solveHand(hand);
    expect(sol.deadwood).toBe(0);
    expect(sol.melds.length).toBe(2);
    expect(sol.leftovers.length).toBe(0);
    expect(sol.melds.find((m) => m.length === 4)).toEqual([
      'oros-10',
      'oros-5',
      'oros-6',
      'oros-7',
    ]);
  });

  it('#5: sin combinaciones, deadwood = 1+3+5+7+10+10+10 = 46', () => {
    const hand: CardId[] = [
      'oros-1',
      'copas-3',
      'espadas-5',
      'bastos-7',
      'oros-11',
      'copas-12',
      'espadas-10',
    ];
    const sol = solveHand(hand);
    expect(sol.deadwood).toBe(46);
    expect(sol.melds.length).toBe(0);
    expect(sol.leftovers.length).toBe(7);
  });

  // P31: el #6 comprobaba que dos comodines no cabían en la misma combinación.
  // En su lugar fija el borde de arriba de la escalera: sota-caballo-rey.
  it('#6: escalera espadas sota-caballo-rey, deadwood 1+2+4+5 = 12', () => {
    const hand: CardId[] = [
      'espadas-10',
      'espadas-11',
      'espadas-12',
      'oros-1',
      'oros-2',
      'copas-4',
      'copas-5',
    ];
    const sol = solveHand(hand);
    expect(sol.melds.length).toBe(1);
    expect(sol.melds[0]).toEqual(['espadas-10', 'espadas-11', 'espadas-12']);
    expect(sol.deadwood).toBe(12);
  });

  it('#7: grupo de cuatro 1 + resto suelto, deadwood 10+10+2 = 22', () => {
    const hand: CardId[] = [
      'oros-11',
      'oros-12',
      'copas-1',
      'oros-1',
      'espadas-1',
      'bastos-1',
      'copas-2',
    ];
    const sol = solveHand(hand);
    expect(sol.deadwood).toBe(22);
    expect(sol.leftovers.length).toBe(3);
  });

  it('#2 (inválido): construir una mano con duplicados lanza error de invariante', () => {
    // La fila 2 del contrato está marcada como inválida a propósito.
    expect(() =>
      solveHand(['oros-1', 'oros-1', 'copas-5', 'copas-5', 'espadas-7', 'bastos-10', 'copas-12']),
    ).toThrow();
  });

  it('rechaza una mano con una carta que no está en la baraja de 40', () => {
    expect(() =>
      solveHand(['oros-8', 'oros-2', 'oros-3', 'copas-7', 'espadas-7', 'bastos-7', 'copas-12']),
    ).toThrow();
    expect(() =>
      solveHand(['joker-1', 'oros-2', 'oros-3', 'copas-7', 'espadas-7', 'bastos-7', 'copas-12']),
    ).toThrow();
  });
});

// ---------------------------------------------------------------------------
// Chinchón (§5.7)
// ---------------------------------------------------------------------------

describe('isChinchon', () => {
  it('true para escalera de 7 dentro de los números', () => {
    expect(
      isChinchon(['oros-1', 'oros-2', 'oros-3', 'oros-4', 'oros-5', 'oros-6', 'oros-7']),
    ).toBe(true);
  });
  it('true para la escalera de 7 que cruza el hueco 7-sota', () => {
    expect(
      isChinchon(['copas-4', 'copas-5', 'copas-6', 'copas-7', 'copas-10', 'copas-11', 'copas-12']),
    ).toBe(true);
  });
  it('hay exactamente 16 chinchones posibles (4 por palo)', () => {
    let n = 0;
    for (const suit of SUITS) {
      for (let start = 0; start + 7 <= RANKS.length; start++) {
        const hand = RANKS.slice(start, start + 7).map((r): CardId => `${suit}-${r}`);
        if (isChinchon(hand)) n++;
      }
    }
    expect(n).toBe(16);
  });
  it('false si no son del mismo palo', () => {
    expect(
      isChinchon(['oros-1', 'oros-2', 'oros-3', 'copas-4', 'oros-5', 'oros-6', 'oros-7']),
    ).toBe(false);
  });
  it('false si no son seguidas', () => {
    expect(
      isChinchon(['oros-1', 'oros-2', 'oros-3', 'oros-4', 'oros-5', 'oros-6', 'oros-11']),
    ).toBe(false);
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
    const hand: CardId[] = [
      'oros-1',
      'oros-2',
      'oros-3',
      'copas-7',
      'espadas-7',
      'bastos-7',
      'copas-12',
      'copas-11',
    ];
    expect(canCloseWith(hand, 'copas-12', CFG)).toBe(false); // 10 > 5
  });

  it('cierra si al descartar queda deadwood <= umbral', () => {
    // Mano de 8 formada por escalera de 7 + 1 suelta.
    const hand: CardId[] = [
      'oros-1',
      'oros-2',
      'oros-3',
      'oros-4',
      'oros-5',
      'oros-6',
      'oros-7',
      'copas-11',
    ];
    expect(canCloseWith(hand, 'copas-11', CFG)).toBe(true); // queda escalera 0 puntos
  });

  it('devuelve false si la carta no está en la mano', () => {
    const hand: CardId[] = [
      'oros-1',
      'oros-2',
      'oros-3',
      'oros-4',
      'oros-5',
      'oros-6',
      'oros-7',
      'copas-11',
    ];
    expect(canCloseWith(hand, 'bastos-5', CFG)).toBe(false);
  });

  it('closableDiscards devuelve las cartas que permiten cerrar', () => {
    const hand: CardId[] = [
      'oros-1',
      'oros-2',
      'oros-3',
      'oros-4',
      'oros-5',
      'oros-6',
      'oros-7',
      'copas-11',
    ];
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
    // Muestra `size` cartas sin repetición de la baraja de 40.
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
      const sol = solveHand(hand);

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
    for (let i = 0; i < 500; i++) solveHand(hands[i % hands.length] ?? []);
    const t0 = Date.now();
    for (const h of hands) solveHand(h);
    const dt = Date.now() - t0;
    expect(dt).toBeLessThan(2000);
  });
});

// ---------------------------------------------------------------------------
// enumerateMelds: smoke
// ---------------------------------------------------------------------------

describe('enumerateMelds', () => {
  it('no lanza para una mano típica y devuelve máscaras > 0 cuando hay juego', () => {
    const hand: CardId[] = [
      'oros-7',
      'copas-7',
      'espadas-7',
      'bastos-7',
      'oros-1',
      'oros-2',
      'oros-3',
    ];
    const masks = enumerateMelds(hand);
    expect(masks.length).toBeGreaterThan(0);
  });

  it('devuelve vacío si no hay combinación posible', () => {
    const hand: CardId[] = [
      'oros-1',
      'copas-3',
      'espadas-5',
      'bastos-7',
      'oros-11',
      'copas-12',
      'espadas-10',
    ];
    expect(enumerateMelds(hand).length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Solución: type sanity (compila)
// ---------------------------------------------------------------------------

describe('MeldSolution shape', () => {
  it('solveHand devuelve un MeldSolution bien formado', () => {
    const sol: MeldSolution = solveHand([
      'oros-1',
      'oros-2',
      'oros-3',
      'copas-5',
      'espadas-5',
      'bastos-5',
      'copas-12',
    ]);
    expect(Array.isArray(sol.melds)).toBe(true);
    expect(Array.isArray(sol.leftovers)).toBe(true);
    expect(typeof sol.deadwood).toBe('number');
  });
});
