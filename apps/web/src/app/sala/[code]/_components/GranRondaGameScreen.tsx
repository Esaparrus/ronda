'use client';

import Image from 'next/image';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type {
  GameAction,
  GranRondaEmbeddedGameAction,
  GranRondaPlayerView,
  GranRondaPowerupType,
} from '@ronda/protocol';
import { GranRondaBoard } from '@/components/granronda/GranRondaBoard';
import { GranRondaSpaceIcon } from '@/components/granronda/GranRondaSpaceIcon';
import { GranRondaTurnRollPrompt } from '@/components/granronda/GranRondaTurnRollPrompt';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Pill } from '@/components/ui/Pill';
import { Sheet } from '@/components/ui/Sheet';
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
  goldDuel: 6,
};

const POWERUP_LABELS: Record<GranRondaPowerupType, string> = {
  doubleRoll: 'Doble dado',
  rivalPenalty: 'Guante ladrón',
  goldDuel: 'Reto de Oros',
};

const POWERUP_DESCRIPTIONS: Record<GranRondaPowerupType, string> = {
  doubleRoll: 'Tira dos dados antes de moverte.',
  rivalPenalty: 'Roba hasta 2 Oros y súmalos a tu bolsa.',
  goldDuel: 'Reta a un rival: ambos tiráis y el ganador cobra la apuesta.',
};

const POWERUP_ICONS: Record<GranRondaPowerupType, string> = {
  doubleRoll: '🎲',
  rivalPenalty: '🧤',
  goldDuel: '⚔️',
};

export interface GranRondaGameScreenProps {
  view: GranRondaPlayerView;
  onRequestLeave: () => void;
}

