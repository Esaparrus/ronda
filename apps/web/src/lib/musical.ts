import {
  MUSICAL_YEAR_MAX,
  MUSICAL_YEAR_MIN,
  musicalArtistMatches,
  musicalTextMatches,
  type MusicalConfig,
} from '@ronda/protocol';

export const MUSICAL_CLIP_STEPS = [1, 3, 5, 10, 30] as const;

export type MusicFilters = Pick<
  MusicalConfig,
  'genre' | 'popularity' | 'yearFrom' | 'yearTo' | 'regions'
>;
export type MusicalRegion = MusicFilters['regions'][number];

export const DEFAULT_MUSIC_FILTERS: MusicFilters = {
  genre: 'mezcla',
  popularity: 'exitos',
  yearFrom: MUSICAL_YEAR_MIN,
  yearTo: MUSICAL_YEAR_MAX,
  regions: ['mundo'],
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

/** Usa el proxy local para que las previews tengan un MIME reproducible en móvil. */
export function musicPreviewUrl(previewUrl: string): string {
  return `/api/music/preview?url=${encodeURIComponent(previewUrl)}`;
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
  value: MusicalConfig['decade'];
  label: string;
  from: number | null;
  to: number | null;
}>;

export const MUSICAL_ANSWER_MODE_OPTIONS = [
  {
    value: 'artist_title_year',
    label: 'Artista + canción + año',
  },
  {
    value: 'artist_title',
    label: 'Artista + canción',
  },
  {
    value: 'title',
    label: 'Solo canción',
  },
] as const satisfies ReadonlyArray<{
  value: MusicalConfig['answerMode'];
  label: string;
}>;

export const MUSICAL_POPULARITY_OPTIONS = [
  { value: 'variado', label: 'Variado', helper: 'Más variedad dentro del filtro.' },
  { value: 'exitos', label: 'Éxitos', helper: 'Prioriza los primeros resultados del catálogo.' },
] as const satisfies ReadonlyArray<{
  value: MusicFilters['popularity'];
  label: string;
  helper: string;
}>;

export const MUSICAL_REGION_OPTIONS = [
  { value: 'mundo', label: 'Todo el mundo' },
  { value: 'espana', label: 'España' },
  { value: 'latinoamerica', label: 'Latinoamérica' },
  { value: 'centroamerica', label: 'Centroamérica' },
  { value: 'norteamerica', label: 'Norteamérica' },
  { value: 'europa', label: 'Europa' },
  { value: 'italia', label: 'Italia' },
  { value: 'francia', label: 'Francia' },
] as const satisfies ReadonlyArray<{ value: MusicalRegion; label: string }>;

/** Mercados de iTunes que representan cada filtro geográfico. */
const REGION_MARKETS: Record<MusicalRegion, readonly string[]> = {
  mundo: ['ES', 'US', 'GB', 'MX', 'AR', 'BR', 'FR', 'IT', 'DE', 'CA', 'JP', 'AU'],
  espana: ['ES'],
  latinoamerica: ['MX', 'AR', 'BR', 'CO', 'CL', 'PE', 'UY', 'EC'],
  centroamerica: ['CR', 'GT', 'HN', 'NI', 'PA', 'SV', 'DO', 'PR'],
  norteamerica: ['US', 'CA', 'MX'],
  europa: ['GB', 'DE', 'ES', 'FR', 'IT', 'PT', 'NL', 'SE'],
  italia: ['IT'],
  francia: ['FR'],
};

const MAX_COUNTRY_REQUESTS = 12;
const MUSIC_HISTORY_STORAGE_KEY = 'ronda:musical:recent-track-identities';
const MUSIC_HISTORY_LIMIT = 150;

export function normalizeMusicRegions(
  regions: readonly MusicalRegion[] | undefined,
): MusicalRegion[] {
  const unique = [...new Set(regions ?? [])];
  if (unique.length === 0 || unique.includes('mundo')) return ['mundo'];
  return unique;
}

export function toggleMusicRegion(
  regions: readonly MusicalRegion[] | undefined,
  region: MusicalRegion,
): MusicalRegion[] {
  const current = normalizeMusicRegions(regions);
  if (region === 'mundo') return ['mundo'];
  if (current.includes('mundo')) return [region];
  const next = current.includes(region)
    ? current.filter((candidate) => candidate !== region)
    : [...current, region];
  return next.length > 0 ? next : ['mundo'];
}

export async function searchMusic(filters: MusicFilters): Promise<MusicTrack[]> {
  const genre =
    MUSICAL_GENRE_OPTIONS.find((option) => option.value === filters.genre) ??
    MUSICAL_GENRE_OPTIONS[0];
  const countries = [
    ...new Set(normalizeMusicRegions(filters.regions).flatMap((region) => REGION_MARKETS[region])),
  ].slice(0, MAX_COUNTRY_REQUESTS);
  const responses = await Promise.allSettled(
    countries.map((country) => searchMusicInCountry(filters, genre.query, country)),
  );
  const successfulGroups = responses.flatMap((response) =>
    response.status === 'fulfilled' ? [response.value] : [],
  );
  if (successfulGroups.length === 0) {
    const failed = responses.find((response) => response.status === 'rejected');
    throw new Error(
      failed?.status === 'rejected' && failed.reason instanceof Error
        ? failed.reason.message
        : 'No se pudo buscar música.',
    );
  }
  return uniqueMusicTracks(interleaveMusicTracks(successfulGroups));
}

async function searchMusicInCountry(
  filters: MusicFilters,
  term: string,
  country: string,
): Promise<MusicTrack[]> {
  const params = new URLSearchParams({ q: term, limit: '100', country });
  params.set('from', String(filters.yearFrom));
  params.set('to', String(filters.yearTo));
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
  const recentIdentities = new Set(readRecentMusicIdentities());
  const freshCandidates = candidates.filter(
    (track) => !recentIdentities.has(musicTrackIdentity(track)),
  );
  const availableCandidates =
    freshCandidates.length >= count
      ? freshCandidates
      : uniqueMusicTracks([...freshCandidates, ...candidates]);
  // «Éxitos» sigue priorizando los primeros resultados de Apple, pero abre el
  // abanico para que una partida de 5–10 canciones no salga siempre del mismo
  // grupo de 20–30 pistas.
  const pool =
    filters.popularity === 'exitos'
      ? availableCandidates.slice(0, Math.min(availableCandidates.length, Math.max(count * 8, 60)))
      : availableCandidates;
  const selected = shuffleTracks(pool).slice(0, count);
  if (selected.length < count) {
    throw new Error(
      `Apple solo ha devuelto ${selected.length} canciones para esos filtros. Prueba otra época o menos rondas.`,
    );
  }
  rememberRecentMusicTracks(selected);
  return selected;
}

function uniqueMusicTracks(tracks: readonly MusicTrack[]): MusicTrack[] {
  const seen = new Set<string>();
  return tracks.filter((track) => {
    const identity = musicTrackIdentity(track);
    if (seen.has(track.id) || seen.has(identity)) return false;
    seen.add(track.id);
    seen.add(identity);
    return true;
  });
}

function interleaveMusicTracks(groups: readonly (readonly MusicTrack[])[]): MusicTrack[] {
  const tracks: MusicTrack[] = [];
  const maxGroupLength = Math.max(0, ...groups.map((group) => group.length));
  for (let index = 0; index < maxGroupLength; index += 1) {
    for (const group of groups) {
      const track = group[index];
      if (track) tracks.push(track);
    }
  }
  return tracks;
}

function musicTrackIdentity(track: Pick<MusicTrack, 'artist' | 'title'>): string {
  return `${normalizeMusicText(track.artist)}::${normalizeMusicText(track.title)}`;
}

function readRecentMusicIdentities(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const value = window.localStorage.getItem(MUSIC_HISTORY_STORAGE_KEY);
    if (!value) return [];
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed
          .filter((item): item is string => typeof item === 'string')
          .slice(-MUSIC_HISTORY_LIMIT)
      : [];
  } catch {
    return [];
  }
}

