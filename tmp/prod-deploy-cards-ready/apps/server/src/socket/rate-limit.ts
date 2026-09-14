// Limitador de ritmo por socket. Contrato §6 / P8.
//
// 20 mensajes / 10 segundos por socket, ventana deslizante. Al superarlo, se
// ignora el excedente (el handler responde RATE_LIMITED por el ack).

const MAX_MESSAGES = 20;
const WINDOW_MS = 10_000;

/** Un limitador por socketId. Reutilizable: take() decide si admitir el mensaje. */
export class RateLimiter {
  private timestamps = new Map<string, number[]>();

  /** ¿Se admite este mensaje? Devuelve true si está dentro del límite. */
  take(socketId: string, now: number): boolean {
    const arr = this.timestamps.get(socketId) ?? [];
    const cutoff = now - WINDOW_MS;
    const fresh = arr.filter((t) => t > cutoff);
    if (fresh.length >= MAX_MESSAGES) {
      this.timestamps.set(socketId, fresh);
      return false;
    }
    fresh.push(now);
    this.timestamps.set(socketId, fresh);
    return true;
  }

  /** Limpia el estado de un socket desconectado. */
  forget(socketId: string): void {
    this.timestamps.delete(socketId);
  }
}