export function GranRondaGameScreen({ view, onRequestLeave }: GranRondaGameScreenProps) {
  const router = useRouter();
  const [infoOpen, setInfoOpen] = useState(false);
  const [showFinalStandings, setShowFinalStandings] = useState(false);
  const pendingAction = useRondaStore((state) => state.pendingAction);
  const connection = useRondaStore((state) => state.connection);
  const actionBlocked = pendingAction || connection !== 'online';
  const currentTurn = view.players.find((player) => player.playerId === view.turnPlayerId);
  const can = (action: GranRondaPlayerView['me']['availableActions'][number]) =>
    view.me.availableActions.includes(action);
  const final = view.status === 'gameEnd';
  const canAdvance = can('advanceGranRondaMovement');
  const canRoll = can('rollGranRonda');
  const canUsePowerup = can('useGranRondaPowerup');
  const movementPathLength = view.movement?.path.length ?? 0;
  const embeddedGame = view.me.embeddedGame;
  const showEmbeddedGame = view.phase === 'minigameInput' && embeddedGame !== null;
  const iVotedRematch = view.rematchVotes.includes(view.me.playerId);

  useEffect(() => {
    if (!canAdvance) return;
    const timer = window.setTimeout(
      () => {
        void useRondaStore.getState().sendAction({ type: 'advanceGranRondaMovement' });
      },
      movementPathLength <= 1 ? 2350 : 720,
    );
    return () => window.clearTimeout(timer);
  }, [canAdvance, movementPathLength, view.me.playerId, view.movement?.remainingSteps]);

  useEffect(() => {
    if (view.phase !== 'minigameInput' && view.phase !== 'minigameReveal') return;
    const targetId = showEmbeddedGame ? 'gran-ronda-minigame' : 'gran-ronda-map';
    const timer = window.setTimeout(
      () => {
        document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      },
      showEmbeddedGame ? 180 : 80,
    );
    return () => window.clearTimeout(timer);
  }, [showEmbeddedGame, view.phase, view.miniGame.gameId]);

  useEffect(() => {
    if (view.phase !== 'resolving') return;
    const timer = window.setTimeout(() => {
      document
        .getElementById('gran-ronda-resolution')
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 260);
    return () => window.clearTimeout(timer);
  }, [view.phase, view.resolution?.spaceId, view.resolution?.sealsDelta]);

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
    <main
      className={`gran-ronda-game-screen mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col gap-3 overflow-y-auto px-3 pb-[max(0.8rem,env(safe-area-inset-bottom))] pt-3 ${showEmbeddedGame ? 'gran-ronda-game-screen--minigame' : ''}`}
    >
      <header className="gran-ronda-game-header flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="eyebrow">Mapa y turnos</p>
          <h1 className="truncate font-display text-24 text-hueso">
            La Gran Ronda <span className="font-sans text-12 text-oro">R{view.round}</span>
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setInfoOpen(true)}
            className="glass-button grid size-10 place-items-center rounded-full text-15 font-bold text-hueso"
            aria-label="Ver clasificación y recursos de todos"
          >
            i
          </button>
          <button
            type="button"
            onClick={onRequestLeave}
            className="glass-button min-h-10 px-3 text-12 text-humo"
          >
            Salir
          </button>
        </div>
      </header>

      <section
        className="gran-ronda-resource-strip grid grid-cols-2 gap-2"
        aria-label="Tus recursos"
      >
        <div className="gran-ronda-resource-card gran-ronda-resource-card--coins surface-panel flex items-center justify-between px-3 py-2.5">
          <span className="flex items-center gap-2 text-13 text-humo">
            <span className="gran-ronda-resource-card__icon">
              <GranRondaSpaceIcon type="oros" size={17} />
            </span>
            Oros
          </span>
          <strong className="font-mono text-22">{view.me.coins}</strong>
        </div>
        <div className="gran-ronda-resource-card gran-ronda-resource-card--seals surface-panel flex items-center justify-between px-3 py-2.5">
          <span className="flex items-center gap-2 text-13 text-humo">
            <span className="gran-ronda-resource-card__icon">
              <GranRondaSpaceIcon type="sello" size={17} />
            </span>
            Sellos
          </span>
          <strong className="font-mono text-22">{view.me.seals}</strong>
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
          stampCost={view.stampCost}
          stampValue={view.stampValue}
          trapSpaceIds={view.trapSpaceIds}
          routeOptions={view.routeOptions}
          activePlayerId={view.turnPlayerId}
          movement={view.movement}
          resolution={view.resolution}
          compact
          closeZoom={1.9}
          minimized={showEmbeddedGame}
          onSpaceSelect={
            can('chooseGranRondaPath')
              ? (spaceId) => send({ type: 'chooseGranRondaPath', nextSpaceId: spaceId })
              : undefined
          }
        />
      </section>

      {!final && view.phase === 'movement' && canRoll ? (
        <GranRondaTurnRollPrompt
          disabled={actionBlocked}
          rolling={pendingAction}
          onRoll={() => send({ type: 'rollGranRonda' })}
        >
          {canUsePowerup || view.lastInteraction?.actorPlayerId === view.me.playerId ? (
            <PowerupTray view={view} can={can} send={send} />
          ) : null}
        </GranRondaTurnRollPrompt>
      ) : null}

      {view.lastInteraction && !canRoll ? <InteractionNotice view={view} /> : null}

      {showEmbeddedGame ? <EmbeddedMiniGamePanel view={view} /> : null}
      {view.phase === 'minigameReveal' && (!final || !showFinalStandings) ? (
        <MiniGamePanel
          key={`${view.round}-${view.miniGame.id}`}
          view={view}
          can={can}
          send={send}
          pending={pendingAction}
          blocked={actionBlocked}
          final={final}
          onFinishReview={final ? () => setShowFinalStandings(true) : undefined}
        />
      ) : null}

      {!final && view.phase === 'movement' && !canRoll ? (
        <section className="surface-panel flex flex-col gap-3 p-4 text-center">
          <p className="eyebrow">Turno de movimiento</p>
          <h2 className="text-20 font-semibold text-hueso">
            Tira {currentTurn?.nick ?? 'la persona activa'}
          </h2>
          <p className="text-13 text-humo">
            El mapa permanece visible para todos mientras llega el siguiente movimiento.
          </p>
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
            <h2 className="mt-1 truncate text-18 font-semibold text-hueso">
              {currentTurn?.nick ?? 'Jugador activo'}
            </h2>
            <p className="mt-1 text-13 text-humo">
              Casillas restantes: {view.movement?.remainingSteps ?? 0}. Todos ven cada paso.
            </p>
          </div>
          <span
            className="size-3 animate-pulse rounded-full bg-oro"
            aria-label="Movimiento en curso"
          />
        </section>
      ) : null}

      {!final && view.phase === 'resolving' ? (
        <ResolutionPanel view={view} can={can} send={send} currentTurnNick={currentTurn?.nick} />
      ) : null}

      {!final && view.phase === 'roundEnd' ? (
        <section className="surface-panel flex flex-col gap-3 p-4 text-center">
          <p className="eyebrow">Ronda completada</p>
          <h2 className="text-20 font-semibold text-hueso">Todas las fichas han llegado</h2>
          <p className="text-13 text-humo">
            El mapa queda congelado hasta que el anfitrión empiece la siguiente ronda.
          </p>
          {can('nextRound') ? (
            <Button
              loading={pendingAction}
              disabled={actionBlocked}
              onClick={() => send({ type: 'nextRound' })}
            >
              {pendingAction ? 'Preparando la ronda…' : `Empezar ronda ${view.round + 1}`}
            </Button>
          ) : null}
        </section>
      ) : null}

      {final && showFinalStandings ? (
        <section className="surface-panel flex flex-col gap-4 p-4">
          <div className="text-center">
            <p className="eyebrow text-oro">La partida ha terminado</p>
            <h2 className="mt-2 font-display text-32 text-hueso">
              Gana{' '}
              {view.players.find((player) => player.playerId === view.winnerId)?.nick ?? 'la mesa'}
            </h2>
            <p className="mt-1 text-13 text-humo">
              Resultado definitivo: mandan los Sellos y los Oros desempatan.
            </p>
          </div>
          <ol className="flex flex-col gap-2">
            {standings.map((player, index) => {
              const boardPlayer = view.boardPlayers.find(
                (candidate) => candidate.playerId === player.playerId,
              );
              return (
                <li
                  key={player.playerId}
                  className="interactive-surface flex items-center gap-3 px-3 py-2"
                >
                  <span className="w-5 text-center font-mono text-14 text-humo">{index + 1}</span>
                  <Avatar name={player.nick} colorIndex={player.colorIndex} size={32} />
                  <span className="min-w-0 flex-1 truncate text-15 text-hueso">{player.nick}</span>
                  {player.playerId === view.winnerId ? <Pill>Ganador</Pill> : null}
                  <span className="font-mono text-13 text-verde">
                    {boardPlayer?.seals ?? 0} sellos
                  </span>
                  <span className="font-mono text-13 text-oro">{boardPlayer?.coins ?? 0} oros</span>
                </li>
              );
            })}
          </ol>
          <div className="flex flex-col gap-2">
            <Button
              loading={pendingAction}
              disabled={actionBlocked}
              variant={iVotedRematch ? 'ghost' : 'primary'}
              onClick={() => void useRondaStore.getState().voteRematch(!iVotedRematch)}
            >
              {iVotedRematch ? 'Quitar voto de revancha' : 'Jugar revancha'}
            </Button>
            <p className="text-center text-12 text-humo">
              {view.rematchVotes.length} de{' '}
              {view.players.filter((player) => !player.eliminated).length} han votado revancha.
            </p>
            <Button variant="ghost" onClick={handleExit}>
              Salir
            </Button>
          </div>
        </section>
      ) : null}

      <PlayersInfoSheet
        open={infoOpen}
        onClose={() => setInfoOpen(false)}
        standings={standings}
        view={view}
      />
    </main>
  );
}

