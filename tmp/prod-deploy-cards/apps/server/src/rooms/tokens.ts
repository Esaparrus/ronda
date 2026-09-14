// Tokens de jugador. Contrato §6.
//
// Token = 32 bytes aleatorios en base64url. El cliente lo guarda; el servidor
// solo almacena sha256(token). Así un compromiso de BD no expone sesiones.
import { createHash, randomBytes } from 'node:crypto';

/** Crea un token opaco de 32 bytes en base64url. */
export function createToken(): string {
  return randomBytes(32).toString('base64url');
}

/** Hash del token: sha256 hex. Lo que se persiste. */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
