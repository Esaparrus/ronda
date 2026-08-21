import { describe, expect, it } from 'vitest';
import { rondaCardFanLayout, rondaCardFanTop, rondaCardFanTransform } from './ronda-card-fan';

describe('rondaCardFanLayout', () => {
  it('muestra una mano inicial de cinco cartas sin desbordar el móvil', () => {
    const layout = rondaCardFanLayout(344, 5);

    expect(layout.totalWidth).toBeLessThanOrEqual(344);
    expect(layout.cardWidth).toBeGreaterThanOrEqual(84);
    expect(layout.slotWidth).toBeGreaterThan(0);
    expect(layout.stageHeight).toBeGreaterThan(layout.cardHeight);
  });

  it('encaja el límite de diez cartas aumentando el solape', () => {
    const fiveCards = rondaCardFanLayout(344, 5);
    const tenCards = rondaCardFanLayout(344, 10);

    expect(tenCards.totalWidth).toBeLessThanOrEqual(344);
    expect(tenCards.cardWidth).toBeGreaterThanOrEqual(84);
    expect(tenCards.slotWidth).toBeLessThan(fiveCards.slotWidth);
  });

  it('limita el tamaño de los naipes en pantallas anchas', () => {
    const layout = rondaCardFanLayout(744, 10);

    expect(layout.cardWidth).toBeLessThanOrEqual(112);
    expect(layout.totalWidth).toBeLessThanOrEqual(744);
  });

  it('eleva y endereza la carta seleccionada', () => {
    expect(rondaCardFanTop(0, 5, true)).toBe(0);
    expect(rondaCardFanTransform(0, 5, true)).toBe('rotate(0deg)');
    expect(rondaCardFanTop(0, 5, false)).toBeGreaterThan(0);
    expect(rondaCardFanTransform(0, 5, false)).not.toBe('rotate(0deg)');
  });
});
