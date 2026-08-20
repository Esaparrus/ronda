export const MUSICAL_CLIP_STEPS = [2, 5, 10, 20] as const;

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

export const SURPRISE_QUERIES = [
  'pop español',
  'rock clásico',
  'hits 2000',
  'indie pop',
  'dance',
  'cantautores',
] as const;

export async function searchMusic(term: string): Promise<MusicTrack[]> {
  const response = await fetch(`/api/music/search?q=${encodeURIComponent(term)}`);
  const payload = (await response.json()) as MusicSearchResponse;
  if (!response.ok) throw new Error(payload.error ?? 'No se pudo buscar música.');
  return payload.results ?? [];
}

export function isMusicAnswerCorrect(
  guess: { artist: string; title: string; year: number | null },
  track: MusicTrack,
): boolean {
  const yearMatches = guess.year === null || (track.year !== null && guess.year === track.year);
  return normalizedMatch(guess.artist, track.artist) && normalizedMatch(guess.title, track.title) && yearMatches;
}

export function pointsForMusicClip(clipIndex: number): number {
  return Math.max(1, 5 - clipIndex);
}

export function normalizedMatch(value: string, expected: string): boolean {
  const a = normalizeMusicText(value);
  const b = normalizeMusicText(expected);
  return Boolean(a && b && (a === b || a.includes(b) || b.includes(a)));
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
