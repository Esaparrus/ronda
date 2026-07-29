// Generación de códigos de sala. Contrato §2.1 / §6.
import { ROOM_CODE_ALPHABET, ROOM_CODE_LENGTH } from '@ronda/protocol';

/**
 * Genera un código de sala aleatorio de ROOM_CODE_LENGTH caracteres del
 * alfabeto sin ambigüedades. Reintenta hasta encontrar uno libre (comprobado
 * vía `isTaken`) con un máximo de 10 intentos; luego devuelve null (INTERNAL).
 *
 * Usa crypto.getRandomValues para entropía real (no Math.random).
 */
export function generateRoomCode(isTaken: (code: string) => boolean): string | null {
  const MAX_ATTEMPTS = 10;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const code = randomCode();
    if (!isTaken(code)) return code;
  }
  return null;
}

function randomCode(): string {
  const out: string[] = [];
  const buf = new Uint32Array(ROOM_CODE_LENGTH);
  crypto.getRandomValues(buf);
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
    const raw = buf[i];
    if (raw === undefined) continue;
    const idx = raw % ROOM_CODE_ALPHABET.length;
    out.push(ROOM_CODE_ALPHABET[idx] ?? 'A');
  }
  return out.join('');
}
