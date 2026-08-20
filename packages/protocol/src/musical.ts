/**
 * Comprueba créditos de artista como los devuelve el catálogo musical.
 *
 * Apple puede devolver varios artistas unidos por &, coma, feat., etc. La
 * respuesta completa sigue siendo válida, pero también lo es cualquiera de
 * los artistas acreditados por separado.
 */
export function musicalArtistMatches(value: string, expected: string): boolean {
  const normalizedValue = normalizeMusicalText(value);
  if (!normalizedValue) return false;

  return musicalArtistCandidates(expected).some((candidate) =>
    normalizedMusicalMatch(normalizedValue, candidate),
  );
}

export function musicalArtistCandidates(value: string): string[] {
  const full = normalizeMusicalText(value);
  const pieces = value
    .replace(/\b(?:featuring|feat\.?|ft\.?|with)\b/gi, '|')
    .replace(/[,&/+;|]/g, '|')
    .replace(/\s+[x×]\s+/gi, '|')
    .split('|')
    .map(normalizeMusicalText)
    .filter(Boolean);

  return [...new Set([full, ...pieces])];
}

function normalizeMusicalText(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase('es-ES')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizedMusicalMatch(value: string, expected: string): boolean {
  if (!value || !expected) return false;
  return (
    value === expected ||
    value.includes(expected) ||
    expected.includes(value) ||
    isCloseTypo(value, expected)
  );
}

function isCloseTypo(a: string, b: string): boolean {
  if (a.length < 4 || b.length < 4) return false;
  const limit = Math.max(a.length, b.length) >= 9 ? 2 : 1;
  return levenshteinDistance(a, b) <= limit;
}

function levenshteinDistance(a: string, b: string): number {
  const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let row = 1; row <= a.length; row += 1) {
    let diagonal = previous[0] ?? 0;
    previous[0] = row;
    for (let column = 1; column <= b.length; column += 1) {
      const above = previous[column] ?? 0;
      const left = previous[column - 1] ?? 0;
      previous[column] = Math.min(
        above + 1,
        left + 1,
        diagonal + (a[row - 1] === b[column - 1] ? 0 : 1),
      );
      diagonal = above;
    }
  }
  return previous[b.length] ?? 0;
}
