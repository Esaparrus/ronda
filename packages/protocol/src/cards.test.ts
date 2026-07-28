import { describe, it, expect } from 'vitest';
import { parseCardId, makeCardId, cardPoints, type Card } from './cards.ts';
import { DEFAULT_CONFIG } from './config.ts';

/** Helper: parsear o lanzar, para no repetir el guard en cada aserción. */
function card(id: string): Card {
  const r = parseCardId(id);
  if (!r.ok) throw new Error(`test: carta inválida inesperada: ${id}`);
  return r.value;
}

describe('parseCardId', () => {
  it('parsea una carta normal de palo y rango', () => {
    expect(card('oros-7')).toEqual<Card>({
      id: 'oros-7',
      suit: 'oros',
      rank: 7,
      isJoker: false,
      points: 7,
    });
  });

  it('parsea una figura (rank 10..12 → points 10)', () => {
    const c = card('copas-12');
    expect(c.suit).toBe('copas');
    expect(c.rank).toBe(12);
    expect(c.points).toBe(10);
    expect(c.isJoker).toBe(false);
  });

  it('parsea comodines joker-1 y joker-2', () => {
    for (const id of ['joker-1', 'joker-2'] as const) {
      const c = card(id);
      expect(c.isJoker).toBe(true);
      expect(c.suit).toBeNull();
      expect(c.rank).toBeNull();
    }
  });

  it('devuelve error para rank fuera de rango (oros-13)', () => {
    const r = parseCardId('oros-13');
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe('bad_rank');
  });

  it('devuelve error para rank 0', () => {
    expect(parseCardId('oros-0').ok).toBe(false);
  });

  it('devuelve error para palo inválido', () => {
    const r = parseCardId('picas-1');
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe('bad_suit');
  });

  it('devuelve error para comodín inválido (joker-3)', () => {
    const r = parseCardId('joker-3');
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe('bad_joker');
  });

  it('devuelve error para formato sin guion o vacío', () => {
    expect(parseCardId('oros7').ok).toBe(false);
    expect(parseCardId('').ok).toBe(false);
  });
});

describe('makeCardId', () => {
  it('construye el id de una carta normal', () => {
    expect(makeCardId({ suit: 'espadas', rank: 5 })).toBe('espadas-5');
  });
  it('construye el id de un comodín', () => {
    expect(makeCardId({ joker: 2 })).toBe('joker-2');
  });
});

describe('cardPoints', () => {
  const config = DEFAULT_CONFIG; // jokerPoints = 25

  it('rangos 1..9 valen su valor', () => {
    expect(cardPoints(card('oros-1'), config)).toBe(1);
    expect(cardPoints(card('copas-9'), config)).toBe(9);
  });

  it('rangos 10,11,12 valen 10', () => {
    expect(cardPoints(card('oros-10'), config)).toBe(10);
    expect(cardPoints(card('oros-11'), config)).toBe(10);
    expect(cardPoints(card('oros-12'), config)).toBe(10);
  });

  it('comodín vale config.jokerPoints', () => {
    expect(cardPoints(card('joker-1'), config)).toBe(25);
    expect(cardPoints(card('joker-1'), { ...config, jokerPoints: 20 })).toBe(20);
  });
});
