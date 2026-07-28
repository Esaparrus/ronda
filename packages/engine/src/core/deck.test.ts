import { describe, it, expect } from 'vitest';
import { buildDeck, CARDS_BY_ID, cardPoints } from './deck.ts';
import { DEFAULT_CONFIG, parseCardId, type CardId } from '@ronda/protocol';
import type { GameConfig } from '@ronda/protocol';

/** Lookup seguro de CARDS_BY_ID: lanza en el test si el id no existe. */
function card(id: CardId) {
  const c = CARDS_BY_ID[id];
  if (!c) throw new Error(`test: id no encontrado en CARDS_BY_ID: ${id}`);
  return c;
}

describe('buildDeck', () => {
  it('con jokers:2 devuelve 50 cartas (48 + 2 comodines)', () => {
    const deck = buildDeck({ ...DEFAULT_CONFIG, jokers: 2 });
    expect(deck.length).toBe(50);
  });

  it('con jokers:0 devuelve 48 cartas', () => {
    const deck = buildDeck({ ...DEFAULT_CONFIG, jokers: 0 });
    expect(deck.length).toBe(48);
  });

  it('todas las cartas tienen id único', () => {
    const deck = buildDeck({ ...DEFAULT_CONFIG, jokers: 2 });
    const ids = new Set(deck.map((c) => c.id));
    expect(ids.size).toBe(deck.length);
  });

  it('contiene las 48 cartas esperadas (4 palos × 12 rangos)', () => {
    const deck = buildDeck({ ...DEFAULT_CONFIG, jokers: 0 });
    const ids = new Set(deck.map((c) => c.id));
    for (const suit of ['oros', 'copas', 'espadas', 'bastos'] as const) {
      for (let rank = 1; rank <= 12; rank++) {
        expect(ids.has(`${suit}-${rank}`)).toBe(true);
      }
    }
  });

  it('incluye joker-1 y joker-2 cuando config.jokers === 2', () => {
    const ids = new Set(buildDeck({ ...DEFAULT_CONFIG, jokers: 2 }).map((c) => c.id));
    expect(ids.has('joker-1')).toBe(true);
    expect(ids.has('joker-2')).toBe(true);
  });

  it('no incluye comodines cuando config.jokers === 0', () => {
    const ids = new Set(buildDeck({ ...DEFAULT_CONFIG, jokers: 0 }).map((c) => c.id));
    expect(ids.has('joker-1')).toBe(false);
    expect(ids.has('joker-2')).toBe(false);
  });
});

describe('cardPoints (en engine, vía deck.ts)', () => {
  // Reusa la tabla de referencia para instanciar cartas sin parsear a mano.
  const cfg: GameConfig = DEFAULT_CONFIG;

  it('oros-9 → 9', () => {
    expect(cardPoints(card('oros-9'), cfg)).toBe(9);
  });
  it('copas-10 → 10', () => {
    expect(cardPoints(card('copas-10'), cfg)).toBe(10);
  });
  it('bastos-12 → 10', () => {
    expect(cardPoints(card('bastos-12'), cfg)).toBe(10);
  });
  it('joker-1 → 25 (default) y respeta config.jokerPoints', () => {
    expect(cardPoints(card('joker-1'), cfg)).toBe(25);
    const cfg20: GameConfig = { ...DEFAULT_CONFIG, jokerPoints: 20 };
    expect(cardPoints(card('joker-1'), cfg20)).toBe(20);
  });
  it('rangos 1..9 valen su valor; 10,11,12 valen 10', () => {
    for (let r = 1; r <= 9; r++) {
      expect(cardPoints(card(`oros-${r}` as CardId), cfg)).toBe(r);
    }
    for (const r of [10, 11, 12]) {
      expect(cardPoints(card(`oros-${r}` as CardId), cfg)).toBe(10);
    }
  });
});

describe('CARDS_BY_ID', () => {
  it('es coherente con parseCardId (mismos id, suit, rank, isJoker)', () => {
    const deck = buildDeck(DEFAULT_CONFIG);
    for (const c of deck) {
      const parsed = parseCardId(c.id);
      expect(parsed.ok).toBe(true);
      if (!parsed.ok) continue;
      expect(c.suit).toBe(parsed.value.suit);
      expect(c.rank).toBe(parsed.value.rank);
      expect(c.isJoker).toBe(parsed.value.isJoker);
    }
  });

  it('está congelada (read-only)', () => {
    expect(Object.isFrozen(CARDS_BY_ID)).toBe(true);
  });
});
