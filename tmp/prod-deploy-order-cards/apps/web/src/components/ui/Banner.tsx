// Banda de estado de conexión, 4px arriba. Contrato §8.5.5 (literal):
// "verde translúcido conectado, --oro reconectando, --brasa sin conexión".
export type ConnectionStatus = 'online' | 'reconnecting' | 'offline';

export interface BannerProps {
  status: ConnectionStatus;
  className?: string;
}

const STATUS_CLASSES: Record<ConnectionStatus, string> = {
  online: 'bg-verde/40',
  reconnecting: 'bg-oro',
  offline: 'bg-brasa',
};

const STATUS_LABELS: Record<ConnectionStatus, string> = {
  online: 'Conectado',
  reconnecting: 'Reconectando',
  offline: 'Sin conexión',
};

// Contrato P17 (literal): "cartel «Sin conexión. Reintentando…»". La banda
// de 4px (arriba) y el cartel de texto (aquí) son dos elementos distintos
// según el propio texto del contrato -- "banda ... y cartel ..." -- así que
// el cartel se añade debajo de la banda, no reemplazándola. No hay texto
// para 'online': el cartel solo aparece mientras hay algún problema de
// conexión, tal como pide "acciones bloqueadas" (aquí, además, visibles).
const NOTICE_TEXT: Partial<Record<ConnectionStatus, string>> = {
  reconnecting: 'Sin conexión. Reintentando…',
  offline: 'Sin conexión.',
};

/**
 * Banda fija de 4px en la parte superior de la pantalla, más un cartel de
 * texto cuando la conexión no está sana. El llamador la monta una sola vez
 * por pantalla (no está posicionada `fixed` internamente para poder
 * reutilizarla también dentro de layouts que ya controlan su propio
 * posicionamiento, p.ej. `/mesa`).
 */
export function Banner({ status, className = '' }: BannerProps) {
  const notice = NOTICE_TEXT[status];
  return (
    <div className={className}>
      <div
        role="status"
        aria-label={STATUS_LABELS[status]}
        className={`h-1 w-full ${STATUS_CLASSES[status]}`}
      />
      {notice ? (
        <p className="bg-mesa px-3 py-1 text-center text-12 font-medium text-hueso" role="status">
          {notice}
        </p>
      ) : null}
    </div>
  );
}
