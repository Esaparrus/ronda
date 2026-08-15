export type EscobaTableDensity = 'roomy' | 'compact' | 'dense';

export function escobaTableDensity(cardCount: number): EscobaTableDensity {
  const count = Math.max(0, Math.floor(cardCount));
  if (count <= 8) return 'roomy';
  if (count <= 12) return 'compact';
  return 'dense';
}
