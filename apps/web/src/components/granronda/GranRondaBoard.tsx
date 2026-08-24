import type {
  GranRondaBoardPlayer,
  GranRondaBoardSpace,
  GranRondaMovementPublic,
  GranRondaSpaceType,
  PlayerId,
  PublicPlayer,
} from '@ronda/protocol';
import { GranRondaDiceOverlay } from './GranRondaDiceOverlay';

export interface GranRondaBoardProps {
  board: GranRondaBoardSpace[];
  boardPlayers: GranRondaBoardPlayer[];
  players: PublicPlayer[];
  stampSpaceId: string;
  routeOptions?: string[];
  activePlayerId?: PlayerId | null;
  movement?: GranRondaMovementPublic | null;
  compact?: boolean;
  onSpaceSelect?: (spaceId: string) => void;
}

const SPACE_STYLES: Record<GranRondaSpaceType, string> = {
  start: 'border-white/60 bg-white text-tinta',
  oros: 'border-oro bg-oro text-tinta',
  perdida: 'border-brasa bg-brasa text-hueso',
  sello: 'border-verde bg-verde text-tinta',
  evento: 'border-azul bg-azul text-hueso',
  atajo: 'border-violeta bg-violeta text-hueso',
  doble: 'border-rosa bg-rosa text-tinta',
  penalizacion: 'border-brasa/80 bg-brasa/90 text-hueso',
  tienda: 'border-violeta/80 bg-violeta/90 text-hueso',
};

const SPACE_GLYPHS: Record<GranRondaSpaceType, string> = {
  start: 'S',
  oros: 'O',
  perdida: '−',
  sello: '✦',
  evento: '?',
  atajo: '↗',
  doble: '2×',
  penalizacion: '!',
  tienda: '$',
};

const PLAYER_STYLES = [
  'bg-azul text-hueso ring-azul/50',
  'bg-brasa text-hueso ring-brasa/50',
  'bg-verde text-tinta ring-verde/50',
  'bg-violeta text-hueso ring-violeta/50',
  'bg-oro text-tinta ring-oro/50',
  'bg-gris text-hueso ring-gris/50',
  'bg-rosa text-tinta ring-rosa/50',
  'bg-hueso text-tinta ring-hueso/50',
];

function pieceOffset(index: number, total: number): { x: number; y: number } {
  const spread = Math.min(2.8, total > 1 ? 2 : 0);
  return { x: (index - (total - 1) / 2) * spread, y: index % 2 === 0 ? 2.5 : -2.5 };
}

