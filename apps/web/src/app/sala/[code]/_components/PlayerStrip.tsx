// Fila de jugadores + el hilo de turno (elemento firma, contrato §8.4): una
// línea de 2px en --brasa que viaja de un asiento al siguiente en 250ms
// ease-out (en vez de encenderse/apagarse). Se desactiva sola con
// prefers-reduced-motion vía la regla global de transition-duration en
// globals.css (P10): no hace falta comprobarlo aquí.
import type { ReactNode } from 'react';
import type { PlayerId, PublicPlayer } from '@ronda/protocol';
import { Avatar } from '@/components/ui/Avatar';

/** Colores propios de los equipos: no reutilizan el azul, oro ni los colores de estado. */
const GROUP_ACCENTS = [
  {
    name: 'Turquesa',
    section: 'border-equipo-turquesa/55 bg-equipo-turquesa/10',
    label: 'text-equipo-turquesa-oscuro',
    active: 'bg-equipo-turquesa/15 ring-equipo-turquesa',
    marker: 'bg-equipo-turquesa',
  },
  {
    name: 'Fucsia',
    section: 'border-equipo-fucsia/55 bg-equipo-fucsia/10',
    label: 'text-equipo-fucsia-oscuro',
    active: 'bg-equipo-fucsia/15 ring-equipo-fucsia',
    marker: 'bg-equipo-fucsia',
  },
  {
    name: 'Lima',
    section: 'border-equipo-lima/55 bg-equipo-lima/10',
    label: 'text-equipo-lima-oscuro',
    active: 'bg-equipo-lima/15 ring-equipo-lima',
    marker: 'bg-equipo-lima',
  },
] as const;

export interface PlayerStripProps {
  players: PublicPlayer[];
  turnPlayerId: PlayerId | null;
  myPlayerId: PlayerId;
  /**
   * Qué se pinta bajo cada apodo. Por defecto, "cartas · puntos", que es lo
   * que dicen Chinchón y Pocha. Mus necesita otra cosa: ahí `score` va
   * siempre a 0 porque puntúa la pareja (§12.12) y enseñar un 0 sería
   * mentir. Mismo mecanismo que `renderBadge` de SeatRing en /mesa.
   */
  renderInfo?: (player: PublicPlayer) => ReactNode;
  /** Jugadores que han superado 7,5 y deben quedar marcados en rojo. */
  alertPlayerIds?: readonly PlayerId[];
  /**
   * Resumen de grupos para Escala. Cuando existe, la franja deja de mezclar
   * jugadores por asiento y los presenta dentro de su grupo correspondiente.
   */
  groups?: readonly { index: number; score: number }[];
  /** Clase opcional para ajustar el espacio de una pantalla de partida. */
  className?: string;
}

