import type { MusicalConfig } from '@ronda/protocol';

export const MUSICAL_CLIP_STEPS = [2, 5, 10, 20] as const;

export type MusicFilters = Pick<MusicalConfig, 'genre' | 'decade' | 'popularity'>;

export const DEFAULT_MUSIC_FILTERS: MusicFilters = {
  genre: 'mezcla',
  decade: 'cualquiera',
  popularity: 'variado',
};

export interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  year: number | null;
  previewUrl: string;
  artworkUrl: string | null;
  storeUrl: string;
  collectionName?: string;
  genre?: string;
}

export interface MusicSearchResponse {
  results?: MusicTrack[];
  error?: string;
}

export type MusicSuggestionField = 'artist' | 'title';

export interface MusicSuggestionsResponse {
  suggestions?: string[];
  error?: string;
}

export const MUSICAL_GENRE_OPTIONS = [
  { value: 'mezcla', label: 'Mezcla', query: 'pop español' },
  { value: 'pop', label: 'Pop', query: 'pop' },
  { value: 'rock', label: 'Rock', query: 'rock' },
  { value: 'urbano', label: 'Urbano', query: 'reggaeton' },
  { value: 'dance', label: 'Dance', query: 'dance' },
  { value: 'indie', label: 'Indie', query: 'indie pop' },
  { value: 'espanol', label: 'Español', query: 'pop español' },
  { value: 'latino', label: 'Latino', query: 'latin' },
  { value: 'clasica', label: 'Clásica', query: 'classical' },
] as const satisfies ReadonlyArray<{
  value: MusicFilters['genre'];
  label: string;
  query: string;
}>;

export const MUSICAL_DECADE_OPTIONS = [
  { value: 'cualquiera', label: 'Cualquier época', from: null, to: null },
  { value: '1960', label: 'Años 60', from: 1960, to: 1969 },
  { value: '1970', label: 'Años 70', from: 1970, to: 1979 },
  { value: '1980', label: 'Años 80', from: 1980, to: 1989 },
  { value: '1990', label: 'Años 90', from: 1990, to: 1999 },
  { value: '2000', label: 'Años 2000', from: 2000, to: 2009 },
  { value: '2010', label: 'Años 2010', from: 2010, to: 2019 },
  { value: '2020', label: 'Años 2020', from: 2020, to: 2029 },
] as const satisfies ReadonlyArray<{
  value: MusicFilters['decade'];
  label: string;
  from: number | null;
  to: number | null;
}>;

export const MUSICAL_POPULARITY_OPTIONS = [
  { value: 'variado', label: 'Variado', helper: 'Más variedad dentro del filtro.' },
  { value: 'exitos', label: 'Éxitos', helper: 'Prioriza los primeros resultados del catálogo.' },
] as const satisfies ReadonlyArray<{
  value: MusicFilters['popularity'];
  label: string;
  helper: string;
}>;

export async function searchMusic(filters: MusicFilters): Promise<MusicTrack[]> {
  const genre =
    MUSICAL_GENRE_OPTIONS.find((option) => option.value === filters.genre) ??
    MUSICAL_GENRE_OPTIONS[0];
  const decade =
    MUSICAL_DECADE_OPTIONS.find((option) => option.value === filters.decade) ??
    MUSICAL_DECADE_OPTIONS[0];
  const params = new URLSearchParams({ q: genre.query, limit: '100' });
  if (decade.from !== null) params.set('from', String(decade.from));
  if (decade.to !== null) params.set('to', String(decade.to));

  const response = await fetch(`/api/music/search?${params.toString()}`);
  const payload = (await response.json()) as MusicSearchResponse;
  if (!response.ok) throw new Error(payload.error ?? 'No se pudo buscar música.');
  return payload.results ?? [];
}

export async function getMusicSuggestions(
  field: MusicSuggestionField,
  term: string,
  signal?: AbortSignal,
): Promise<string[]> {
  const params = new URLSearchParams({ field, q: term.trim() });
  const response = await fetch(`/api/music/suggestions?${params.toString()}`, {
    cache: 'no-store',
    signal,
  });
  const payload = (await response.json()) as MusicSuggestionsResponse;
  if (!response.ok) throw new Error(payload.error ?? 'No se pudieron cargar sugerencias.');
  return payload.suggestions ?? [];
}

export async function pickRandomMusicTracks(
  filters: MusicFilters,
  count: number,
): Promise<MusicTrack[]> {
  const candidates = await searchMusic(filters);
  const pool =
    filters.popularity === 'exitos' ? candidates.slice(0, Math.max(count * 3, 20)) : candidates;
  const selected = shuffleTracks(pool).slice(0, count);
  if (selected.length < count) {
    throw new Error(
      `Apple solo ha devuelto ${selected.length} canciones para esos filtros. Prueba otra época o menos rondas.`,
    );
  }
  return selected;
}

export function musicFiltersLabel(filters: MusicFilters): string {
  const genre = MUSICAL_GENRE_OPTIONS.find((option) => option.value === filters.genre);
  const decade = MUSICAL_DECADE_OPTIONS.find((option) => option.value === filters.decade);
  const popularity = MUSICAL_POPULARITY_OPTIONS.find(
    (option) => option.value === filters.popularity,
  );
  return [genre?.label, decade?.label, popularity?.label].filter(Boolean).join(' · ');
}

export function isMusicAnswerCorrect(
  guess: { artist: string; title: string; year: number | null },
  track: MusicTrack,
): boolean {
  const yearMatches = guess.year === null || (track.year !== null && guess.year === track.year);
  return (
    normalizedMatch(guess.artist, track.artist) &&
    normalizedMatch(guess.title, track.title) &&
    yearMatches
  );
}

export function pointsForMusicClip(clipIndex: number): number {
  return Math.max(1, 5 - clipIndex);
}

export function normalizedMatch(value: string, expected: string): boolean {
  const a = normalizeMusicText(value);
  const b = normalizeMusicText(expected);
  return Boolean(a && b && (a === b || a.includes(b) || b.includes(a) || isCloseTypo(a, b)));
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

export function normalizeMusicText(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase('es-ES')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function shuffleTracks(tracks: readonly MusicTrack[]): MusicTrack[] {
  const copy = [...tracks];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j] as MusicTrack, copy[i] as MusicTrack];
  }
  return copy;
}
