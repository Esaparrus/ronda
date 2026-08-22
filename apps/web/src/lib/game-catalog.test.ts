import { describe, expect, it } from 'vitest';
import { GAME_CATALOG, GAME_CATEGORIES } from './game-catalog';

describe('game catalog categories', () => {
  it('includes every game exactly once', () => {
    const catalogSlugs = GAME_CATALOG.map((game) => game.slug);
    const categorySlugs = GAME_CATEGORIES.flatMap((category) => category.gameSlugs);
    const sort = (slugs: readonly string[]) => [...slugs].sort();

    expect(new Set(categorySlugs).size).toBe(categorySlugs.length);
    expect(sort(categorySlugs)).toEqual(sort(catalogSlugs));
  });
});
