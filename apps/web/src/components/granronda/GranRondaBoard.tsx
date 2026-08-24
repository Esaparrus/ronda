import type { CSSProperties } from 'react';
import {
  DEFAULT_PLAYER_TOKEN_ICON,
  PLAYER_TOKEN_ICONS,
  type GranRondaBoardPlayer,
  type GranRondaBoardSpace,
  type GranRondaMovementPublic,
  type GranRondaSpaceType,
  type PlayerId,
  type PublicPlayer,
} from '@ronda/protocol';
import { GranRondaDiceOverlay } from './GranRondaDiceOverlay';
import { GranRondaSpaceIcon } from './GranRondaSpaceIcon';

export interface GranRondaBoardProps {
  board: GranRondaBoardSpace[];
  boardPlayers: GranRondaBoardPlayer[];
  players: PublicPlayer[];
  stampSpaceId: string;
  routeOptions?: string[];
  activePlayerId?: PlayerId | null;
  movement?: GranRondaMovementPublic | null;
  compact?: boolean;
  minimized?: boolean;
  onSpaceSelect?: (spaceId: string) => void;
}

interface SpaceMeta {
  label: string;
  effect: string;
}

const SPACE_META: Record<GranRondaSpaceType, SpaceMeta> = {
  start: { label: 'Salida', effect: 'Punto de vuelta' },
  oros: { label: 'Oros', effect: '+3 Oros' },
  perdida: { label: 'Pérdida', effect: '−2 Oros' },
  sello: { label: 'Plaza de Sello', effect: 'Compra por 8 Oros' },
  evento: { label: 'Suerte', effect: '+1 Oro' },
  atajo: { label: 'Atajo', effect: '+2 Oros' },
  doble: { label: 'Dado doble', effect: 'Guarda 2 dados' },
  penalizacion: { label: 'Penalización', effect: 'Rival −2 Oros' },
  tienda: { label: 'Tienda', effect: 'Compra poderes' },
};

const LEGEND_ORDER: GranRondaSpaceType[] = [
  'oros',
  'perdida',
  'evento',
  'atajo',
  'doble',
  'penalizacion',
  'tienda',
  'sello',
];

const PLAYER_COLORS = [
  'var(--seat-0)',
  'var(--seat-1)',
  'var(--seat-2)',
  'var(--seat-3)',
  'var(--seat-4)',
  'var(--seat-5)',
  'var(--seat-6)',
  'var(--seat-7)',
];

/** Curvas suaves solo en los desvíos; mantienen cada ramal en su carril. */
const EDGE_CURVES: Record<string, number> = {
  'plaza-oros-senda-bastos': 2.5,
  'mercado-bastos-union-bastos': -2,
  'bifurcacion-azul-camino-riesgo': 2.5,
  'desvio-riesgo-puente-comun': -3,
  'plaza-espadas-sendero-copas': -2.5,
  'fuente-sello-curva-bastos': 2,
};

function pieceOffset(index: number, total: number): { x: number; y: number } {
  if (total <= 1) return { x: 0, y: -3.8 };
  const angle = (-90 + (index * 360) / total) * (Math.PI / 180);
  const radius = total > 4 ? 4.6 : 4.1;
  return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
}

function edgePath(from: GranRondaBoardSpace, to: GranRondaBoardSpace): string {
  const curve = EDGE_CURVES[`${from.id}-${to.id}`] ?? 0;
  if (curve === 0) return `M ${from.x} ${from.y} L ${to.x} ${to.y}`;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy) || 1;
  const middleX = (from.x + to.x) / 2 + (-dy / length) * curve;
  const middleY = (from.y + to.y) / 2 + (dx / length) * curve;
  return `M ${from.x} ${from.y} Q ${middleX} ${middleY} ${to.x} ${to.y}`;
}