function rememberRecentMusicTracks(tracks: readonly MusicTrack[]): void {
  if (typeof window === 'undefined' || tracks.length === 0) return;
  try {
    const history = [...readRecentMusicIdentities(), ...tracks.map(musicTrackIdentity)];
    window.localStorage.setItem(
      MUSIC_HISTORY_STORAGE_KEY,
      JSON.stringify([...new Set(history)].slice(-MUSIC_HISTORY_LIMIT)),
    );
  } catch {
    // El historial es una mejora opcional; una cuota llena no debe impedir jugar.
  }
}

export function musicFiltersLabel(filters: MusicFilters): string {
  const genre = MUSICAL_GENRE_OPTIONS.find((option) => option.value === filters.genre);
  const popularity = MUSICAL_POPULARITY_OPTIONS.find(
    (option) => option.value === filters.popularity,
  );
  const years =
    filters.yearFrom === MUSICAL_YEAR_MIN && filters.yearTo >= MUSICAL_YEAR_MAX
      ? 'Cualquier época'
      : `${filters.yearFrom}–${filters.yearTo}`;
  const regions = normalizeMusicRegions(filters.regions)
    .map((region) => MUSICAL_REGION_OPTIONS.find((option) => option.value === region)?.label)
    .filter(Boolean)
    .join(', ');
  return [genre?.label, years, regions, popularity?.label].filter(Boolean).join(' · ');
}

export function isMusicAnswerCorrect(
  guess: { artist: string; title: string; year: number | null },
  track: MusicTrack,
  answerMode: MusicalConfig['answerMode'] = 'artist_title',
): boolean {
  const yearMatches =
    answerMode !== 'artist_title_year' || (track.year !== null && guess.year === track.year);
  return (
    (answerMode === 'title' || musicalArtistMatches(guess.artist, track.artist)) &&
    musicalTextMatches(guess.title, track.title) &&
    yearMatches
  );
}

export function pointsForMusicClip(clipIndex: number): number {
  return Math.max(1, 5 - clipIndex);
}

export function normalizedMatch(value: string, expected: string): boolean {
  return musicalTextMatches(value, expected);
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