export function PlayerStrip({
  players,
  turnPlayerId,
  myPlayerId,
  renderInfo,
  alertPlayerIds = [],
  groups,
  className = '',
}: PlayerStripProps) {
  const ordered = [...players].sort((a, b) => a.seat - b.seat);
  const seatCount = Math.max(ordered.length, 1);
  const turnIndex = turnPlayerId ? ordered.findIndex((p) => p.playerId === turnPlayerId) : -1;
  const alertPlayerSet = new Set(alertPlayerIds);
  const grouped = groups !== undefined && groups.length > 0;

  return (
    <div
      className={`relative border-b border-linea bg-tinta/30 shadow-inner ${className}`}
      aria-label={grouped ? 'Jugadores agrupados por equipos' : 'Jugadores'}
    >
      {grouped ? (
        <div
          className="grid gap-1.5 px-2 py-1"
          style={{ gridTemplateColumns: `repeat(${groups.length}, minmax(0, 1fr))` }}
        >
          {groups.map((group) => {
            const members = ordered.filter((player) => player.groupIndex === group.index);
            const accent = GROUP_ACCENTS[group.index % GROUP_ACCENTS.length] ?? GROUP_ACCENTS[0];
            return (
              <section
                key={group.index}
                aria-label={`Grupo ${accent.name}, ${group.score} puntos`}
                className={`min-w-0 overflow-hidden rounded-xl border p-1 ${accent.section}`}
              >
                <header className="flex min-w-0 items-center justify-between gap-1 px-1 py-0.5">
                  <span
                    className={`flex min-w-0 items-center gap-1 truncate text-[9px] font-semibold uppercase leading-none tracking-wide ${accent.label}`}
                  >
                    <span
                      aria-hidden="true"
                      className={`size-1.5 shrink-0 rounded-full ${accent.marker}`}
                    />
                    <span className="truncate">Grupo {accent.name}</span>
                  </span>
                  <span
                    className={`whitespace-nowrap font-mono text-[9px] leading-none ${accent.label}`}
                  >
                    {group.score} pt
                  </span>
                </header>
                <div className="grid min-w-0 grid-flow-col auto-cols-fr gap-0.5">
                  {members.map((p) => {
                    const isAlert = alertPlayerSet.has(p.playerId);
                    const isTurn = p.playerId === turnPlayerId;
                    return (
                      <div
                        key={p.playerId}
                        title={`${p.nick}${p.playerId === myPlayerId ? ' (tú)' : ''}`}
                        className={`flex min-w-0 flex-col items-center gap-0.5 rounded-lg px-0.5 py-0.5 transition-colors ${
                          isTurn ? `ring-1 ring-inset ${accent.active}` : ''
                        } ${isAlert ? 'bg-brasa/10 ring-1 ring-inset ring-brasa/60' : ''}`}
                      >
                        <Avatar
                          name={p.nick}
                          colorIndex={p.colorIndex}
                          size={22}
                          className={`${p.connected ? '' : 'opacity-40'} ${isAlert ? 'grayscale opacity-80' : ''}`}
                        />
                        <span
                          className={`max-w-full truncate text-[9px] leading-none ${
                            isAlert ? 'text-brasa' : 'text-hueso'
                          }`}
                        >
                          {p.nick}
                          {p.playerId === myPlayerId ? ' (tú)' : ''}
                        </span>
                        {isTurn ? (
                          <span className={`text-[9px] uppercase ${accent.label}`}>Pista</span>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        <div className="relative flex gap-1 px-2 py-2">
          {ordered.map((p) => {
            const isAlert = alertPlayerSet.has(p.playerId);
            return (
              <div
                key={p.playerId}
                className={`flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl px-1 py-1.5 transition-colors ${
                  p.playerId === turnPlayerId ? 'bg-mesa/75' : ''
                } ${isAlert ? 'bg-brasa/10 ring-1 ring-inset ring-brasa/60' : ''}`}
              >
                <Avatar
                  name={p.nick}
                  colorIndex={p.colorIndex}
                  size={32}
                  className={`${p.connected ? '' : 'opacity-40'} ${isAlert ? 'grayscale opacity-80' : ''}`}
                />
                <span
                  className={`max-w-full truncate text-12 ${isAlert ? 'text-brasa' : 'text-hueso'}`}
                >
                  {p.nick}
                  {p.playerId === myPlayerId ? ' (tú)' : ''}
                </span>
                <span className={`font-mono text-12 ${isAlert ? 'text-brasa' : 'text-humo'}`}>
                  {renderInfo ? renderInfo(p) : `${p.handCount} · ${p.score}`}
                </span>
              </div>
            );
          })}
          {turnIndex >= 0 ? (
            <div
              aria-hidden="true"
              className="absolute bottom-0 h-1 rounded-full bg-oro shadow-md"
              style={{
                width: `${100 / seatCount}%`,
                left: `${(turnIndex / seatCount) * 100}%`,
                transition: 'left 250ms ease-out',
              }}
            />
          ) : null}
        </div>
      )}
    </div>
  );
}
