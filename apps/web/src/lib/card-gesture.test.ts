import { describe, expect, it } from 'vitest';
import { cardDragIntent, isUpwardCardFling, pointInsideExpandedRect } from './card-gesture';

describe('gestos de carta', () => {
  it('distingue toque, reordenación horizontal y lanzamiento', () => {
    expect(cardDragIntent(3, -2)).toBe('pending');
    expect(cardDragIntent(42, -8)).toBe('reorder');
    expect(cardDragIntent(12, -48)).toBe('play');
  });

  it('acepta un lanzamiento vertical natural aunque sea algo diagonal', () => {
    expect(isUpwardCardFling(100, 700, 135, 610)).toBe(true);
    expect(isUpwardCardFling(100, 700, 190, 650)).toBe(false);
    expect(isUpwardCardFling(100, 700, 105, 655)).toBe(false);
  });

  it('amplía la zona táctil alrededor del destino visible', () => {
    const rect = { left: 100, right: 200, top: 200, bottom: 300 };
    expect(pointInsideExpandedRect(90, 190, rect)).toBe(true);
    expect(pointInsideExpandedRect(75, 190, rect)).toBe(false);
  });
});