function edgeWasTravelled(
  movement: GranRondaMovementPublic | null,
  fromId: string,
  toId: string,
): boolean {
  if (!movement) return false;
  return movement.path.some((spaceId, index) => {
    const nextId = movement.path[index + 1];
    return (spaceId === fromId && nextId === toId) || (spaceId === toId && nextId === fromId);
  });
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
  minimized = false,
  onSpaceSelect,
}: GranRondaBoardProps) {
  const positions = new Map(board.map((space) => [space.id, space]));
  const routeSet = new Set(routeOptions);
  const activePlayer = players.find((player) => player.playerId === activePlayerId);
  const interactive = routeOptions.length > 0 && onSpaceSelect !== undefined;
  const choiceOrigin = movement?.path[movement.path.length - 1] ?? null;
  const stampSpace = positions.get(stampSpaceId);
  const occupantsByPosition = new Map<string, GranRondaBoardPlayer[]>();
  for (const occupant of boardPlayers) {
    const occupants = occupantsByPosition.get(occupant.position) ?? [];
    occupants.push(occupant);
    occupantsByPosition.set(occupant.position, occupants);
  }

  return (
    <section
      className={`gran-ronda-board ${compact ? 'gran-ronda-board--compact' : ''} ${minimized ? 'gran-ronda-board--minimized' : ''}`}
      aria-label="Mapa de La Gran Ronda"
    >
      <div className="gran-ronda-board__stage">
        <div className="gran-ronda-board__art" aria-hidden="true" />
        <div className="gran-ronda-board__shade" aria-hidden="true" />

        <svg
          className="gran-ronda-board__routes"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          {board.flatMap((space) =>
            space.nextIds.flatMap((nextId) => {
              const next = positions.get(nextId);
              if (!next) return [];
              const choice =
                choiceOrigin !== null &&
                ((space.id === choiceOrigin && routeSet.has(next.id)) ||
                  (next.id === choiceOrigin && routeSet.has(space.id)));
              const travelled = edgeWasTravelled(movement, space.id, next.id);
              const path = edgePath(space, next);
              return (
                <g
                  key={`${space.id}-${next.id}`}
                  className={`gran-ronda-route ${choice ? 'gran-ronda-route--choice' : ''} ${travelled ? 'gran-ronda-route--travelled' : ''}`}
                >
                  <path d={path} className="gran-ronda-route__edge" />
                  <path d={path} className="gran-ronda-route__road" />
                  <path d={path} className="gran-ronda-route__stitch" />
                </g>
              );
            }),
          )}
        </svg>

        <div className="gran-ronda-board__map-label">
          <span>La Gran Ronda</span>
          <strong>Mapa</strong>
        </div>
        <div className="gran-ronda-board__stamp-status">
          <GranRondaSpaceIcon type="sello" size={15} />
          <span>Sello · 8 Oros</span>
        </div>

        <div className="absolute inset-0">
          {board.map((space) => {
            const isOption = routeSet.has(space.id);
            const stamp = space.id === stampSpaceId;
            const occupied = occupantsByPosition.has(space.id);
            const meta = SPACE_META[space.type];
            return (
              <button
                key={space.id}
                type="button"
                disabled={!interactive || !isOption}
                onClick={() => onSpaceSelect?.(space.id)}
                title={`${space.label} · ${meta.effect}`}
                aria-label={`${space.label}, casilla ${space.index + 1}, ${meta.effect}${isOption ? ', elegir este camino' : ''}`}
                className={`gran-ronda-space gran-ronda-space--${space.type} ${stamp ? 'gran-ronda-space--stamp' : ''} ${isOption ? 'gran-ronda-space--option' : ''} ${occupied ? 'gran-ronda-space--occupied' : ''}`}
                style={{ left: `${space.x}%`, top: `${space.y}%` }}
              >
                {stamp ? <span className="gran-ronda-space__stamp-label">Sello</span> : null}
                <span className="gran-ronda-space__face">
                  <GranRondaSpaceIcon type={space.type} />
                  <span className="gran-ronda-space__number">
                    {String(space.index + 1).padStart(2, '0')}
                  </span>
                </span>
              </button>
            );
          })}

          <div
            className="pointer-events-none absolute inset-0 z-30"
            role="group"
            aria-label="Fichas de jugadores"
          >
            {boardPlayers.map((occupant) => {
              const space = positions.get(occupant.position);
              if (!space) return null;
              const occupants = occupantsByPosition.get(occupant.position) ?? [];
              const occupantIndex = occupants.findIndex(
                (player) => player.playerId === occupant.playerId,
              );
              const player = players.find((candidate) => candidate.playerId === occupant.playerId);
              const offset = pieceOffset(occupantIndex, occupants.length);
              const colorIndex = player?.colorIndex ?? 0;
              const tokenIcon =
                player?.tokenIcon ??
                PLAYER_TOKEN_ICONS[colorIndex % PLAYER_TOKEN_ICONS.length] ??
                DEFAULT_PLAYER_TOKEN_ICON;
              const active = occupant.playerId === activePlayerId;
              return (
                <span
                  key={occupant.playerId}
                  title={`${player?.nick ?? 'Jugador'} · ${tokenIcon}`}
                  aria-label={player?.nick ?? 'Jugador'}
                  className={`gran-ronda-piece ${active ? 'gran-ronda-piece--active' : ''}`}
                  style={
                    {
                      left: `${space.x + offset.x}%`,
                      top: `${space.y + offset.y}%`,
                      '--piece-color': PLAYER_COLORS[colorIndex],
                    } as CSSProperties
                  }
                >
                  <span aria-hidden="true">{tokenIcon}</span>
                </span>
              );
            })}
          </div>
          {movement && activePlayer && !minimized ? (
            <GranRondaDiceOverlay movement={movement} playerName={activePlayer.nick} />
          ) : null}
        </div>
      </div>

      {minimized ? (
        <div className="gran-ronda-board__mini-summary">
          <p>Mapa en pausa</p>
          <strong>{stampSpace?.label ?? 'El Sello sigue en el tablero'}</strong>
          <span>Volverá a ocupar toda la pantalla al terminar el minijuego.</span>
        </div>
      ) : (
        <details className="gran-ronda-board__key" open={!compact}>
          <summary>
            <span>Qué hace cada casilla</span>
            <span className="gran-ronda-board__key-dots" aria-hidden="true">
              {LEGEND_ORDER.slice(0, 5).map((type) => (
                <i
                  key={type}
                  className={`gran-ronda-board__key-dot gran-ronda-board__key-dot--${type}`}
                />
              ))}
            </span>
          </summary>
          <div className="gran-ronda-board__key-grid">
            {LEGEND_ORDER.map((type) => (
              <span
                key={type}
                className={`gran-ronda-board__key-item gran-ronda-board__key-item--${type}`}
              >
                <span className="gran-ronda-board__key-icon">
                  <GranRondaSpaceIcon type={type} size={16} />
                </span>
                <span>
                  <strong>{SPACE_META[type].label}</strong>
                  <small>{SPACE_META[type].effect}</small>
                </span>
              </span>
            ))}
          </div>
        </details>
      )}

      {routeOptions.length > 0 && !minimized ? (
        <p className="gran-ronda-board__choice-hint">
          Elige una de las casillas que laten en dorado
        </p>
      ) : null}
    </section>
  );
}
