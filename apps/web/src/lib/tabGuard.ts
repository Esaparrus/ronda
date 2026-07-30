// Coordinación entre pestañas del mismo navegador para la misma sala.
// Contrato P17: "Doble pestaña con el mismo token -> la pestaña vieja se
// marca como inactiva y muestra «Estás jugando en otra pestaña»."
//
// Protocolo, vía BroadcastChannel (sin tocar el servidor: esto es un
// problema puramente local al navegador, dos pestañas de la MISMA sesión
// compartiendo el mismo `ronda.token.<ROOMCODE>` de localStorage):
//   1. Cada pestaña que monta la sala anuncia su `tabId` (aleatorio, uno
//      por montaje) al canal `ronda.tab.<ROOMCODE>`.
//   2. BroadcastChannel nunca entrega un mensaje a su propio emisor, así
//      que una pestaña nunca se "autodesactiva" al anunciarse.
//   3. Cualquier pestaña que ESCUCHA un anuncio de un `tabId` distinto del
//      suyo se marca inactiva a partir de ese momento -- por construcción,
//      solo se recibe un anuncio ajeno cuando otra pestaña se acaba de
//      abrir/montar después, así que "la última en anunciarse gana" y las
//      demás quedan inactivas. Deliberadamente no hay mensaje de vuelta ni
//      votación: es la regla más simple que cumple "la pestaña vieja se
//      marca inactiva", no una negociación general de liderazgo.
export interface TabGuard {
  dispose(): void;
}

function hasBroadcastChannel(): boolean {
  return typeof BroadcastChannel !== 'undefined';
}

/**
 * Empieza a vigilar duplicados para `roomCode`. Llama a `onInactive()` (una
 * sola vez, no se repite) en cuanto detecta que otra pestaña ha tomado el
 * relevo. Si el navegador no soporta BroadcastChannel, no hace nada -- es
 * una mejora de experiencia, no una garantía de seguridad (el servidor no
 * depende de esto para nada).
 */
export function startTabGuard(roomCode: string, onInactive: () => void): TabGuard {
  if (!hasBroadcastChannel()) {
    return { dispose() {} };
  }

  const tabId = crypto.randomUUID();
  const channel = new BroadcastChannel(`ronda.tab.${roomCode}`);
  let inactive = false;

  channel.onmessage = (event: MessageEvent<{ tabId: string }>) => {
    if (inactive) return;
    if (event.data.tabId !== tabId) {
      inactive = true;
      onInactive();
    }
  };

  channel.postMessage({ tabId });

  return {
    dispose() {
      channel.onmessage = null;
      channel.close();
    },
  };
}
