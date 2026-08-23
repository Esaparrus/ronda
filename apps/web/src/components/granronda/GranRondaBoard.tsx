import type {
  GranRondaBoardPlayer,
  GranRondaBoardSpace,
  GranRondaSpaceType,
  PublicPlayer,
} from '@ronda/protocol';

export interface GranRondaBoardProps {
  board: GranRondaBoardSpace[];
  boardPlayers: GranRondaBoardPlayer[];
  players: PublicPlayer[];
  stampSpaceId: string;
  compact?: boolean;
}

const SPACE_STYLES: Record<GranRondaSpaceType, string> = {
  start: 'border-white/35 bg-white/10 text-hueso',
  oros: 'border-oro/45 bg-oro/12 text-oro',
  perdida: 'border-brasa/35 bg-brasa/10 text-brasa',
  sello: 'border-verde/40 bg-verde/10 text-verde',
  evento: 'border-azul/35 bg-azul/10 text-azul',
  atajo: 'border-violeta/35 bg-violeta/10 text-violeta',
};

const SPACE_LABELS: Record<GranRondaSpaceType, string> = {
  start: 'Salida',
  oros: 'Oros',
  perdida: 'Pérdida',
  sello: 'Sello',
  evento: 'Evento',
  atajo: 'Atajo',
};

export function GranRondaBoard({
  board,
  boardPlayers,
  players,
  stampSpaceId,
  compact = false,
}: GranRondaBoardProps) {
  return (
    <section
      className={`grid grid-cols-2 gap-2 sm:grid-cols-4 ${compact ? 'xl:grid-cols-5' : 'xl:grid-cols-5'}`}
      aria-label="Tablero de La Gran Ronda"
    >
      {board.map((space) => {
        const occupants = boardPlayers.filter((player) => player.position === space.id);
        const stamp = space.id === stampSpaceId;
        return (
          <div
            key={space.id}
            className={`min-h-[78px] rounded-[18px] border p-2.5 ${SPACE_STYLES[space.type]} ${
              stamp ? 'ring-2 ring-oro/60 ring-offset-2 ring-offset-tinta' : ''
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <span className="font-mono text-10 opacity-70">{String(space.index + 1).padStart(2, '0')}</span>
              <span className="text-10 font-semibold uppercase tracking-[0.08em]">
                {SPACE_LABELS[space.type]}
              </span>
            </div>
            <p className="mt-2 line-clamp-2 text-12 font-semibold leading-tight text-hueso">
              {space.label}
            </p>
            <div className="mt-2 flex min-h-5 flex-wrap gap-1" aria-label="Jugadores en la casilla">
              {occupants.map((occupant) => {
                const player = players.find((candidate) => candidate.playerId === occupant.playerId);
                return (
                  <span
                    key={occupant.playerId}
                    title={player?.nick ?? 'Jugador'}
                    className="grid size-5 place-items-center rounded-full bg-tinta/75 text-10 font-bold text-hueso"
                  >
                    {(player?.nick ?? '?').slice(0, 1).toUpperCase()}
                  </span>
                );
              })}
            </div>
          </div>
        );
      })}
    </section>
  );
}
