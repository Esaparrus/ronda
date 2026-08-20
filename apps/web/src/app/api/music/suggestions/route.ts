// Sugerencias ligeras para completar respuestas de Musical. Solo devuelve
// nombres, no una biblioteca local ni los metadatos completos de las pistas.

const MAX_TERM_LENGTH = 80;
const MAX_RESULTS = 100;
const MAX_SUGGESTIONS = 5;

type SuggestionField = 'artist' | 'title';

interface ItunesSearchResponse {
  results?: ItunesTrack[];
}

interface ItunesTrack {
  trackName?: string;
  artistName?: string;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawTerm = searchParams.get('q')?.trim() ?? '';
  const term = rawTerm.slice(0, MAX_TERM_LENGTH);
  const field = parseField(searchParams.get('field'));

  if (!field) {
    return Response.json({ error: 'El tipo de sugerencia no es válido.' }, { status: 400 });
  }
  if (term.length < 1) {
    return Response.json({ suggestions: [] });
  }

  const query = new URL('https://itunes.apple.com/search');
  query.searchParams.set('term', term);
  query.searchParams.set('country', 'es');
  query.searchParams.set('media', 'music');
  query.searchParams.set('entity', field === 'artist' ? 'musicArtist' : 'song');
  query.searchParams.set('attribute', field === 'artist' ? 'artistTerm' : 'songTerm');
  query.searchParams.set('limit', String(MAX_RESULTS));
  query.searchParams.set('explicit', 'No');

  try {
    const response = await fetch(query, {
      next: { revalidate: 300 },
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) {
      return Response.json({ error: 'Apple no ha respondido a tiempo.' }, { status: 502 });
    }

    const payload = (await response.json()) as ItunesSearchResponse;
    const values = (payload.results ?? [])
      .map((track) => (field === 'artist' ? track.artistName : track.trackName))
      .filter((value): value is string => Boolean(value?.trim()))
      .map((value) => value.trim());
    const suggestions = rankSuggestions(unique(values), term).slice(0, MAX_SUGGESTIONS);

    return Response.json(
      { suggestions },
      {
        headers: {
          'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=600',
        },
      },
    );
  } catch {
    return Response.json({ error: 'No se pudieron cargar sugerencias.' }, { status: 502 });
  }
}

function parseField(value: string | null): SuggestionField | null {
  return value === 'artist' || value === 'title' ? value : null;
}

function unique(values: string[]): string[] {
  const seen = new Set<string>();
  return values.filter((value) => {
    const key = normalize(value);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function rankSuggestions(values: string[], term: string): string[] {
  const normalizedTerm = normalize(term);
  return values
    .filter((value) => normalize(value).includes(normalizedTerm))
    .sort((left, right) => {
      const leftValue = normalize(left);
      const rightValue = normalize(right);
      const leftStarts = leftValue.startsWith(normalizedTerm) ? 0 : 1;
      const rightStarts = rightValue.startsWith(normalizedTerm) ? 0 : 1;
      return leftStarts - rightStarts || left.localeCompare(right, 'es');
    });
}

function normalize(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase('es-ES')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
