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
}

export function TableHeader({ left, turnNick }: TableHeaderProps) {
  return (
    <div className="flex items-center justify-between border-b-2 border-linea bg-mesa px-4 py-2">
      <span className="font-mono text-12 uppercase leading-none tracking-wider text-humo">
        {left}
      </span>
      {turnNick ? (
        <span className="font-mono text-12 uppercase leading-none tracking-wider text-oro">
          Turno de {turnNick}
        </span>
      ) : null}
    </div>
  );
}
