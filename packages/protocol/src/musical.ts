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
    musicalTextMatches(normalizedValue, candidate),
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

/**
 * Acepta respuestas escritas a mano con pequeñas diferencias o partes
 * reconocibles del nombre. Se comparte entre cliente y servidor para que la
 * comprobación sea idéntica en todos los modos de Musical.
 */
export function musicalTextMatches(value: string, expected: string): boolean {
  const normalizedValue = normalizeMusicalText(value);
  const normalizedExpected = normalizeMusicalText(expected);
  if (!normalizedValue || !normalizedExpected) return false;
  if (normalizedValue === normalizedExpected) return true;

  // Una parte de al menos cuatro letras es suficientemente informativa para
  // que «bohemian» o «rhapsod» valgan para «Bohemian Rhapsody», pero no «the».
  if (
    (normalizedValue.length >= 4 && normalizedExpected.includes(normalizedValue)) ||
    (normalizedExpected.length >= 4 && normalizedValue.includes(normalizedExpected))
  ) {
    return true;
  }

  // Permite escribir palabras relevantes sin tener que reproducir todos los
  // conectores del título: «Rolling Deep» para «Rolling in the Deep».
  const valueWords = relevantMusicalWords(normalizedValue);
  const expectedWords = relevantMusicalWords(normalizedExpected);
  if (
    valueWords.length > 0 &&
    expectedWords.length > 0 &&
    valueWords.every((valueWord) =>
      expectedWords.some((expectedWord) => musicalWordMatches(valueWord, expectedWord)),
    )
  ) {
    return true;
  }

  return isCloseTypo(normalizedValue, normalizedExpected);
}

const MUSICAL_CONNECTORS = new Set([
  'a',
  'al',
  'and',
  'con',
  'de',
  'del',
  'el',
  'en',
  'for',
  'in',
  'la',
  'las',
  'lo',
  'los',
  'of',
  'on',
  'the',
  'to',
  'un',
  'una',
  'y',
]);

function relevantMusicalWords(value: string): string[] {
  return value.split(' ').filter((word) => !MUSICAL_CONNECTORS.has(word));
}

function musicalWordMatches(value: string, expected: string): boolean {
  return (
    value === expected ||
    (value.length >= 4 && expected.includes(value)) ||
    (expected.length >= 4 && value.includes(expected)) ||
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
