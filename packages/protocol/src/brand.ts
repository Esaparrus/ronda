// Marca de la app. El nombre se cambia en un solo sitio (00-MASTER.md §0).
export const APP_NAME = 'Ronda';

/**
 * Fichas-objeto disponibles para identificar a cada persona en los tableros.
 * La lista es cerrada para que el servidor nunca tenga que reenviar texto o
 * emoji arbitrario introducido por un cliente.
 */
export const PLAYER_TOKEN_ICONS = ['🎲', '🗝️', '🧭', '🍀', '🪶', '🔔', '🏺', '🧩'] as const;
export type PlayerTokenIcon = (typeof PLAYER_TOKEN_ICONS)[number];
export const DEFAULT_PLAYER_TOKEN_ICON: PlayerTokenIcon = PLAYER_TOKEN_ICONS[0];

export function isPlayerTokenIcon(value: unknown): value is PlayerTokenIcon {
  return PLAYER_TOKEN_ICONS.includes(value as PlayerTokenIcon);
}
