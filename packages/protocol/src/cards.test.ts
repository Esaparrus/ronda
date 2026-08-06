import { describe, it, expect } from 'vitest';
import { parseCardId, makeCardId, cardPoints, rankPosition, RANKS, type Card } from './cards.ts';

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
      points: 7,
    });
  });

  it('parsea una figura (rank 10..12 → points 10)', () => {
    const c = card('copas-12');
    expect(c.suit).toBe('copas');
    expect(c.rank).toBe(12);
    expect(c.points).toBe(10);
  });

  // P31: la baraja es de 40. Ochos, nueves y comodines dejan de existir, y
  // parsearlos tiene que fallar -- no basta con no repartirlos.
  it('devuelve error para los ochos y los nueves', () => {
    for (const id of ['oros-8', 'copas-9', 'espadas-8', 'bastos-9']) {
      const r = parseCardId(id);
      expect(r.ok).toBe(false);
      if (r.ok) return;
      expect(r.error.kind).toBe('bad_rank');
    }
  });

  it('devuelve error para los comodines', () => {
    for (const id of ['joker-1', 'joker-2', 'joker-3']) {
      expect(parseCardId(id).ok).toBe(false);
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

  it('devuelve error para formato sin guion o vacío', () => {
    expect(parseCardId('oros7').ok).toBe(false);
    expect(parseCardId('').ok).toBe(false);
  });

  it('acepta los 40 naipes de la baraja, y solo esos', () => {
    let ok = 0;
    for (const suit of ['oros', 'copas', 'espadas', 'bastos']) {
      for (let rank = 1; rank <= 12; rank++) {
        if (parseCardId(`${suit}-${rank}`).ok) ok++;
      }
    }
    expect(ok).toBe(40);
  });
});

describe('makeCardId', () => {
  it('construye el id de una carta normal', () => {
    expect(makeCardId({ suit: 'espadas', rank: 5 })).toBe('espadas-5');
  });
});

describe('rankPosition', () => {
  // La decisión de P31: la baraja de 40 tiene un hueco entre el 7 y la sota, y
  // las escaleras lo cruzan. Este es el único sitio que lo sabe.
  it('numera los diez rangos del 1 al 10, sin huecos', () => {
    expect(RANKS.map(rankPosition)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it('el 7 y la sota son posiciones seguidas', () => {
    expect(rankPosition(10) - rankPosition(7)).toBe(1);
  });
});

describe('cardPoints', () => {
  it('rangos 1..7 valen su valor', () => {
    expect(cardPoints(card('oros-1'))).toBe(1);
    expect(cardPoints(card('copas-7'))).toBe(7);
  });

  it('rangos 10,11,12 valen 10', () => {
    expect(cardPoints(card('oros-10'))).toBe(10);
    expect(cardPoints(card('oros-11'))).toBe(10);
    expect(cardPoints(card('oros-12'))).toBe(10);
  });
});
