import { describe, expect, it } from 'vitest';
import { CARD_STYLE_OPTIONS, cardStyleFolder } from './card-style';

describe('card styles', () => {
  it('offers the classic deck and the pixel art variant', () => {
    expect(CARD_STYLE_OPTIONS.map((option) => option.id)).toEqual([
      'classic',
      'pixel-art-simple',
    ]);
  });

  it('maps every variant to its public folder', () => {
    expect(cardStyleFolder('classic')).toBeNull();
    expect(cardStyleFolder('pixel-art-simple')).toBe('pixel-art-simple');
  });
});
