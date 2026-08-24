'use client';

import { useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type {
  GameAction,
  GranRondaEmbeddedGameAction,
  GranRondaPlayerView,
  GranRondaPowerupType,
} from '@ronda/protocol';
import { GranRondaBoard } from '@/components/granronda/GranRondaBoard';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Pill } from '@/components/ui/Pill';
import { useRondaStore } from '@/lib/store';
import { ClassicGameScreen } from './ClassicGameScreen';
import { GameScreen } from './GameScreen';
import { MusicalGameScreen } from './MusicalGameScreen';
import { PartyGameScreen } from './PartyGameScreen';
import { PochaGameScreen } from './PochaGameScreen';
import { PrecioJustoGameScreen } from './PrecioJustoGameScreen';
import { RoadmapGameScreen } from './RoadmapGameScreen';
import { RondaGameScreen } from './RondaGameScreen';

const POWERUP_COSTS: Record<GranRondaPowerupType, number> = {
  doubleRoll: 5,
  rivalPenalty: 4,
};

const POWERUP_LABELS: Record<GranRondaPowerupType, string> = {
  doubleRoll: 'Doble dado',
  rivalPenalty: 'Penalización',
};

export interface GranRondaGameScreenProps {
  view: GranRondaPlayerView;
  onRequestLeave: () => void;
}