function PlayersInfoSheet({
  open,
  onClose,
  standings,
  view,
}: {
  open: boolean;
  onClose: () => void;
  standings: GranRondaPlayerView['players'];
  view: GranRondaPlayerView;
}) {
  const stampSpace = view.board.find((space) => space.id === view.stampSpaceId);
  return (
    <Sheet
      open={open}
      onClose={onClose}
      ariaLabel="Clasificación de La Gran Ronda"
      className="max-h-[82dvh] overflow-y-auto"
    >
      <div className="mx-auto flex w-full max-w-lg flex-col gap-4">
        <div>
          <p className="eyebrow text-oro">Información de la partida</p>
          <h2 className="mt-1 font-display text-26 text-hueso">Así va todo el mundo</h2>
          <p className="mt-1 text-13 text-humo">
            El Sello activo está en {stampSpace?.label ?? 'el mapa'}: cuesta {view.stampCost} Oros y
            entrega {view.stampValue}.
          </p>
        </div>
        <ol className="flex flex-col gap-2">
          {standings.map((player, index) => {
            const boardPlayer = view.boardPlayers.find(
              (candidate) => candidate.playerId === player.playerId,
            );
            return (
              <li
                key={player.playerId}
                className={`flex items-center gap-3 rounded-2xl border px-3 py-2.5 ${
                  player.playerId === view.me.playerId
                    ? 'border-oro/60 bg-oro/10'
                    : 'border-linea bg-tinta/25'
                }`}
              >
                <span className="w-5 text-center font-mono text-12 text-humo">{index + 1}</span>
                <Avatar name={player.nick} colorIndex={player.colorIndex} size={34} />
                <span className="min-w-0 flex-1 truncate text-14 font-semibold text-hueso">
                  {player.nick}
                  {player.playerId === view.me.playerId ? ' · tú' : ''}
                </span>
                <span className="font-mono text-12 text-verde">
                  {boardPlayer?.seals ?? 0} sellos
                </span>
                <span className="font-mono text-12 text-oro">{boardPlayer?.coins ?? 0} oros</span>
              </li>
            );
          })}
        </ol>
        <Button variant="ghost" onClick={onClose}>
          Volver al juego
        </Button>
      </div>
    </Sheet>
  );
}

