// Banda de encabezado de la mesa (P32, contrato §8.6). Sustituye a la fila
// de jugadores con hilo de turno de P14: ahora los jugadores están sentados
// alrededor de la mesa, así que aquí solo queda de quién es el turno.
//
// En el diseño, el hueco de la izquierda lo ocupaban las pestañas
// Chinchón/Pocha/Mus. Eso era andamiaje del lienzo para poder ver los tres
// juegos sin partida: en la app la sala YA sabe a qué se juega, así que en
// su lugar va el dato que sí cambia durante la partida (la ronda).
export interface TableHeaderProps {
  /** Texto de la izquierda: la ronda, el lance, el tamaño de la mano... */
  left: string;
  /** Apodo de quien tiene el turno, o null si no hay turno ahora mismo. */
  turnNick: string | null;
  /** Cuenta atrás formateada, o null cuando la sala juega sin tiempo. */
  timerLabel?: string | null;
  /** Cuando quedan pocos segundos, se resalta para llamar la atención. */
  timerUrgent?: boolean;
  /** Presenta el número de segundos grande, para la ventana de presión de Banderas. */
  timerVariant?: 'default' | 'countdown';
  /** Fracción de tiempo que queda, entre 0 y 1, para la barra visual. */
  timerProgress?: number | null;
  /** Mensaje puntual de estado, por ejemplo "Te has pasado". */
  statusLabel?: string | null;
  /** Tono visual del mensaje puntual. */
  statusTone?: 'calm' | 'critical';
}

export function TableHeader({
  left,
  turnNick,
  timerLabel,
  timerUrgent = false,
  timerVariant = 'default',
  timerProgress = null,
  statusLabel = null,
  statusTone = 'calm',
}: TableHeaderProps) {
  const timerTone = timerUrgent
    ? 'critical'
    : timerProgress !== null && timerProgress <= 0.4
      ? 'warning'
      : 'calm';

  return (
    <header className="liquid-glass liquid-glass--strong shrink-0 border-x-0 border-t-0 px-4 py-2.5">
      <div className="flex min-w-0 items-center justify-between gap-3">
        <span className="shrink-0 font-mono text-12 uppercase leading-none tracking-wider text-humo">
          {left}
        </span>
        <div className="flex min-w-0 items-center justify-end gap-3">
          {statusLabel ? (
            <span
              aria-live="polite"
              className={`truncate font-mono text-12 uppercase leading-none tracking-wider ${
                statusTone === 'critical' ? 'text-brasa' : 'text-oro'
              }`}
            >
              {statusLabel}
            </span>
          ) : null}
          {timerLabel ? (
            <div
              className={`flex shrink-0 items-center gap-1.5 rounded-full border ${
                timerVariant === 'countdown' ? 'min-w-14 justify-center px-3 py-1' : 'px-2.5 py-1'
              } ${
                timerTone === 'critical'
                  ? 'border-brasa bg-brasa/15'
                  : timerTone === 'warning'
                    ? 'border-alerta/70 bg-alerta/10'
                    : 'border-linea bg-tinta/30'
              }`}
              aria-label={`Tiempo restante: ${timerLabel}${timerVariant === 'countdown' ? ' segundos' : ''}`}
            >
              <span
                aria-hidden="true"
                className={`h-1.5 w-1.5 rounded-full ${
                  timerTone === 'critical'
                    ? 'bg-brasa'
                    : timerTone === 'warning'
                      ? 'bg-alerta'
                      : 'bg-oro'
                }`}
              />
              <span
                className={`font-mono leading-none ${
                  timerVariant === 'countdown'
                    ? 'text-24 font-bold tracking-normal'
                    : 'text-12 uppercase tracking-wider'
                } ${
                  timerTone === 'critical'
                    ? 'text-brasa'
                    : timerTone === 'warning'
                      ? 'text-alerta'
                      : 'text-humo'
                }`}
              >
                {timerLabel}
              </span>
            </div>
          ) : null}
          {turnNick ? (
            <span className="truncate font-mono text-12 uppercase leading-none tracking-wider text-oro">
              Turno de {turnNick}
            </span>
          ) : null}
        </div>
      </div>
      {timerLabel ? (
        <div
          role="progressbar"
          aria-label={`Tiempo restante: ${timerLabel}${timerVariant === 'countdown' ? ' segundos' : ''}`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round((timerProgress ?? 0) * 100)}
          className="timer-track mt-2 h-2 w-full overflow-hidden rounded-full"
        >
          <div
            className={`h-full rounded-full transition-[width] duration-300 ease-linear ${
              timerTone === 'critical'
                ? 'timer-fill-critical'
                : timerTone === 'warning'
                  ? 'timer-fill-warning'
                  : 'timer-fill'
            }`}
            style={{ width: `${Math.max(0, Math.min(1, timerProgress ?? 0)) * 100}%` }}
          />
        </div>
      ) : null}
    </header>
  );
}
