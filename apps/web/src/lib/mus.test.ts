import { describe, expect, it } from 'vitest';
import { formatMusAmount, formatMusStepperAmount, musEnviteChoices } from './mus';

describe('cantidades de envite de Mus', () => {
  it('avanza de piedras sueltas a amarrakos y termina en órdago', () => {
    expect(musEnviteChoices(2)).toEqual([2, 3, 4, 5, 10, 15, 20, 25, 30, 35, 40, 'ordago']);
    expect(musEnviteChoices(18)).toEqual([18, 20, 25, 30, 35, 40, 'ordago']);
    expect(musEnviteChoices(40)).toEqual([40, 'ordago']);
    expect(musEnviteChoices(41)).toEqual(['ordago']);
  });

  it('explica los múltiplos de cinco como amarrakos', () => {
    expect(formatMusAmount(1)).toBe('1 piedra');
    expect(formatMusAmount(4)).toBe('4 piedras');
    expect(formatMusAmount(5)).toBe('5 piedras · 1 amarrako');
    expect(formatMusAmount(15)).toBe('15 piedras · 3 amarrakos');
  });

  it('da protagonismo a los amarrakos dentro del contador', () => {
    expect(formatMusStepperAmount(4)).toEqual({ primary: '4 piedras', secondary: null });
    expect(formatMusStepperAmount(5)).toEqual({ primary: '1 amarrako', secondary: '5 piedras' });
    expect(formatMusStepperAmount(18)).toEqual({
      primary: '3 amarrakos + 3',
      secondary: '18 piedras',
    });
    expect(formatMusStepperAmount(40)).toEqual({
      primary: '8 amarrakos',
      secondary: '40 piedras',
    });
  });
});
