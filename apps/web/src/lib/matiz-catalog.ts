import { MATIZ_CHALLENGES } from '@ronda/protocol';

export const MATIZ_ENABLED_IDS_STORAGE_KEY = 'ronda.matiz.enabled-challenges.v1';

const ALL_MATIZ_IDS = MATIZ_CHALLENGES.map((challenge) => challenge.id);
const MATIZ_ID_SET = new Set<string>(ALL_MATIZ_IDS);

export function allMatizChallengeIds(): string[] {
  return [...ALL_MATIZ_IDS];
}

/**
 * Lee la selección guardada en este navegador. Un valor inexistente o vacío
 * significa "todo el catálogo" para mantener compatibles las salas antiguas.
 */
export function readMatizEnabledChallengeIds(): string[] {
  if (typeof window === 'undefined') return allMatizChallengeIds();

  try {
    const parsed: unknown = JSON.parse(
      window.localStorage.getItem(MATIZ_ENABLED_IDS_STORAGE_KEY) ?? 'null',
    );
    if (!Array.isArray(parsed)) return allMatizChallengeIds();

    const validIds = parsed.filter(
      (id): id is string => typeof id === 'string' && MATIZ_ID_SET.has(id),
    );
    return validIds.length > 0 ? [...new Set(validIds)] : allMatizChallengeIds();
  } catch {
    return allMatizChallengeIds();
  }
}

export function writeMatizEnabledChallengeIds(ids: readonly string[]): void {
  if (typeof window === 'undefined') return;

  const validIds = ALL_MATIZ_IDS.filter((id) => ids.includes(id));
  if (validIds.length === 0) {
    window.localStorage.removeItem(MATIZ_ENABLED_IDS_STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(MATIZ_ENABLED_IDS_STORAGE_KEY, JSON.stringify(validIds));
}
