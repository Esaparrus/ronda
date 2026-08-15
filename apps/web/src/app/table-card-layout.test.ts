import { describe, expect, it } from 'vitest';
import { cardGridLayout } from '../components/cards/AdaptiveCardGrid';

describe('cardGridLayout', () => {
  it('keeps a short table in one readable row', () => {
    expect(cardGridLayout(4)).toEqual({ columns: 4, rows: 1, density: 'roomy' });
  });

  it('adds rows progressively as the table grows', () => {
    expect(cardGridLayout(8)).toEqual({ columns: 4, rows: 2, density: 'regular' });
    expect(cardGridLayout(18)).toEqual({ columns: 6, rows: 3, density: 'dense' });
    expect(cardGridLayout(32)).toEqual({ columns: 8, rows: 4, density: 'packed' });
  });

  it('fits the full Spanish deck in an eight by five grid', () => {
    expect(cardGridLayout(40)).toEqual({ columns: 8, rows: 5, density: 'packed' });
  });
});