export function GranRondaBoard({
  board,
  boardPlayers,
  players,
  stampSpaceId,
  routeOptions = [],
  activePlayerId = null,
  movement = null,
  compact = false,
  onSpaceSelect,
}: GranRondaBoardProps) {
  const positions = new Map(board.map((space) => [space.id, space]));
  const routeSet = new Set(routeOptions);
  const activePlayer = players.find((player) => player.playerId === activePlayerId);
  const interactive = routeOptions.length > 0 && onSpaceSelect !== undefined;

  return (
    <section className="flex flex-col gap-2" aria-label="Mapa de La Gran Ronda">
      <div
        className={`relative isolate overflow-hidden rounded-[26px] border border-white/20 bg-gradient-to-br from-azul/25 via-tinta to-verde/10 shadow-[0_20px_60px_rgba(0,0,0,0.22)] ${compact ? 'aspect-[0.96] sm:aspect-[1.12]' : 'aspect-[1.04]'}`}
      >
        <svg
          className="absolute inset-0 size-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="gran-ronda-field" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="rgba(91, 144, 131, 0.28)" />
              <stop offset="0.5" stopColor="rgba(23, 32, 43, 0.28)" />
              <stop offset="1" stopColor="rgba(78, 143, 116, 0.24)" />
            </linearGradient>
          </defs>
          <rect width="100" height="100" fill="url(#gran-ronda-field)" />
          <path d="M-5 15 C 20 4, 34 24, 52 13 S 84 4, 108 18" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="9" />
          <path d="M-8 94 C 18 76, 31 93, 52 84 S 80 76, 110 91" fill="none" stroke="rgba(18,30,38,0.28)" strokeWidth="10" />
          <path d="M10 20 C 29 30, 25 52, 39 55 S 61 40, 91 21" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1.2" strokeDasharray="1 3" />
          <circle cx="12" cy="20" r="8" fill="rgba(255,255,255,0.06)" />
          <circle cx="91" cy="83" r="10" fill="rgba(255,255,255,0.05)" />
          <path d="M68 8 l3 7 7 3 -7 3 -3 7 -3-7 -7-3 7-3z" fill="rgba(255,255,255,0.16)" />

          {board.flatMap((space) =>
            space.nextIds.flatMap((nextId) => {
              const next = positions.get(nextId);
              if (!next || space.index > next.index && next.nextIds.includes(space.id)) return [];
              const highlighted = routeSet.has(space.id) || routeSet.has(next.id);
              return (
                <g key={`${space.id}-${next.id}`}>
                  <line
                    x1={space.x}
                    y1={space.y}
                    x2={next.x}
                    y2={next.y}
                    stroke="rgba(17, 27, 35, 0.58)"
                    strokeWidth={highlighted ? 5.4 : 4.8}
                    strokeLinecap="round"
                  />
                  <line
                    x1={space.x}
                    y1={space.y}
                    x2={next.x}
                    y2={next.y}
                    stroke={highlighted ? 'rgba(246, 195, 76, 0.92)' : 'rgba(246, 237, 211, 0.88)'}
                    strokeWidth={highlighted ? 2.4 : 1.8}
                    strokeLinecap="round"
                    strokeDasharray={highlighted ? '0' : '0.4 1.7'}
                  />
                </g>
              );
            }),
          )}
        </svg>

        <div className="absolute inset-0">
          <div className="pointer-events-none absolute left-3 top-3 rounded-full border border-white/15 bg-tinta/35 px-2.5 py-1 backdrop-blur-sm">
            <p className="font-mono text-9 uppercase tracking-[0.18em] text-hueso/75">Mapa de la Ronda</p>
          </div>
          {movement && activePlayer ? (
            <div className="pointer-events-none absolute right-3 top-3 flex items-center gap-2 rounded-full border border-oro/40 bg-tinta/60 px-2.5 py-1 backdrop-blur-sm">
              <span className="font-mono text-9 uppercase tracking-[0.16em] text-humo">Dado</span>
              <strong className="grid size-6 place-items-center rounded-lg bg-hueso font-mono text-13 text-tinta">{movement.roll}</strong>
              <span className="max-w-24 truncate text-11 text-hueso">{activePlayer.nick}</span>
            </div>
          ) : null}

          {board.map((space) => {
            const isOption = routeSet.has(space.id);
            const stamp = space.id === stampSpaceId;
            return (
              <button
                key={space.id}
                type="button"
                disabled={!interactive || !isOption}
                onClick={() => onSpaceSelect?.(space.id)}
                title={`${space.label} · ${space.type}`}
                aria-label={`${space.label}, casilla ${space.index + 1}${isOption ? ', elegir este camino' : ''}`}
                className={`absolute flex -translate-x-1/2 -translate-y-1/2 items-center rounded-full transition-transform duration-200 ${isOption ? 'z-20 scale-110 cursor-pointer' : 'z-10'} ${interactive && !isOption ? 'cursor-default' : ''}`}
                style={{ left: `${space.x}%`, top: `${space.y}%` }}
              >
                <span
                  className={`relative grid ${compact ? 'size-[1.8rem] sm:size-9' : 'size-9 sm:size-10'} place-items-center rounded-full border-2 shadow-[0_4px_12px_rgba(0,0,0,0.25)] ${SPACE_STYLES[space.type]} ${
                    stamp ? 'ring-2 ring-oro ring-offset-2 ring-offset-transparent' : ''
                  } ${isOption ? 'animate-pulse ring-4 ring-oro/65 ring-offset-2 ring-offset-tinta/20' : ''}`}
                >
                  <span className="font-display text-10 sm:text-12">{SPACE_GLYPHS[space.type]}</span>
                  <span className="absolute -bottom-1 -right-1 grid min-w-3.5 place-items-center rounded-full border border-tinta/15 bg-hueso px-0.5 font-mono text-[7px] leading-3 text-tinta shadow-sm">
                    {String(space.index + 1).padStart(2, '0')}
                  </span>
                </span>
              </button>
            );
          })}

          <div className="pointer-events-none absolute inset-0 z-30" role="group" aria-label="Fichas de jugadores">
            {boardPlayers.map((occupant) => {
              const space = positions.get(occupant.position);
              if (!space) return null;
              const occupants = boardPlayers.filter((player) => player.position === occupant.position);
              const occupantIndex = occupants.findIndex((player) => player.playerId === occupant.playerId);
              const player = players.find((candidate) => candidate.playerId === occupant.playerId);
              const offset = pieceOffset(occupantIndex, occupants.length);
              const color = PLAYER_STYLES[player?.colorIndex ?? 0];
              const active = occupant.playerId === activePlayerId;
              return (
                <span
                  key={occupant.playerId}
                  title={player?.nick ?? 'Jugador'}
                  className={`absolute grid size-5 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-hueso text-8 font-bold shadow-lg transition-[left,top] duration-500 ease-out ${color} ${active ? 'ring-2 ring-oro ring-offset-1 ring-offset-tinta' : ''}`}
                  style={{ left: `${space.x + offset.x}%`, top: `${space.y + offset.y}%` }}
                >
                  {(player?.nick ?? '?').slice(0, 1).toUpperCase()}
                </span>
              );
            })}
          </div>
          {movement && activePlayer ? (
            <GranRondaDiceOverlay movement={movement} playerName={activePlayer.nick} />
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Tipos de casilla">
          {(Object.keys(SPACE_STYLES) as GranRondaSpaceType[]).map((type) => (
            <span key={type} className="flex items-center gap-1 text-10 text-humo">
              <span className={`size-2 rounded-full ${SPACE_STYLES[type].split(' ')[1]}`} />
              {type === 'perdida'
                ? 'Pérdida'
                : type === 'evento'
                  ? 'Evento'
                  : type === 'atajo'
                    ? 'Atajo'
                    : type === 'sello'
                      ? 'Sello'
                      : type === 'oros'
                        ? 'Oros'
                        : type === 'doble'
                          ? 'Dado doble'
                          : type === 'penalizacion'
                            ? 'Penalización'
                            : type === 'tienda'
                              ? 'Tienda'
                              : 'Salida'}
            </span>
          ))}
        </div>
        {routeOptions.length > 0 ? <span className="font-mono text-10 uppercase tracking-[0.13em] text-oro">Elige una casilla iluminada</span> : null}
      </div>
    </section>
  );
}
