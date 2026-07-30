// Detección de caída prolongada del servidor. Contrato P17: "Fallo del
// servidor (5xx o socket caído más de 30 s) -> pantalla de error con botón
// de reintento". El estado de conexión de store.ts ya distingue
// online/reconnecting/offline (P12), pero "reconnecting" por sí solo no
// dice CUÁNTO llevamos así: socket.io reintenta indefinidamente con backoff
// (250ms -> 8s), así que una caída de red de 2 segundos y una caída real de
// 5 minutos se ven igual en `connection`. Esta función añade el umbral de
// tiempo que decide cuándo una reconexión en curso pasa de "banda dorada,
// transparente" a "pantalla de error a pantalla completa".
//
// Aislado en su propia función pura (sin tocar el socket) para poder
// testear el umbral con temporizadores falsos sin depender de una conexión
// de socket.io real ni de vi.useFakeTimers afectando al reintento real.
export const SERVER_DOWN_MS = 30_000;

export interface ServerDownWatcher {
  /** Llamar cuando la conexión deja de estar online (reconectando o caída). */
  disconnected(): void;
  /** Llamar cuando la conexión vuelve a online. Cancela el aviso pendiente. */
  reconnected(): void;
  /** Solo para tests: libera el temporizador sin disparar el callback. */
  dispose(): void;
}

/**
 * Arranca un temporizador de `thresholdMs` la primera vez que se llama a
 * `disconnected()`; si no ha llegado `reconnected()` antes de que cumpla,
 * invoca `onDown(true)`. `reconnected()` cancela el temporizador y siempre
 * invoca `onDown(false)` (idempotente: no pasa nada si no había ninguno
 * pendiente). Llamar dos veces seguidas a `disconnected()` sin una
 * reconexión de por medio NO reinicia el reloj -- igual que el contrato no
 * dice "30s desde el último intento fallido", sino "socket caído más de
 * 30s" en total.
 */
export function createServerDownWatcher(
  onDown: (down: boolean) => void,
  thresholdMs: number = SERVER_DOWN_MS,
): ServerDownWatcher {
  let timer: ReturnType<typeof setTimeout> | null = null;

  return {
    disconnected() {
      if (timer) return;
      timer = setTimeout(() => {
        timer = null;
        onDown(true);
      }, thresholdMs);
    },
    reconnected() {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      onDown(false);
    },
    dispose() {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
    },
  };
}
