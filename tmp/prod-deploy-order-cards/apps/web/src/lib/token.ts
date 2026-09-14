// Guarda/lee/borra el token de jugador en localStorage. Contrato P12 / §6:
// "El cliente lo guarda en localStorage bajo ronda.token.<ROOMCODE>."
//
// Se comprueba el global `localStorage` a pelo (sin pasar por `window`):
// `typeof localStorage` no lanza aunque el identificador no exista (SSR,
// tests en Node), y así el mismo chequeo sirve tanto si no hay DOM en
// absoluto como si lo hay pero el storage está deshabilitado.
import type { RoomCode } from '@ronda/protocol';

const PREFIX = 'ronda.token.';

function hasStorage(): boolean {
  return typeof localStorage !== 'undefined';
}

/** Guarda el token de sesión de una sala. */
export function saveToken(roomCode: RoomCode, token: string): void {
  if (!hasStorage()) return;
  localStorage.setItem(PREFIX + roomCode, token);
}

/** Lee el token guardado para una sala, o null si no hay ninguno. */
export function getToken(roomCode: RoomCode): string | null {
  if (!hasStorage()) return null;
  return localStorage.getItem(PREFIX + roomCode);
}

/** Borra el token guardado de una sala (abandono, sala cerrada...). */
export function clearToken(roomCode: RoomCode): void {
  if (!hasStorage()) return;
  localStorage.removeItem(PREFIX + roomCode);
}

/**
 * Códigos de sala con token guardado, para la portada ("Volver a la
 * partida X"). Contrato §7 (ruta `/`).
 */
export function listSavedRooms(): RoomCode[] {
  if (!hasStorage()) return [];
  const codes: RoomCode[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(PREFIX)) {
      codes.push(key.slice(PREFIX.length));
    }
  }
  return codes;
}
