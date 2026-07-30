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

/**
 * Banda fija de 4px en la parte superior de la pantalla. El llamador la
 * monta una sola vez por pantalla (no está posicionada `fixed` internamente
 * para poder reutilizarla también dentro de layouts que ya controlan su
 * propio posicionamiento, p.ej. `/mesa`).
 */
export function Banner({ status, className = '' }: BannerProps) {
  return (
    <div
      role="status"
      aria-label={STATUS_LABELS[status]}
      className={`h-1 w-full ${STATUS_CLASSES[status]} ${className}`}
    />
  );
}
