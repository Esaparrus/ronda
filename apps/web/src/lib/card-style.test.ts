import { describe, expect, it } from 'vitest';
import {
  CARD_STYLE_OPTIONS,
  cardStyleExtension,
  cardStyleFolder,
  cardStyleRenderMode,
  isCardStyle,
  resolveCardStylePreference,
} from './card-style';

describe('card styles', () => {
  it('offers every available deck', () => {
    expect(CARD_STYLE_OPTIONS.map((option) => option.id)).toEqual([
      'classic',
      'moderna',
      'minimal-iconica',
      'pixel-art-moderno',
    ]);
  });

  it('maps image variants to their public folder', () => {
    expect(cardStyleFolder('classic')).toBeNull();
    expect(cardStyleFolder('moderna')).toBe('moderna');
    expect(cardStyleFolder('minimal-iconica')).toBeNull();
    expect(cardStyleFolder('pixel-art-moderno')).toBeNull();
  });

  it('uses the asset format generated for each deck', () => {
    expect(cardStyleExtension('classic')).toBe('webp');
    expect(cardStyleExtension('moderna')).toBe('webp');
    expect(cardStyleExtension('minimal-iconica')).toBe('png');
    expect(cardStyleExtension('pixel-art-moderno')).toBe('png');
  });

  it('selects the renderer for each visual language', () => {
    expect(cardStyleRenderMode('classic')).toBe('image');
    expect(cardStyleRenderMode('moderna')).toBe('image');
    expect(cardStyleRenderMode('minimal-iconica')).toBe('minimal');
    expect(cardStyleRenderMode('pixel-art-moderno')).toBe('pixel');
  });

  it('recognizes current styles', () => {
    expect(isCardStyle('pixel-art-moderno')).toBe(true);
    expect(isCardStyle('pixel-art-simple')).toBe(false);
  });

  it('migrates every legacy pixel preference to the modern renderer', () => {
    for (const legacyStyle of [
      'pixel-art',
      'pixel-art-final',
      'pixel-art-simple',
      'pixel-art-uniforme',
    ]) {
      expect(resolveCardStylePreference(legacyStyle)).toBe('pixel-art-moderno');
    }
  });
});