function InteractionNotice({ view }: { view: GranRondaPlayerView }) {
  const interaction = view.lastInteraction;
  if (!interaction) return null;
  const actor = view.players.find((player) => player.playerId === interaction.actorPlayerId);
  const target = view.players.find((player) => player.playerId === interaction.targetPlayerId);
  const winner = view.players.find((player) => player.playerId === interaction.winnerId);
  return (
    <section className="surface-panel flex items-center gap-3 border-violeta/45 bg-violeta/10 p-3">
      <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-violeta/20 text-24">
        {interaction.kind === 'duel' ? '⚔️' : '🧤'}
      </span>
      <div className="min-w-0">
        <p className="eyebrow text-violeta">
          {interaction.kind === 'duel' ? 'Reto de Oros resuelto' : 'Robo resuelto'}
        </p>
        <p className="mt-1 text-13 leading-relaxed text-hueso">
          {interaction.kind === 'duel'
            ? `${actor?.nick ?? 'Un jugador'} sacó ${interaction.actorRoll}; ${target?.nick ?? 'su rival'}, ${interaction.targetRoll}. ${winner?.nick ?? 'El ganador'} cobra ${interaction.coinsTransferred} Oros.`
            : `${actor?.nick ?? 'Un jugador'} roba ${interaction.coinsTransferred} Oros a ${target?.nick ?? 'su rival'}.`}
        </p>
      </div>
    </section>
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
          <RondaGameScreen
            view={embedded}
            onRequestLeave={() => undefined}
            onAction={sendEmbeddedAction}
            embedded
          />
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
          onClick={() =>
            void useRondaStore.getState().sendAction({ type: 'finishGranRondaMiniGame' })
          }
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
  const remainingAfterShop =
    resolution.kind === 'tienda' ? (view.movement?.remainingSteps ?? 0) : 0;
  const deltaLabel =
    resolution.coinsDelta > 0 ? `+${resolution.coinsDelta}` : `${resolution.coinsDelta}`;
  return (
    <section
      id="gran-ronda-resolution"
      className="surface-panel flex flex-col gap-3 border-oro/35 p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow text-oro">
            {remainingAfterShop > 0 ? 'Parada durante el recorrido' : 'Llegada a la casilla'}
          </p>
          <h2 className="mt-1 text-22 font-semibold text-hueso">{resolution.title}</h2>
        </div>
        <div
          className={`gran-ronda-resolution-icon gran-ronda-resolution-icon--${resolution.kind}`}
        >
          <GranRondaSpaceIcon type={resolution.kind} size={25} />
          {resolution.coinsDelta !== 0 ? <small>{deltaLabel}</small> : null}
        </div>
      </div>
      <p className="text-14 leading-relaxed text-humo">{resolution.message}</p>
      {resolution.sealsDelta > 0 ? (
        <div className="rounded-2xl border border-verde/35 bg-verde/10 px-3 py-2 text-center">
          <p className="eyebrow text-verde">Sello conseguido</p>
          <strong className="mt-1 block font-display text-24 text-hueso">
            {currentTurnNick ?? 'El jugador'} suma +{resolution.sealsDelta}{' '}
            {resolution.sealsDelta === 1 ? 'Sello' : 'Sellos'}
          </strong>
        </div>
      ) : null}
      {can('buyGranRondaSeal') ? (
        <Button onClick={() => send({ type: 'buyGranRondaSeal' })}>
          Comprar {view.stampValue === 1 ? 'Sello' : `${view.stampValue} Sellos`} · {view.stampCost}{' '}
          Oros
        </Button>
      ) : null}
      {resolution.kind === 'tienda' ? (
        <PowerupShop view={view} send={send} enabled={can('buyGranRondaPowerup')} />
      ) : null}
      {can('continueGranRondaResolution') ? (
        <Button onClick={() => send({ type: 'continueGranRondaResolution' })}>
          {remainingAfterShop > 0 ? `Seguir avanzando · quedan ${remainingAfterShop}` : 'Continuar'}
        </Button>
      ) : (
        <p className="text-13 text-humo">
          {currentTurnNick ?? 'La persona activa'} confirma el resultado.
        </p>
      )}
    </section>
  );
}

function MiniGamePanel({
  view,
  can,
  send,
  pending,
  blocked,
  final,
  onFinishReview,
}: {
  view: GranRondaPlayerView;
  can: (action: GranRondaPlayerView['me']['availableActions'][number]) => boolean;
  send: (action: Parameters<ReturnType<typeof useRondaStore.getState>['sendAction']>[0]) => void;
  pending: boolean;
  blocked: boolean;
  final: boolean;
  onFinishReview?: () => void;
}) {
  const [stage, setStage] = useState<'personal' | 'group'>('personal');
  const personalResult = view.miniGame.results?.[view.me.playerId];
  const rankedPlayers = [...view.players].sort((left, right) => {
    const leftRank = view.miniGame.results?.[left.playerId]?.rank ?? Number.POSITIVE_INFINITY;
    const rightRank = view.miniGame.results?.[right.playerId]?.rank ?? Number.POSITIVE_INFINITY;
    return leftRank - rightRank || left.seat - right.seat;
  });
  return (
    <section className="surface-panel gran-ronda-minigame-panel flex flex-col gap-3 border-oro/40 bg-oro/5 p-4 shadow-[0_14px_40px_rgba(246,195,76,0.08)]">
      <MiniGameRoulette gameId={view.miniGame.gameId} title={view.miniGame.title} />
      {stage === 'personal' ? (
        <div className="gran-ronda-personal-result flex flex-col gap-4 rounded-[24px] border border-oro/45 bg-tinta/45 p-4 text-center">
          <div>
            <p className="eyebrow text-oro">Primero, tu resultado</p>
            <h2 className="mt-1 font-display text-28 text-hueso">
              {personalResult ? `Has quedado ${personalResult.rank}.º` : 'Resultado cerrado'}
            </h2>
          </div>
          <PersonalMiniGameResult view={view} />
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-2xl border border-linea bg-tinta/35 px-3 py-3">
              <span className="block text-10 uppercase tracking-wider text-humo">Marcador</span>
              <strong className="mt-1 block font-mono text-22 text-hueso">
                {personalResult?.score ?? '—'}
              </strong>
            </div>
            <div className="rounded-2xl border border-oro/35 bg-oro/10 px-3 py-3">
              <span className="block text-10 uppercase tracking-wider text-humo">Tu premio</span>
              <strong className="mt-1 block font-mono text-22 text-oro">
                +{personalResult?.reward ?? 0} Oros
              </strong>
            </div>
          </div>
          <Button onClick={() => setStage('group')}>Aceptar y ver al resto</Button>
        </div>
      ) : (
        <div className="flex flex-col gap-2 rounded-2xl border border-linea bg-tinta/35 p-3">
          <div>
            <p className="eyebrow text-oro">Resultados de todos</p>
            <h2 className="mt-1 text-22 font-semibold text-hueso">Clasificación del minijuego</h2>
          </div>
          <div className="grid gap-1.5 sm:grid-cols-2">
            {rankedPlayers.map((player) => {
              const result = view.miniGame.results?.[player.playerId];
              const delta = result?.reward ?? view.miniGame.scoreDeltas?.[player.playerId] ?? 0;
              return (
                <div
                  key={player.playerId}
                  className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-12 ${
                    player.playerId === view.me.playerId
                      ? 'border-oro/45 bg-oro/10'
                      : 'border-linea bg-tinta/25'
                  }`}
                >
                  <span className="min-w-0 truncate text-hueso">
                    {result ? `${result.rank}. ` : ''}
                    {player.nick}
                    {result?.outcome === 'bust' ? (
                      <span className="ml-1 text-brasa">· Se pasó</span>
                    ) : null}
                  </span>
                  <strong className={delta > 0 ? 'font-mono text-oro' : 'font-mono text-humo'}>
                    {result?.score ?? '—'} · {delta > 0 ? `+${delta}` : '±0'} Oros
                  </strong>
                </div>
              );
            })}
          </div>
          {final ? (
            <Button className="mt-2" onClick={onFinishReview}>
              Ver clasificación final de la partida
            </Button>
          ) : can('nextRound') ? (
            <Button
              className="mt-2"
              loading={pending}
              disabled={blocked}
              onClick={() => send({ type: 'nextRound' })}
            >
              {pending ? 'Preparando la ronda…' : `Empezar ronda ${view.round + 1}`}
            </Button>
          ) : (
            <p className="mt-2 text-center text-12 text-humo">
              El anfitrión iniciará la ronda {view.round + 1} cuando todos hayan visto el resultado.
            </p>
          )}
        </div>
      )}
    </section>
  );
}

function PersonalMiniGameResult({ view }: { view: GranRondaPlayerView }) {
  const embedded = view.miniGame.embeddedGame;
  const result = view.miniGame.results?.[view.me.playerId];

  if (embedded?.gameId === 'preciojusto') {
    const guess = embedded.price.guesses?.[view.me.playerId];
    return (
      <div className="flex flex-col gap-2 text-left">
        <p className="rounded-2xl bg-oro/10 px-3 py-2 text-14 text-hueso">
          El precio justo era{' '}
          <strong className="font-mono text-oro">
            {formatEuroCents(embedded.price.referencePriceCents)}
          </strong>
          .
        </p>
        <p className="px-1 text-13 leading-relaxed text-humo">
          Tú pusiste <strong className="text-hueso">{formatEuroCents(guess?.priceCents)}</strong> y
          te quedaste a{' '}
          <strong className="text-hueso">{formatEuroCents(guess?.differenceCents)}</strong>.
          {guess?.relativeErrorPercent !== null && guess?.relativeErrorPercent !== undefined
            ? ` Tu diferencia fue del ${String(guess.relativeErrorPercent).replace('.', ',')}%.`
            : ''}
        </p>
      </div>
    );
  }

  if (embedded?.gameId === 'sieteymedia') {
    const playerIndex = embedded.players.findIndex(
      (player) => player.playerId === view.me.playerId,
    );
    const total = playerIndex >= 0 ? embedded.totals[playerIndex] : null;
    const busted = embedded.bustPlayerIds.includes(view.me.playerId);
    return (
      <p className={`text-15 leading-relaxed ${busted ? 'text-brasa' : 'text-hueso'}`}>
        {busted
          ? `Te pasaste con ${formatSevenHalfResult(total)}. Esta era solo la resolución del minijuego; La Gran Ronda continúa.`
          : `Terminaste con ${formatSevenHalfResult(total)} y ${result?.reward ? `ganas ${result.reward} Oros` : 'no sumas Oros'} en esta ronda.`}
      </p>
    );
  }

  const outcome =
    result?.outcome === 'winner'
      ? 'Has ganado el minijuego.'
      : result?.outcome === 'podium'
        ? 'Has entrado en el podio.'
        : result?.outcome === 'bust'
          ? 'Te has pasado y esta vez no sumas premio.'
          : 'Has completado el minijuego.';
  return <p className="text-15 leading-relaxed text-hueso">{outcome}</p>;
}

function formatEuroCents(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return 'sin respuesta';
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(cents / 100);
}

function formatSevenHalfResult(total: number | null | undefined): string {
  return total === null || total === undefined
    ? 'resultado sin registrar'
    : `${String(total).replace('.', ',')} puntos`;
}

function MiniGameRoulette({ gameId, title }: { gameId: string; title: string }) {
  return (
    <div className="gran-ronda-roulette flex items-center gap-3 rounded-2xl border border-white/15 bg-tinta/45 px-3 py-2">
      <span
        className="gran-ronda-roulette-icon grid size-9 shrink-0 place-items-center rounded-xl bg-oro text-tinta"
        aria-hidden="true"
      >
        {gameId === 'musical'
          ? '♫'
          : gameId === 'sieteymedia'
            ? '7½'
            : gameId === 'cinquillo'
              ? '♣'
              : '✦'}
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-mono text-9 uppercase tracking-[0.16em] text-oro">
          La ruleta ha elegido
        </p>
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
  enabled,
}: {
  view: GranRondaPlayerView;
  send: (action: Parameters<ReturnType<typeof useRondaStore.getState>['sendAction']>[0]) => void;
  enabled: boolean;
}) {
  const purchased = new Set(view.resolution?.purchasedPowerups ?? []);
  return (
    <div className="gran-ronda-shop flex flex-col gap-3 overflow-hidden rounded-2xl border border-violeta/35 bg-violeta/10 p-3">
      <div className="gran-ronda-shop__merchant">
        <Image
          src="/games/granronda/tendero-ronda-v2.png"
          alt="Tendero de La Gran Ronda mostrando sus dados y artículos"
          width={1200}
          height={1310}
          sizes="(max-width: 640px) 150px, 190px"
          className="gran-ronda-shop__merchant-image"
        />
        <div className="min-w-0 flex-1">
          <p className="eyebrow text-violeta">Tienda de la Ronda</p>
          <h3 className="mt-1 text-18 font-semibold text-hueso">¿Qué te preparo?</h3>
          <p className="mt-1 text-11 leading-relaxed text-humo">
            Puedes comprar una unidad de cada artículo durante esta visita.
          </p>
          <span className="mt-2 inline-flex rounded-full bg-oro/12 px-2.5 py-1 font-mono text-11 text-oro">
            Tu bolsa · {view.me.coins} Oros
          </span>
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        {(Object.keys(POWERUP_COSTS) as GranRondaPowerupType[]).map((powerup) => {
          const sold = purchased.has(powerup);
          return (
            <button
              key={powerup}
              type="button"
              disabled={sold || !enabled || view.me.coins < POWERUP_COSTS[powerup]}
              onClick={() => send({ type: 'buyGranRondaPowerup', powerup })}
              className="flex min-h-11 items-center justify-between gap-2 rounded-xl border border-violeta/40 bg-tinta/35 px-3 py-2 text-left text-12 text-hueso transition-colors hover:border-violeta disabled:cursor-not-allowed disabled:opacity-55"
            >
              <span className="flex min-w-0 items-center gap-2.5">
                <span className="gran-ronda-shop-item__icon" aria-hidden="true">
                  {POWERUP_ICONS[powerup]}
                </span>
                <span className="min-w-0">
                  <strong className="block text-13">{POWERUP_LABELS[powerup]}</strong>
                  <span className="block text-10 leading-snug text-humo">
                    {POWERUP_DESCRIPTIONS[powerup]}
                  </span>
                  <span className="block text-10 text-humo">
                    En mochila: {view.me.powerups[powerup]}
                  </span>
                </span>
              </span>
              <span className="shrink-0 rounded-full bg-oro/10 px-2 py-1 font-mono text-oro">
                {sold ? 'Comprado' : `${POWERUP_COSTS[powerup]} O`}
              </span>
            </button>
          );
        })}
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
  const [duelWager, setDuelWager] = useState(1);
  const rivals = view.players.filter(
    (player) => player.playerId !== view.me.playerId && !player.eliminated,
  );
  const boardByPlayer = new Map(view.boardPlayers.map((player) => [player.playerId, player]));
  const canUse = can('useGranRondaPowerup');
  if (!canUse && view.lastInteraction?.actorPlayerId !== view.me.playerId) return null;
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-violeta/45 bg-tinta/95 p-3 text-left shadow-[0_16px_44px_rgba(0,0,0,0.45)] backdrop-blur-md">
      {view.lastInteraction?.actorPlayerId === view.me.playerId ? (
        <InteractionNotice view={view} />
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="eyebrow text-violeta">Poderes listos</p>
        <span className="text-11 text-humo">Se usan antes de tirar</span>
      </div>
      {canUse && view.me.powerups.doubleRoll > 0 ? (
        <button
          type="button"
          onClick={() => send({ type: 'useGranRondaPowerup', powerup: 'doubleRoll' })}
          className="flex min-h-11 items-center justify-between rounded-xl border border-oro/45 bg-oro/10 px-3 py-2 text-13 font-semibold text-oro"
        >
          <span>🎲🎲 Tirar dos dados</span>
          <span className="font-mono text-11">×{view.me.powerups.doubleRoll}</span>
        </button>
      ) : null}
      {canUse && view.me.powerups.rivalPenalty > 0 ? (
        <div className="flex flex-col gap-1.5">
          <p className="text-11 text-humo">Guante ladrón · roba hasta 2 Oros</p>
          <div className="grid gap-1.5 sm:grid-cols-2">
            {rivals.map((rival) => (
              <button
                key={rival.playerId}
                type="button"
                onClick={() =>
                  send({
                    type: 'useGranRondaPowerup',
                    powerup: 'rivalPenalty',
                    targetPlayerId: rival.playerId,
                  })
                }
                className="min-h-10 rounded-xl border border-brasa/45 bg-brasa/10 px-3 py-2 text-left text-12 text-hueso"
              >
                Robar a {rival.nick} · tiene {boardByPlayer.get(rival.playerId)?.coins ?? 0}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      {canUse && view.me.powerups.goldDuel > 0 ? (
        <div className="flex flex-col gap-2 rounded-xl border border-oro/35 bg-oro/5 p-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-11 font-semibold text-hueso">⚔️ Reto de Oros</p>
            <span className="font-mono text-10 text-humo">
              Disponible ×{view.me.powerups.goldDuel}
            </span>
          </div>
          <div className="flex items-center gap-1.5" aria-label="Oros apostados">
            <span className="mr-1 text-10 text-humo">Apuesta</span>
            {[1, 3, 5].map((amount) => (
              <button
                key={amount}
                type="button"
                disabled={view.me.coins < amount}
                aria-pressed={duelWager === amount}
                onClick={() => setDuelWager(amount)}
                className={`min-h-8 rounded-full border px-3 font-mono text-11 ${
                  duelWager === amount
                    ? 'border-oro bg-oro text-tinta'
                    : 'border-linea bg-tinta/30 text-hueso'
                } disabled:opacity-35`}
              >
                {amount} O
              </button>
            ))}
          </div>
          <div className="grid gap-1.5 sm:grid-cols-2">
            {rivals.map((rival) => {
              const rivalCoins = boardByPlayer.get(rival.playerId)?.coins ?? 0;
              return (
                <button
                  key={rival.playerId}
                  type="button"
                  disabled={rivalCoins < duelWager || view.me.coins < duelWager}
                  onClick={() =>
                    send({
                      type: 'useGranRondaPowerup',
                      powerup: 'goldDuel',
                      targetPlayerId: rival.playerId,
                      wager: duelWager,
                    })
                  }
                  className="min-h-10 rounded-xl border border-oro/40 bg-oro/10 px-3 py-2 text-left text-12 text-hueso disabled:opacity-35"
                >
                  Retar a {rival.nick} · {rivalCoins} O
                </button>
              );
            })}
          </div>
          <p className="text-10 leading-relaxed text-humo">
            Cada uno tira un dado. El ganador recibe la apuesta del rival; los empates se repiten.
          </p>
        </div>
      ) : null}
    </div>
  );
}
