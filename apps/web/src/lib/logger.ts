// Logger mínimo del cliente. Contrato P17 ("NO HAGAS: no muestres nunca
// INTERNAL ni trazas técnicas al jugador. Registra y enseña un texto
// humano"): esto es el "registra" -- la única salida de consola permitida
// en apps/web (igual que apps/server/src/logger.ts es la única del
// servidor). Solo lo usa `error.tsx` (límite de errores de React) para
// dejar constancia del fallo real sin enseñárselo al jugador.
export function logClientError(msg: string, error: unknown): void {
  console.error(`[ronda] ${msg}`, error);
}
