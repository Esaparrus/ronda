import { describe, it, expect } from 'vitest';
import { buildDeck, CARDS_BY_ID, DECK_SIZE, cardPoints } from './deck.ts';
import { RANKS, parseCardId, type CardId } from '@ronda/protocol';

/** Lookup seguro de CARDS_BY_ID: lanza en el test si el id no existe. */
function card(id: CardId) {
  const c = CARDS_BY_ID[id];
  if (!c) throw new Error(`test: id no encontrado en CARDS_BY_ID: ${id}`);
  return c;
}

describe('buildDeck', () => {
  it('devuelve 40 cartas, la baraja española corta', () => {
    expect(buildDeck().length).toBe(DECK_SIZE);
    expect(DECK_SIZE).toBe(40);
  });

  it('todas las cartas tienen id único', () => {
    const deck = buildDeck();
    const ids = new Set(deck.map((c) => c.id));
    expect(ids.size).toBe(deck.length);
  });

  it('contiene las 40 cartas esperadas (4 palos × 10 rangos)', () => {
    const ids = new Set(buildDeck().map((c) => c.id));
    for (const suit of ['oros', 'copas', 'espadas', 'bastos'] as const) {
      for (const rank of RANKS) {
        expect(ids.has(`${suit}-${rank}`)).toBe(true);
      }
    }
  });

  // P31: lo que ya no está es tan importante como lo que está.
  it('no incluye ochos, nueves ni comodines', () => {
    const ids = new Set(buildDeck().map((c) => c.id));
    for (const suit of ['oros', 'copas', 'espadas', 'bastos'] as const) {
      expect(ids.has(`${suit}-8`)).toBe(false);
      expect(ids.has(`${suit}-9`)).toBe(false);
    }
    expect(ids.has('joker-1')).toBe(false);
    expect(ids.has('joker-2')).toBe(false);
  });
});

describe('cardPoints (en engine, vía deck.ts)', () => {
  it('copas-10 → 10', () => {
    expect(cardPoints(card('copas-10'))).toBe(10);
  });
  it('bastos-12 → 10', () => {
    expect(cardPoints(card('bastos-12'))).toBe(10);
  });
  it('rangos 1..7 valen su valor; 10,11,12 valen 10', () => {
    for (let r = 1; r <= 7; r++) {
      expect(cardPoints(card(`oros-${r}` as CardId))).toBe(r);
    }
    for (const r of [10, 11, 12]) {
      expect(cardPoints(card(`oros-${r}` as CardId))).toBe(10);
    }
  });
});

describe('CARDS_BY_ID', () => {
  it('es coherente con parseCardId (mismos id, suit, rank)', () => {
    for (const c of buildDeck()) {
      const parsed = parseCardId(c.id);
      expect(parsed.ok).toBe(true);
      if (!parsed.ok) continue;
      expect(c.suit).toBe(parsed.value.suit);
      expect(c.rank).toBe(parsed.value.rank);
      expect(c.points).toBe(parsed.value.points);
    }
  });

  it('está congelada (read-only)', () => {
    expect(Object.isFrozen(CARDS_BY_ID)).toBe(true);
  });
});
