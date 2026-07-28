import { describe, it, expect } from 'vitest';
import { mulberry32, hashSeed, shuffle } from './rng.ts';

describe('hashSeed', () => {
  it('es determinista: mismo string → mismo número', () => {
    expect(hashSeed('ronda-123')).toBe(hashSeed('ronda-123'));
  });

  it('distingue strings distintos (salvo colisión astronómica)', () => {
    expect(hashSeed('a')).not.toBe(hashSeed('b'));
  });

  it('devuelve entero de 32 bits (>= 0, < 2^32)', () => {
    const h = hashSeed('lorem ipsum');
    expect(Number.isInteger(h)).toBe(true);
    expect(h).toBeGreaterThanOrEqual(0);
    expect(h).toBeLessThan(2 ** 32);
  });
});

describe('mulberry32', () => {
  it('misma semilla → misma secuencia', () => {
    const a = mulberry32(12345);
    const b = mulberry32(12345);
    for (let i = 0; i < 100; i++) {
      expect(a()).toBe(b());
    }
  });

  it('semilla distinta → secuencia distinta', () => {
    const a = mulberry32(1);
    const b = mulberry32(2);
    let differs = false;
    for (let i = 0; i < 100; i++) {
      if (a() !== b()) differs = true;
    }
    expect(differs).toBe(true);
  });

  it('produce valores en [0, 1)', () => {
    const r = mulberry32(42);
    for (let i = 0; i < 1000; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('shuffle', () => {
  const base = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  it('misma seed + mismo calls → mismo orden (siempre)', () => {
    const a = shuffle(base, 'partida-x', 0);
    const b = shuffle(base, 'partida-x', 0);
    expect(a.items).toEqual(b.items);
    expect(a.calls).toBe(b.calls);
  });

  it('calls distinto → (casi seguro) distinto orden', () => {
    const a = shuffle(base, 'partida-x', 0);
    const b = shuffle(base, 'partida-x', 7);
    // No asserts estrictos: el contador desplaza el RNG. Con 10 elementos la
    // probabilidad de que salgan iguales es despreciable.
    expect(a.items).not.toEqual(b.items);
  });

  it('seed distinto → (casi seguro) distinto orden', () => {
    const a = shuffle(base, 'partida-a', 0);
    const b = shuffle(base, 'partida-b', 0);
    expect(a.items).not.toEqual(b.items);
  });

  it('es una permutación: mismos elementos, distinto (o igual) orden', () => {
    const { items } = shuffle(base, 'semilla', 3);
    expect(items.length).toBe(base.length);
    expect([...items].sort((x, y) => x - y)).toEqual(base);
  });

  it('no muta el array original', () => {
    const original = [...base];
    shuffle(base, 'semilla', 0);
    expect(base).toEqual(original);
  });

  it('devuelve calls = calls_inicial + (len - 1) consumidos por Fisher-Yates', () => {
    const { calls } = shuffle(base, 'semilla', 10);
    // Fisher-Yates itera de i=len-1 down to 1 → (len-1) llamadas a rand().
    expect(calls).toBe(10 + (base.length - 1));
  });

  it('maneja arrays de 0 y 1 elementos sin error', () => {
    expect(shuffle([], 's', 0).items).toEqual([]);
    expect(shuffle([42], 's', 0).items).toEqual([42]);
  });
});
