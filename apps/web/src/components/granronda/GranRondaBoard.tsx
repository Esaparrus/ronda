'use client';

import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import {
  DEFAULT_PLAYER_TOKEN_ICON,
  PLAYER_TOKEN_ICONS,
  type GranRondaBoardPlayer,
  type GranRondaBoardSpace,
  type GranRondaMovementPublic,
  type GranRondaResolutionPublic,
  type GranRondaSpaceType,
  type PlayerId,
  type PublicPlayer,
} from '@ronda/protocol';
import { GranRondaDiceOverlay } from './GranRondaDiceOverlay';
import { GranRondaCoinBurst } from './GranRondaCoinBurst';
import { GranRondaSpaceIcon } from './GranRondaSpaceIcon';
import { GranRondaTrapEncounter } from './GranRondaTrapEncounter';

export interface GranRondaBoardProps {
  board: GranRondaBoardSpace[];
  boardPlayers: GranRondaBoardPlayer[];
  players: PublicPlayer[];
  stampSpaceId: string;
  stampCost?: number;
  stampValue?: number;
  trapSpaceIds?: string[];
  routeOptions?: string[];
  activePlayerId?: PlayerId | null;
  movement?: GranRondaMovementPublic | null;
  resolution?: GranRondaResolutionPublic | null;
  compact?: boolean;
  minimized?: boolean;
  closeZoom?: number;
  onSpaceSelect?: (spaceId: string) => void;
}

interface SpaceMeta {
  label: string;
  effect: string;
}

const SPACE_META: Record<GranRondaSpaceType, SpaceMeta> = {
  start: { label: 'Salida', effect: 'Punto de vuelta' },
  oros: { label: 'Oros', effect: '+3 al caer' },
  perdida: { label: 'Pérdida', effect: '−2 al caer' },
  sello: { label: 'Plaza de Sello', effect: 'Compra al caer' },
  evento: { label: 'Suerte', effect: '+1 al caer' },
  atajo: { label: 'Atajo', effect: '+2 al caer' },
  doble: { label: 'Dado doble', effect: 'Consíguelo al caer' },
  penalizacion: { label: 'Penalización', effect: 'Consíguela al caer' },
  tienda: { label: 'Tienda', effect: 'Se abre al pasar' },
  trampa: { label: 'Trampa monstruo', effect: 'Hasta −3 al caer' },
};

