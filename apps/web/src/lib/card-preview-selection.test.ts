import { describe, expect, it } from 'vitest';
import {
  ALL_CARD_IDS,
  CARD_PREVIEW_GROUPS,
  MAX_CARD_PREVIEW_SELECTION,
  updateCardPreviewSelection,
} from './card-preview-selection';

describe('card preview selection', () => {
  it('offers every card in the 40-card Spanish deck', () => {
    expect(CARD_PREVIEW_GROUPS).toHaveLength(4);
    expect(CARD_PREVIEW_GROUPS.every((group) => group.cards.length === 10)).toBe(true);
    expect(ALL_CARD_IDS).toHaveLength(40);
    expect([...new Set(ALL_CARD_IDS)]).toHaveLength(40);
  });

  it('replaces the selection in single-card mode', () => {
    expect(updateCardPreviewSelection(['oros-1', 'copas-10'], 'bastos-12', 'single')).toEqual([
      'bastos-12',
    ]);
  });

  it('adds and removes cards in multiple-card mode without leaving it empty', () => {
    expect(updateCardPreviewSelection(['oros-1'], 'copas-10', 'multiple')).toEqual([
      'oros-1',
      'copas-10',
    ]);
    expect(updateCardPreviewSelection(['oros-1', 'copas-10'], 'oros-1', 'multiple')).toEqual([
      'copas-10',
    ]);
    expect(updateCardPreviewSelection(['oros-1'], 'oros-1', 'multiple')).toEqual(['oros-1']);
  });

  it('keeps the multiple-card selection within its limit', () => {
    const selected = ['oros-1', 'copas-10', 'espadas-11', 'bastos-12'] as const;
    expect(selected).toHaveLength(MAX_CARD_PREVIEW_SELECTION);
    expect(updateCardPreviewSelection(selected, 'oros-2', 'multiple')).toEqual(selected);
  });
});