export function GranRondaGameScreen({ view, onRequestLeave }: GranRondaGameScreenProps) {
  const router = useRouter();
  const currentTurn = view.players.find((player) => player.playerId === view.turnPlayerId);
  const can = (action: GranRondaPlayerView['me']['availableActions'][number]) =>
    view.me.availableActions.includes(action);
  const final = view.status === 'gameEnd';
  const canAdvance = can('advanceGranRondaMovement');
  const embeddedGame = view.me.embeddedGame;
  const showEmbeddedGame = view.phase === 'minigameInput' && embeddedGame !== null;

  useEffect(() => {
    if (!canAdvance) return;
    const timer = window.setTimeout(() => {
      void useRondaStore.getState().sendAction({ type: 'advanceGranRondaMovement' });
    }, 520);
    return () => window.clearTimeout(timer);
  }, [canAdvance, view.me.playerId, view.movement?.path.length, view.movement?.remainingSteps]);

  useEffect(() => {
    if (view.phase !== 'minigameInput' && view.phase !== 'minigameReveal') return;
    const targetId = showEmbeddedGame ? 'gran-ronda-minigame' : 'gran-ronda-map';
    const timer = window.setTimeout(() => {
      document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, showEmbeddedGame ? 180 : 80);
    return () => window.clearTimeout(timer);
  }, [showEmbeddedGame, view.phase, view.miniGame.gameId]);

  function send(action: Parameters<ReturnType<typeof useRondaStore.getState>['sendAction']>[0]) {
    void useRondaStore.getState().sendAction(action);
  }

  async function handleExit() {
    await useRondaStore.getState().leave();
    router.push('/');
  }

  const standings = [...view.players].sort((left, right) => {
    const leftBoard = view.boardPlayers.find((player) => player.playerId === left.playerId);
    const rightBoard = view.boardPlayers.find((player) => player.playerId === right.playerId);
    return (
      (rightBoard?.seals ?? 0) - (leftBoard?.seals ?? 0) ||
      (rightBoard?.coins ?? 0) - (leftBoard?.coins ?? 0)
    );
  });

  return (
    <main className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col gap-3 overflow-y-auto px-3 pb-[max(0.8rem,env(safe-area-inset-bottom))] pt-3">
      <header className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="eyebrow">Mapa y turnos</p>
          <h1 className="truncate font-display text-24 text-hueso">
            La Gran Ronda <span className="font-sans text-12 text-oro">R{view.round}</span>
          </h1>
        </div>
        <button type="button" onClick={onRequestLeave} className="glass-button min-h-10 px-3 text-12 text-humo">
          Salir
        </button>
      </header>

      <section className="grid grid-cols-2 gap-2" aria-label="Tus recursos">
        <div className="surface-panel flex items-center justify-between px-4 py-3">
          <span className="text-13 text-humo">Oros</span>
          <strong className="font-mono text-22 text-oro">{view.me.coins}</strong>
        </div>
        <div className="surface-panel flex items-center justify-between px-4 py-3">
          <span className="text-13 text-humo">Sellos</span>
          <strong className="font-mono text-22 text-verde">{view.me.seals}</strong>
        </div>
      </section>

      <section
        id="gran-ronda-map"
        className={`gran-ronda-map-shell surface-panel p-2.5 ${showEmbeddedGame ? 'gran-ronda-map-shell--minigame' : ''}`}
      >
        <GranRondaBoard
          board={view.board}
          boardPlayers={view.boardPlayers}
          players={view.players}
          stampSpaceId={view.stampSpaceId}
          routeOptions={view.routeOptions}
          activePlayerId={view.turnPlayerId}
          movement={view.movement}
          compact
          onSpaceSelect={can('chooseGranRondaPath') ? (spaceId) => send({ type: 'chooseGranRondaPath', nextSpaceId: spaceId }) : undefined}
        />
      </section>

      {showEmbeddedGame ? <EmbeddedMiniGamePanel view={view} /> : null}
      {view.phase === 'minigameReveal' ? (
        <MiniGamePanel view={view} can={can} send={send} />
      ) : null}

      {!final && view.phase === 'movement' ? (
        <section className="surface-panel flex flex-col gap-3 p-4 text-center">
          <p className="eyebrow">Turno de movimiento</p>
          <h2 className="text-20 font-semibold text-hueso">
            {can('rollGranRonda') ? 'Te toca tirar' : `Tira ${currentTurn?.nick ?? 'la persona activa'}`}
          </h2>
          <p className="text-13 text-humo">
            {can('rollGranRonda')
              ? 'El resultado lo verá toda la mesa y después podrás elegir el camino.'
              : 'El mapa permanece visible para todos mientras llega el siguiente movimiento.'}
          </p>
          {can('rollGranRonda') ? (
            <>
              <Button onClick={() => send({ type: 'rollGranRonda' })}>Tirar dado</Button>
              <PowerupTray view={view} can={can} send={send} />
            </>
          ) : null}
        </section>
      ) : null}

      {!final && view.phase === 'routeChoice' ? (
        <p className="px-2 text-center text-12 text-humo">
          {can('chooseGranRondaPath')
            ? 'Toca directamente una de las casillas doradas del mapa para elegir el camino.'
            : `${currentTurn?.nick ?? 'La persona activa'} está eligiendo una casilla del mapa.`}
        </p>
      ) : null}

      {!final && view.phase === 'moving' ? (
        <section className="surface-panel flex items-center gap-3 p-4">
          <div className="grid size-14 shrink-0 place-items-center rounded-2xl bg-hueso font-display text-28 text-tinta shadow-lg">
            {view.movement?.roll ?? '—'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="eyebrow">La ficha está avanzando</p>
            <h2 className="mt-1 truncate text-18 font-semibold text-hueso">{currentTurn?.nick ?? 'Jugador activo'}</h2>
            <p className="mt-1 text-13 text-humo">
              Casillas restantes: {view.movement?.remainingSteps ?? 0}. Todos ven cada paso.
            </p>
          </div>
          <span className="size-3 animate-pulse rounded-full bg-oro" aria-label="Movimiento en curso" />
        </section>
      ) : null}

      {!final && view.phase === 'resolving' ? (
        <ResolutionPanel view={view} can={can} send={send} currentTurnNick={currentTurn?.nick} />
      ) : null}

      {!final && view.phase === 'roundEnd' ? (
        <section className="surface-panel flex flex-col gap-3 p-4 text-center">
          <p className="eyebrow">Ronda completada</p>
          <h2 className="text-20 font-semibold text-hueso">Todas las fichas han llegado</h2>
          <p className="text-13 text-humo">El mapa queda congelado hasta que el anfitrión empiece la siguiente ronda.</p>
          {can('nextRound') ? <Button onClick={() => send({ type: 'nextRound' })}>Empezar ronda {view.round + 1}</Button> : null}
        </section>
      ) : null}

      {final ? (
        <section className="surface-panel flex flex-col gap-4 p-4">
          <div className="text-center">
            <p className="eyebrow">Partida terminada</p>
            <h2 className="mt-2 font-display text-32 text-hueso">
              Gana {view.players.find((player) => player.playerId === view.winnerId)?.nick ?? 'la mesa'}
            </h2>
            <p className="mt-1 text-13 text-humo">Más Sellos; los Oros desempatan.</p>
          </div>
          <ol className="flex flex-col gap-2">
            {standings.map((player, index) => {
              const boardPlayer = view.boardPlayers.find((candidate) => candidate.playerId === player.playerId);
              return (
                <li key={player.playerId} className="interactive-surface flex items-center gap-3 px-3 py-2">
                  <span className="w-5 text-center font-mono text-14 text-humo">{index + 1}</span>
                  <Avatar name={player.nick} colorIndex={player.colorIndex} size={32} />
                  <span className="min-w-0 flex-1 truncate text-15 text-hueso">{player.nick}</span>
                  {player.playerId === view.winnerId ? <Pill>Ganador</Pill> : null}
                  <span className="font-mono text-13 text-verde">{boardPlayer?.seals ?? 0} sellos</span>
                  <span className="font-mono text-13 text-oro">{boardPlayer?.coins ?? 0} oros</span>
                </li>
              );
            })}
          </ol>
          <div className="flex flex-col gap-2">
            <Button onClick={() => void useRondaStore.getState().voteRematch(true)}>Revancha</Button>
            <Button variant="ghost" onClick={handleExit}>Salir</Button>
          </div>
        </section>
      ) : null}
    </main>
  );
}

function EmbeddedMiniGamePanel({ view }: { view: GranRondaPlayerView }) {
  const embedded = view.me.embeddedGame;
  const sendEmbeddedAction = useCallback((action: GameAction): void => {
    void useRondaStore.getState().sendAction({
      type: 'submitGranRondaMiniGameAction',
      action: action as GranRondaEmbeddedGameAction,
    });
  }, []);
  if (!embedded) return null;

  return (
    <section
      id="gran-ronda-minigame"
      className="gran-ronda-embedded-game surface-panel flex flex-col gap-3 border-oro/45 bg-oro/5 p-2.5 shadow-[0_18px_48px_rgba(246,195,76,0.12)]"
      aria-label={`Minijuego ${embedded.gameId}`}
    >
      <div className="flex items-center justify-between gap-3 px-2 pt-1">
        <div>
          <p className="eyebrow text-oro">Minijuego de la ronda</p>
          <p className="mt-1 text-13 text-humo">Desplázate dentro de esta pantalla para jugar.</p>
        </div>
        <span className="rounded-full border border-oro/40 bg-oro/10 px-2.5 py-1 font-mono text-10 uppercase tracking-wider text-oro">
          {embeddedGameLabel(embedded.gameId)}
        </span>
      </div>
      <div className="gran-ronda-embedded-game__frame">
        {embedded.gameId === 'chinchon' ? (
          <GameScreen view={embedded} onAction={sendEmbeddedAction} />
        ) : embedded.gameId === 'pocha' ? (
          <PochaGameScreen view={embedded} onAction={sendEmbeddedAction} />
        ) : embedded.gameId === 'laronda' ? (
          <RondaGameScreen view={embedded} onRequestLeave={() => undefined} onAction={sendEmbeddedAction} embedded />
        ) : embedded.gameId === 'preciojusto' ? (
          <PrecioJustoGameScreen view={embedded} onAction={sendEmbeddedAction} />
        ) : embedded.gameId === 'banderas' ||
          embedded.gameId === 'cifras' ||
          embedded.gameId === 'quienloharia' ||
          embedded.gameId === 'completalafrase' ? (
          <RoadmapGameScreen view={embedded} onAction={sendEmbeddedAction} embedded />
        ) : embedded.gameId === 'musical' ? (
          <MusicalGameScreen view={embedded} onAction={sendEmbeddedAction} />
        ) : embedded.gameId === 'brisca' ||
          embedded.gameId === 'escoba' ||
          embedded.gameId === 'sieteymedia' ||
          embedded.gameId === 'tute' ||
          embedded.gameId === 'cinquillo' ? (
          <ClassicGameScreen view={embedded} onAction={sendEmbeddedAction} />
        ) : embedded.gameId === 'orden' ||
          embedded.gameId === 'colores' ||
          embedded.gameId === 'mayoria' ||
          embedded.gameId === 'escala' ||
          embedded.gameId === 'matiz' ? (
          <PartyGameScreen view={embedded} onAction={sendEmbeddedAction} embedded />
        ) : null}
      </div>
      {view.me.availableActions.includes('finishGranRondaMiniGame') ? (
        <Button
          variant="ghost"
          onClick={() => void useRondaStore.getState().sendAction({ type: 'finishGranRondaMiniGame' })}
        >
          Revelar resultados
        </Button>
      ) : null}
    </section>
  );
}

function embeddedGameLabel(gameId: string): string {
  switch (gameId) {
    case 'musical':
      return 'Musical';
    case 'chinchon':
      return 'Chinchón';
    case 'pocha':
      return 'Pocha';
    case 'laronda':
      return 'La Ronda';
    case 'preciojusto':
      return 'Precio justo';
    case 'banderas':
      return 'Banderas';
    case 'cifras':
      return 'Cifras';
    case 'quienloharia':
      return 'Quién lo haría';
    case 'completalafrase':
      return 'Completa la frase';
    case 'brisca':
      return 'Brisca';
    case 'escoba':
      return 'Escoba';
    case 'tute':
      return 'Tute';
    case 'sieteymedia':
      return 'Siete y media';
    case 'cinquillo':
      return 'Cinquillo';
    case 'orden':
      return 'Orden';
    case 'colores':
      return 'Colores';
    case 'mayoria':
      return 'Mayoría';
    case 'escala':
      return 'Escala';
    case 'matiz':
      return 'Matiz';
    default:
      return 'Minijuego';
  }
}

function ResolutionPanel({
  view,
  can,
  send,
  currentTurnNick,
}: {
  view: GranRondaPlayerView;
  can: (action: GranRondaPlayerView['me']['availableActions'][number]) => boolean;
  send: (action: Parameters<ReturnType<typeof useRondaStore.getState>['sendAction']>[0]) => void;
  currentTurnNick?: string;
}) {
  const resolution = view.resolution;
  if (!resolution) return null;
  const deltaLabel = resolution.coinsDelta > 0 ? `+${resolution.coinsDelta}` : `${resolution.coinsDelta}`;
  return (
    <section className="surface-panel flex flex-col gap-3 border-oro/35 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow text-oro">Llegada a la casilla</p>
          <h2 className="mt-1 text-22 font-semibold text-hueso">{resolution.title}</h2>
        </div>
        <div className="grid size-12 place-items-center rounded-2xl bg-oro/15 font-mono text-18 text-oro">
          {resolution.coinsDelta === 0 ? '·' : deltaLabel}
        </div>
      </div>
      <p className="text-14 leading-relaxed text-humo">{resolution.message}</p>
      {resolution.sealsDelta > 0 ? <p className="font-mono text-13 text-verde">+{resolution.sealsDelta} Sello</p> : null}
      {can('buyGranRondaSeal') ? (
        <Button onClick={() => send({ type: 'buyGranRondaSeal' })}>
          Comprar Sello · 8 Oros
        </Button>
      ) : null}
      {can('buyGranRondaPowerup') ? <PowerupShop view={view} send={send} /> : null}
      {can('continueGranRondaResolution') ? (
        <Button onClick={() => send({ type: 'continueGranRondaResolution' })}>Continuar</Button>
      ) : (
        <p className="text-13 text-humo">{currentTurnNick ?? 'La persona activa'} confirma la llegada.</p>
      )}
    </section>
  );
}

function MiniGamePanel({
  view,
  can,
  send,
}: {
  view: GranRondaPlayerView;
  can: (action: GranRondaPlayerView['me']['availableActions'][number]) => boolean;
  send: (action: Parameters<ReturnType<typeof useRondaStore.getState>['sendAction']>[0]) => void;
}) {
  const revealed = view.phase === 'minigameReveal';
  const selected = view.me.selectedOptionId;
  const personal = view.me.miniGame;
  const finished = personal?.finished ?? false;
  return (
    <section className="surface-panel gran-ronda-minigame-panel flex flex-col gap-3 border-oro/40 bg-oro/5 p-4 shadow-[0_14px_40px_rgba(246,195,76,0.08)]">
      <MiniGameRoulette gameId={view.miniGame.gameId} title={view.miniGame.title} />
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow text-oro">{revealed ? 'Resultados del minijuego' : 'Sorteo de la ronda'}</p>
          <h2 className="mt-1 text-22 font-semibold text-hueso">
            {revealed ? 'Reparto de Oros' : view.miniGame.title}
          </h2>
          <p className="mt-1 text-14 leading-relaxed text-humo">
            {revealed
              ? 'La partida original ha terminado. Este es el resultado de la ronda.'
              : view.miniGame.prompt}
          </p>
          {!revealed ? <p className="mt-2 text-12 leading-relaxed text-humo">{view.miniGame.instructions}</p> : null}
        </div>
        <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-oro/15 font-display text-20 text-oro">✦</span>
      </div>
      {!revealed ? (
        <div className="grid gap-2 sm:grid-cols-2">
          {view.miniGame.options.map((option) => {
            const isSelected = selected === option.id;
            return (
              <button
                key={option.id}
                type="button"
                disabled={finished || !can('submitGranRondaAnswer')}
                onClick={() => send({ type: 'submitGranRondaAnswer', optionId: option.id })}
                aria-pressed={isSelected}
                className={`min-h-12 rounded-2xl border px-3 py-2 text-left text-14 font-semibold transition-[transform,background-color,border-color,opacity] active:scale-[0.985] disabled:cursor-default disabled:opacity-65 ${
                  isSelected
                    ? 'border-oro bg-oro/15 text-oro ring-2 ring-oro/20'
                    : 'border-linea bg-tinta/30 text-hueso hover:border-oro/60'
                }`}
              >
                <span className="mr-2 font-mono text-11 text-humo">{option.id.toUpperCase()}</span>
                {option.label}
              </button>
            );
          })}
        </div>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-linea bg-tinta/30 px-3 py-2 text-12">
        <span className="text-humo">
          Tu marcador: <strong className="font-mono text-hueso">{personal ? personal.score : '—'}</strong>
          {personal?.lastCard !== null && personal?.lastCard !== undefined ? ` · última carta ${personal.lastCard}` : ''}
        </span>
        <span className="text-humo">{view.miniGame.completedPlayerIds.length}/{view.players.length} terminados</span>
      </div>
      {revealed ? (
        <div className="flex flex-col gap-2 rounded-2xl border border-linea bg-tinta/35 p-3">
          <p className="text-12 font-semibold uppercase tracking-[0.12em] text-humo">Clasificación y premios</p>
          <div className="grid gap-1.5 sm:grid-cols-2">
            {view.players.map((player) => {
              const result = view.miniGame.results?.[player.playerId];
              const delta = result?.reward ?? view.miniGame.scoreDeltas?.[player.playerId] ?? 0;
              return (
                <div key={player.playerId} className="flex items-center justify-between gap-2 text-12">
                  <span className="min-w-0 truncate text-hueso">
                    {result ? `${result.rank}. ` : ''}{player.nick}
                    {result?.outcome === 'bust' ? <span className="ml-1 text-brasa">· Se pasó</span> : null}
                  </span>
                  <strong className={delta > 0 ? 'font-mono text-oro' : 'font-mono text-humo'}>
                    {result?.score ?? '—'} · {delta > 0 ? `+${delta}` : '±0'} Oros
                  </strong>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-2 text-12 text-humo">
          <span>{view.miniGame.submittedPlayerIds.length}/{view.players.length} acciones registradas</span>
          <span>1.º +6 · 2.º +3 · resto +1</span>
        </div>
      )}
      {can('finishGranRondaMiniGame') ? (
        <Button variant="ghost" onClick={() => send({ type: 'finishGranRondaMiniGame' })}>
          Revelar resultados
        </Button>
      ) : null}
      {can('nextRound') ? (
        <Button onClick={() => send({ type: 'nextRound' })}>Empezar ronda {view.round + 1}</Button>
      ) : null}
    </section>
  );
}

function MiniGameRoulette({ gameId, title }: { gameId: string; title: string }) {
  return (
    <div className="gran-ronda-roulette flex items-center gap-3 rounded-2xl border border-white/15 bg-tinta/45 px-3 py-2">
      <span className="gran-ronda-roulette-icon grid size-9 shrink-0 place-items-center rounded-xl bg-oro text-tinta" aria-hidden="true">
        {gameId === 'musical' ? '♫' : gameId === 'sieteymedia' ? '7½' : gameId === 'cinquillo' ? '♣' : '✦'}
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-mono text-9 uppercase tracking-[0.16em] text-oro">La ruleta ha elegido</p>
        <div className="gran-ronda-roulette-reel mt-0.5" aria-hidden="true">
          <div className="gran-ronda-roulette-track">
            <span>Siete y media</span>
            <span>Musical</span>
            <span>Colores</span>
            <span>Mayoría</span>
            <span>Escala</span>
            <span>Matiz</span>
            <span>{title}</span>
          </div>
        </div>
        <p className="truncate text-13 font-semibold text-hueso">{title}</p>
      </div>
      <span className="gran-ronda-roulette-dots flex gap-1" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
    </div>
  );
}

function PowerupShop({
  view,
  send,
}: {
  view: GranRondaPlayerView;
  send: (action: Parameters<ReturnType<typeof useRondaStore.getState>['sendAction']>[0]) => void;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-violeta/35 bg-violeta/10 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="eyebrow text-violeta">Tienda de poderes</p>
        <span className="font-mono text-11 text-oro">{view.me.coins} Oros</span>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {(Object.keys(POWERUP_COSTS) as GranRondaPowerupType[]).map((powerup) => (
          <button
            key={powerup}
            type="button"
            disabled={view.me.coins < POWERUP_COSTS[powerup]}
            onClick={() => send({ type: 'buyGranRondaPowerup', powerup })}
            className="flex min-h-11 items-center justify-between gap-2 rounded-xl border border-violeta/40 bg-tinta/35 px-3 py-2 text-left text-12 text-hueso transition-colors hover:border-violeta disabled:cursor-not-allowed disabled:opacity-45"
          >
            <span>
              <strong className="block text-13">{POWERUP_LABELS[powerup]}</strong>
              <span className="text-humo">Tienes {view.me.powerups[powerup]}</span>
            </span>
            <span className="font-mono text-oro">{POWERUP_COSTS[powerup]} O</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function PowerupTray({
  view,
  can,
  send,
}: {
  view: GranRondaPlayerView;
  can: (action: GranRondaPlayerView['me']['availableActions'][number]) => boolean;
  send: (action: Parameters<ReturnType<typeof useRondaStore.getState>['sendAction']>[0]) => void;
}) {
  const rivals = view.players.filter((player) => player.playerId !== view.me.playerId && !player.eliminated);
  if (!can('useGranRondaPowerup')) return null;
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-violeta/35 bg-violeta/10 p-3 text-left">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="eyebrow text-violeta">Poderes listos</p>
        <span className="text-11 text-humo">Se usan antes de tirar</span>
      </div>
      {view.me.powerups.doubleRoll > 0 ? (
        <button
          type="button"
          onClick={() => send({ type: 'useGranRondaPowerup', powerup: 'doubleRoll' })}
          className="flex min-h-11 items-center justify-between rounded-xl border border-oro/45 bg-oro/10 px-3 py-2 text-13 font-semibold text-oro"
        >
          <span>🎲🎲 Tirar dos dados</span>
          <span className="font-mono text-11">×{view.me.powerups.doubleRoll}</span>
        </button>
      ) : null}
      {view.me.powerups.rivalPenalty > 0 ? (
        <div className="flex flex-col gap-1.5">
          <p className="text-11 text-humo">Penalizar a un rival · −2 Oros</p>
          <div className="grid gap-1.5 sm:grid-cols-2">
            {rivals.map((rival) => (
              <button
                key={rival.playerId}
                type="button"
                onClick={() => send({ type: 'useGranRondaPowerup', powerup: 'rivalPenalty', targetPlayerId: rival.playerId })}
                className="min-h-10 rounded-xl border border-brasa/45 bg-brasa/10 px-3 py-2 text-left text-12 text-hueso"
              >
                {rival.nick}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