const LEGEND_ORDER: GranRondaSpaceType[] = [
  'oros',
  'perdida',
  'trampa',
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

const EMPTY_SPACE_IDS: string[] = [];

interface BoardFocus {
  x: number;
  y: number;
}

interface CoinBurst {
  id: number;
  amount: number;
  x: number;
  y: number;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function closeBoardFocus(
  board: GranRondaBoardSpace[],
  boardPlayers: GranRondaBoardPlayer[],
  activePlayerId: PlayerId | null,
  routeOptions: string[],
): BoardFocus {
  const occupant =
    boardPlayers.find((player) => player.playerId === activePlayerId) ?? boardPlayers[0];
  const origin = board.find((space) => space.id === occupant?.position) ?? board[0];
  if (!origin) return { x: 50, y: 50 };

  const nearbyIds = new Set<string>([origin.id, ...routeOptions, ...origin.nextIds]);
  for (const nextId of origin.nextIds) {
    const nextSpace = board.find((space) => space.id === nextId);
    for (const followingId of nextSpace?.nextIds ?? []) nearbyIds.add(followingId);
  }
  const nearby = board.filter((space) => nearbyIds.has(space.id));
  // El origen pesa dos veces para seguir la ficha sin perder de vista los pasos próximos.
  const focusSpaces = [origin, ...nearby];
  return {
    x: focusSpaces.reduce((total, space) => total + space.x, 0) / focusSpaces.length,
    y: focusSpaces.reduce((total, space) => total + space.y, 0) / focusSpaces.length,
  };
}

function pieceOffset(index: number, total: number, spread = 1): { x: number; y: number } {
  if (total <= 1) return { x: 0, y: -3.8 * spread };
  const angle = (-90 + (index * 360) / total) * (Math.PI / 180);
  const radius = (total > 4 ? 4.6 : 4.1) * spread;
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
  stampCost = 8,
  stampValue = 1,
  trapSpaceIds = EMPTY_SPACE_IDS,
  routeOptions = EMPTY_SPACE_IDS,
  activePlayerId = null,
  movement = null,
  resolution = null,
  compact = false,
  minimized = false,
  closeZoom = 1.85,
  onSpaceSelect,
}: GranRondaBoardProps) {
  const [viewMode, setViewMode] = useState<'close' | 'overview'>('close');
  const [coinBursts, setCoinBursts] = useState<CoinBurst[]>([]);
  const previousCoinsRef = useRef<Record<string, number> | null>(null);
  const burstIdRef = useRef(0);
  const burstTimersRef = useRef<number[]>([]);
  const positions = useMemo(() => new Map(board.map((space) => [space.id, space])), [board]);
  const routeSet = useMemo(() => new Set(routeOptions), [routeOptions]);
  const trapSet = useMemo(() => new Set(trapSpaceIds), [trapSpaceIds]);
  const playersById = useMemo(
    () => new Map(players.map((player) => [player.playerId, player])),
    [players],
  );
  const activePlayer = activePlayerId ? playersById.get(activePlayerId) : undefined;
  const interactive = routeOptions.length > 0 && onSpaceSelect !== undefined;
  const choiceOrigin = movement?.path[movement.path.length - 1] ?? null;
  const stampSpace = positions.get(stampSpaceId);
  const closeFocus = useMemo(
    () => closeBoardFocus(board, boardPlayers, activePlayerId, routeOptions),
    [activePlayerId, board, boardPlayers, routeOptions],
  );
  const cameraScale = minimized || viewMode === 'overview' ? 1 : closeZoom;
  const pieceSpread = cameraScale > 1 ? 1 / cameraScale : 1;
  const cameraOffsetX = clamp(0.5 - (closeFocus.x / 100) * cameraScale, 1 - cameraScale, 0);
  const cameraOffsetY = clamp(0.5 - (closeFocus.y / 100) * cameraScale, 1 - cameraScale, 0);
  const cameraStyle = {
    transform: `translate3d(${cameraOffsetX * 100}%, ${cameraOffsetY * 100}%, 0) scale(${cameraScale})`,
  };
  const occupantsByPosition = new Map<string, GranRondaBoardPlayer[]>();
  for (const occupant of boardPlayers) {
    const occupants = occupantsByPosition.get(occupant.position) ?? [];
    occupants.push(occupant);
    occupantsByPosition.set(occupant.position, occupants);
  }

  useEffect(() => {
    const currentCoins = Object.fromEntries(
      boardPlayers.map((player) => [player.playerId, player.coins]),
    );
    const previousCoins = previousCoinsRef.current;
    previousCoinsRef.current = currentCoins;
    if (!previousCoins) return;

    const gains = boardPlayers.flatMap<CoinBurst>((player) => {
      const previous = previousCoins[player.playerId];
      const amount = previous === undefined ? 0 : player.coins - previous;
      const space = positions.get(player.position);
      if (amount <= 0 || !space) return [];
      burstIdRef.current += 1;
      return [{ id: burstIdRef.current, amount, x: space.x, y: space.y }];
    });
    if (gains.length === 0) return;

    setCoinBursts((current) => [...current, ...gains]);
    const gainIds = new Set(gains.map((gain) => gain.id));
    const timer = window.setTimeout(() => {
      setCoinBursts((current) => current.filter((burst) => !gainIds.has(burst.id)));
      burstTimersRef.current = burstTimersRef.current.filter((candidate) => candidate !== timer);
    }, 1650);
    burstTimersRef.current.push(timer);
  }, [boardPlayers, positions]);

  useEffect(
    () => () => {
      for (const timer of burstTimersRef.current) window.clearTimeout(timer);
    },
    [],
  );

  return (
    <section
      className={`gran-ronda-board ${compact ? 'gran-ronda-board--compact' : ''} ${minimized ? 'gran-ronda-board--minimized' : ''}`}
      aria-label="Mapa de La Gran Ronda"
    >
      <div className="gran-ronda-board__stage">
        <div
          className={`gran-ronda-board__camera ${viewMode === 'close' && !minimized ? 'gran-ronda-board__camera--close' : ''}`}
          style={cameraStyle}
        >
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

          <div className="absolute inset-0">
            {board.map((space) => {
              const isOption = routeSet.has(space.id);
              const stamp = space.id === stampSpaceId;
              const trap = trapSet.has(space.id);
              const occupied = occupantsByPosition.has(space.id);
              // Las plazas vacías conservan su recorrido, pero no enseñan
              // varios iconos de Sello a la vez: solo la oferta activa lo hace.
              const visibleType: GranRondaSpaceType = trap
                ? 'trampa'
                : space.type === 'sello' && !stamp
                  ? 'evento'
                  : space.type;
              const meta =
                space.type === 'sello' && !stamp
                  ? { label: 'Plaza vacía', effect: 'El Sello está en otra plaza' }
                  : SPACE_META[visibleType];
              return (
                <button
                  key={space.id}
                  type="button"
                  disabled={!interactive || !isOption}
                  onClick={() => onSpaceSelect?.(space.id)}
                  title={`${space.label} · ${meta.effect}`}
                  aria-label={`${space.label}, casilla ${space.index + 1}, ${meta.effect}${isOption ? ', elegir este camino' : ''}`}
                  className={`gran-ronda-space gran-ronda-space--${visibleType} ${stamp ? 'gran-ronda-space--stamp' : ''} ${trap ? 'gran-ronda-space--trap' : ''} ${isOption ? 'gran-ronda-space--option' : ''} ${occupied ? 'gran-ronda-space--occupied' : ''}`}
                  style={{ left: `${space.x}%`, top: `${space.y}%` }}
                >
                  {stamp ? (
                    <span className="gran-ronda-space__stamp-label">
                      {stampValue > 1 ? `${stampValue} Sellos` : 'Sello'}
                    </span>
                  ) : null}
                  {trap ? <span className="gran-ronda-space__trap-label">¡Trampa!</span> : null}
                  <span className="gran-ronda-space__face">
                    <GranRondaSpaceIcon type={visibleType} size={stamp ? 25 : undefined} />
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
                const player = playersById.get(occupant.playerId);
                const offset = pieceOffset(occupantIndex, occupants.length, pieceSpread);
                const colorIndex = player?.colorIndex ?? 0;
                const tokenIcon =
                  player?.tokenIcon ??
                  PLAYER_TOKEN_ICONS[colorIndex % PLAYER_TOKEN_ICONS.length] ??
                  DEFAULT_PLAYER_TOKEN_ICON;
                const active = occupant.playerId === activePlayerId;
                const hit =
                  resolution?.kind === 'trampa' && occupant.position === resolution.spaceId;
                return (
                  <span
                    key={occupant.playerId}
                    role="img"
                    title={`${player?.nick ?? 'Jugador'} · ${tokenIcon}`}
                    aria-label={player?.nick ?? 'Jugador'}
                    className={`gran-ronda-piece ${active ? 'gran-ronda-piece--active' : ''} ${hit ? 'gran-ronda-piece--hit' : ''}`}
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
            {coinBursts.map((burst) => (
              <GranRondaCoinBurst key={burst.id} x={burst.x} y={burst.y} amount={burst.amount} />
            ))}
          </div>
        </div>

        <div className="gran-ronda-board__map-label">
          <span>La Gran Ronda</span>
          <strong>{viewMode === 'close' ? 'Cerca' : 'Mapa'}</strong>
        </div>
        <div className="gran-ronda-board__stamp-status">
          <GranRondaSpaceIcon type="sello" size={15} />
          <span>
            {stampValue > 1 ? `${stampValue} Sellos` : 'Sello'} · {stampCost} Oros
          </span>
        </div>
        {!minimized ? (
          <button
            type="button"
            className="gran-ronda-board__zoom-control"
            onClick={() => setViewMode((current) => (current === 'close' ? 'overview' : 'close'))}
            aria-label={
              viewMode === 'close' ? 'Alejar y ver el mapa completo' : 'Acercar a las fichas'
            }
            aria-pressed={viewMode === 'overview'}
          >
            <span aria-hidden="true">{viewMode === 'close' ? '−' : '+'}</span>
            <strong>{viewMode === 'close' ? 'Mapa completo' : 'Acercar'}</strong>
          </button>
        ) : null}
        {resolution?.kind === 'trampa' ? (
          <GranRondaTrapEncounter coinsDelta={resolution.coinsDelta} />
        ) : null}
        {movement && activePlayer && !minimized ? (
          <GranRondaDiceOverlay movement={movement} playerName={activePlayer.nick} />
        ) : null}
      </div>

      {minimized ? (
        <div className="gran-ronda-board__mini-summary">
          <p>Mapa en pausa</p>
          <strong>{stampSpace?.label ?? 'El Sello sigue en el tablero'}</strong>
          <span>
            {stampValue > 1 ? `${stampValue} Sellos` : '1 Sello'} por {stampCost} Oros · el mapa
            volverá al terminar el minijuego.
          </span>
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
