// Proxy server-side de iTunes Search API. Mantiene el contrato de Apple fuera
// de los componentes y evita que cada pantalla tenga que resolver CORS o
// normalizar resultados distintos.

const MAX_TERM_LENGTH = 80;

interface ItunesSearchResponse {
  results?: ItunesTrack[];
}

interface ItunesTrack {
  trackId?: number;
  trackName?: string;
  artistName?: string;
  releaseDate?: string;
  previewUrl?: string;
  artworkUrl100?: string;
  trackViewUrl?: string;
  collectionName?: string;
  primaryGenreName?: string;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawTerm = searchParams.get('q')?.trim() ?? '';
  const term = rawTerm.slice(0, MAX_TERM_LENGTH);

  if (term.length < 2) {
    return Response.json({ error: 'Escribe al menos dos letras.' }, { status: 400 });
  }

  const query = new URL('https://itunes.apple.com/search');
  query.searchParams.set('term', term);
  query.searchParams.set('country', 'es');
  query.searchParams.set('media', 'music');
  query.searchParams.set('entity', 'song');
  query.searchParams.set('limit', '30');
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
    const results = (payload.results ?? [])
      .filter(
        (track): track is Required<
          Pick<ItunesTrack, 'trackId' | 'trackName' | 'artistName' | 'previewUrl' | 'trackViewUrl'>
        > & ItunesTrack =>
          typeof track.trackId === 'number' &&
          Boolean(track.trackName?.trim()) &&
          Boolean(track.artistName?.trim()) &&
          Boolean(track.previewUrl) &&
          Boolean(track.trackViewUrl),
      )
      .map((track) => ({
        id: String(track.trackId),
        title: track.trackName.trim(),
        artist: track.artistName.trim(),
        year: parseYear(track.releaseDate),
        previewUrl: track.previewUrl,
        artworkUrl: upgradeArtworkUrl(track.artworkUrl100),
        storeUrl: track.trackViewUrl,
        collectionName: track.collectionName?.trim() ?? '',
        genre: track.primaryGenreName?.trim() ?? 'Música',
      }));

    return Response.json(
      { results },
      {
        headers: {
          'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=600',
        },
      },
    );
  } catch {
    return Response.json({ error: 'No se pudo consultar el catálogo musical.' }, { status: 502 });
  }
}

function parseYear(value: string | undefined): number | null {
  const year = value ? Number(value.slice(0, 4)) : NaN;
  return Number.isInteger(year) && year >= 1900 && year <= 2100 ? year : null;
}

function upgradeArtworkUrl(value: string | undefined): string | null {
  if (!value) return null;
  return value.replace(/\d+x\d+bb\./, '300x300bb.');
}
