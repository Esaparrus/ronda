import { describe, expect, it } from 'vitest';
import { formatMusAmount, musQuickAmounts } from './mus';

describe('cantidades de envite de Mus', () => {
  it('ofrece el mínimo, cantidades sueltas y amarrakos completos', () => {
    expect(musQuickAmounts(2)).toEqual([2, 3, 4, 5, 10, 15, 20, 25, 30, 35, 40]);
    expect(musQuickAmounts(17)).toEqual([17, 18, 20, 25, 30, 35, 40]);
  });

  it('explica los múltiplos de cinco como amarrakos', () => {
    expect(formatMusAmount(1)).toBe('1 piedra');
    expect(formatMusAmount(4)).toBe('4 piedras');
    expect(formatMusAmount(5)).toBe('5 piedras · 1 amarrako');
    expect(formatMusAmount(15)).toBe('15 piedras · 3 amarrakos');
  });
});
