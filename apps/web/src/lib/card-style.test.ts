import { describe, expect, it } from 'vitest';
import { CARD_STYLE_OPTIONS, cardStyleFolder } from './card-style';

describe('estilos de cartas', () => {
  it('ofrece solo la baraja clásica y la última variante pixel art', () => {
    expect(CARD_STYLE_OPTIONS.map((option) => option.id)).toEqual([
      'classic',
      'pixel-art-simple',
    ]);
  });

  it('mapea la última variante a su carpeta pública', () => {
    expect(cardStyleFolder('classic')).toBeNull();
    expect(cardStyleFolder('pixel-art-simple')).toBe('pixel-art-simple');
  });
});
