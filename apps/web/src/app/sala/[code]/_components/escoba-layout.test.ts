import { describe, expect, it } from 'vitest';
import { escobaTableDensity } from './escoba-layout';

describe('escobaTableDensity', () => {
  it('keeps up to eight table cards readable', () => {
    expect(escobaTableDensity(4)).toBe('roomy');
    expect(escobaTableDensity(8)).toBe('roomy');
  });

  it('compacts nine to twelve cards so three rows fit', () => {
    expect(escobaTableDensity(9)).toBe('compact');
    expect(escobaTableDensity(12)).toBe('compact');
  });

  it('uses the densest layout for larger piles', () => {
    expect(escobaTableDensity(13)).toBe('dense');
    expect(escobaTableDensity(30)).toBe('dense');
  });

  it('treats invalid negative counts as an empty table', () => {
    expect(escobaTableDensity(-1)).toBe('roomy');
  });
});
