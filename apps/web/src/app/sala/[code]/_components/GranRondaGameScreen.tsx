'use client';

import Image from 'next/image';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
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
import { MatizArtwork } from '@/components/matiz/MatizGame';
import { Button } from '@/components/ui/Button';
import { Pill } from '@/components/ui/Pill';
import { Sheet } from '@/components/ui/Sheet';
import { useRondaStore } from '@/lib/store';
import { MATIZ_COLOR_TOKENS } from '@/lib/tokens';
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
  goldDuel: 'Reta a un rival a un minijuego aleatorio y apuesta Oros.',
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
            ? view.movement?.path.length === 1
              ? 'Elige si avanzas hacia delante o hacia atrás. El tramo posible está iluminado.'
              : 'Has llegado a un cruce: elige por qué camino continúas.'
            : `${currentTurn?.nick ?? 'La persona activa'} está eligiendo por dónde continúa.`}
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
                  <span className="gran-ronda-player-token" role="img" aria-label={player.nick}>
                    {player.tokenIcon ?? '🎲'}
                  </span>
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
                <span className="gran-ronda-player-token" role="img" aria-label={player.nick}>
                  {player.tokenIcon ?? '🎲'}
                </span>
                <span className="min-w-0 flex-1 truncate text-14 font-semibold text-hueso">
                  {player.nick}
                  {player.playerId === view.me.playerId ? ' · tú' : ''}
                </span>
                <span className="font-mono text-12 text-verde">
                  {boardPlayer?.seals ?? 0} sellos
                </span>
                <span className="font-mono text-12 text-oro">{boardPlayer?.coins ?? 0} oros</span>
                {(boardPlayer?.skipTurns ?? 0) > 0 ? (
                  <span className="rounded-full bg-brasa/15 px-2 py-1 text-10 font-semibold text-brasa">
                    🔒 pierde turno
                  </span>
                ) : null}
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
  const duelGame = interaction.gameId ? embeddedGameLabel(interaction.gameId) : null;
  const duelMessage =
    interaction.winnerId === null
      ? `${actor?.nick ?? 'Un jugador'} y ${target?.nick ?? 'su rival'} han empatado${duelGame ? ` en ${duelGame}` : ''}; nadie pierde Oros.`
      : duelGame
        ? `${actor?.nick ?? 'Un jugador'} retó a ${target?.nick ?? 'su rival'} en ${duelGame}. ${winner?.nick ?? 'El ganador'} cobra ${formatOroAmount(interaction.coinsTransferred)}.`
        : `${actor?.nick ?? 'Un jugador'} sacó ${interaction.actorRoll}; ${target?.nick ?? 'su rival'}, ${interaction.targetRoll}. ${winner?.nick ?? 'El ganador'} cobra ${formatOroAmount(interaction.coinsTransferred)}.`;
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
            ? duelMessage
            : `${actor?.nick ?? 'Un jugador'} roba ${formatOroAmount(interaction.coinsTransferred)} a ${target?.nick ?? 'su rival'}.`}
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
          <p className="eyebrow text-oro">
            {view.duel ? 'Reto de Oros en curso' : 'Minijuego de la ronda'}
          </p>
          <p className="mt-1 text-13 text-humo">
            {view.duel
              ? `${view.players.find((player) => player.playerId === view.duel?.actorPlayerId)?.nick ?? 'Un jugador'} reta a ${view.players.find((player) => player.playerId === view.duel?.targetPlayerId)?.nick ?? 'su rival'} por ${formatOroAmount(view.duel.wager)}.`
              : 'Desplázate dentro de esta pantalla para jugar.'}
          </p>
        </div>
        <span className="rounded-full border border-oro/40 bg-oro/10 px-2.5 py-1 font-mono text-10 uppercase tracking-wider text-oro">
          {embeddedGameLabel(embedded.gameId)}
          {embeddedRoundLabel(embedded)}
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

function embeddedRoundLabel(
  embedded: NonNullable<GranRondaPlayerView['me']['embeddedGame']>,
): string {
  if (
    ![
      'preciojusto',
      'banderas',
      'cifras',
      'quienloharia',
      'completalafrase',
      'colores',
      'mayoria',
      'escala',
      'matiz',
    ].includes(embedded.gameId)
  ) {
    return '';
  }
  const configuredRounds = (embedded.config as { rounds?: number }).rounds;
  return typeof configuredRounds === 'number' ? ` · ${embedded.round}/${configuredRounds}` : '';
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
  const resultPlayers = granRondaResultPlayers(view);
  const isDuelParticipant = resultPlayers.some((player) => player.playerId === view.me.playerId);
  const [stage, setStage] = useState<'personal' | 'group'>(
    view.duel && !isDuelParticipant ? 'group' : 'personal',
  );
  const personalResult = view.miniGame.results?.[view.me.playerId];
  const rankedPlayers = [...resultPlayers].sort((left, right) => {
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
            <p className="eyebrow text-oro">
              {view.duel ? 'Tu resultado en el reto' : 'Primero, tu resultado'}
            </p>
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
              <span className="block text-10 uppercase tracking-wider text-humo">
                {view.duel ? 'Balance del reto' : 'Tu premio'}
              </span>
              <strong
                className={`mt-1 block font-mono text-22 ${(personalResult?.reward ?? 0) < 0 ? 'text-brasa' : 'text-oro'}`}
              >
                {formatOroDelta(personalResult?.reward ?? 0)}
              </strong>
            </div>
          </div>
          <Button onClick={() => setStage('group')}>
            {view.duel ? 'Ver resultado del reto' : 'Aceptar y ver al resto'}
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-2 rounded-2xl border border-linea bg-tinta/35 p-3">
          <div>
            <p className="eyebrow text-oro">
              {view.duel ? 'Reto de Oros resuelto' : 'Resultados de todos'}
            </p>
            <h2 className="mt-1 text-22 font-semibold text-hueso">
              {view.duel ? 'Resultado cara a cara' : 'Clasificación del minijuego'}
            </h2>
          </div>
          <MiniGameAnswerReview view={view} />
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
                    <span className="mr-1" aria-hidden="true">
                      {player.tokenIcon ?? '🎲'}
                    </span>
                    {result ? `${result.rank}. ` : ''}
                    {player.nick}
                    {result?.outcome === 'bust' ? (
                      <span className="ml-1 text-brasa">· Se pasó</span>
                    ) : null}
                  </span>
                  <strong
                    className={
                      delta > 0
                        ? 'font-mono text-oro'
                        : delta < 0
                          ? 'font-mono text-brasa'
                          : 'font-mono text-humo'
                    }
                  >
                    {result?.score ?? '—'} · {formatOroDelta(delta)}
                  </strong>
                </div>
              );
            })}
          </div>
          {can('continueGranRondaDuel') ? (
            <Button
              className="mt-2"
              loading={pending}
              disabled={blocked}
              onClick={() => send({ type: 'continueGranRondaDuel' })}
            >
              {pending ? 'Volviendo al mapa…' : 'Volver al turno y tirar'}
            </Button>
          ) : final ? (
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
              {view.duel
                ? 'La persona que lanzó el reto retomará ahora su tirada.'
                : `El anfitrión iniciará la ronda ${view.round + 1} cuando todos hayan visto el resultado.`}
            </p>
          )}
        </div>
      )}
    </section>
  );
}

function granRondaResultPlayers(view: GranRondaPlayerView) {
  if (!view.duel) return view.players;
  const participantIds = new Set([view.duel.actorPlayerId, view.duel.targetPlayerId]);
  return view.players.filter((player) => participantIds.has(player.playerId));
}

function PersonalMiniGameResult({ view }: { view: GranRondaPlayerView }) {
  const embedded = view.miniGame.embeddedGame;
  const result = view.miniGame.results?.[view.me.playerId];

  if (embedded?.gameId === 'banderas') {
    const selectedId = embedded.flags.answers?.[view.me.playerId] ?? null;
    const selected = embedded.flags.options.find((option) => option.id === selectedId);
    const correct = embedded.flags.options.find(
      (option) => option.id === embedded.flags.correctOptionId,
    );
    const didHit = selectedId !== null && selectedId === embedded.flags.correctOptionId;
    return (
      <div className="grid gap-2 text-left sm:grid-cols-2">
        <AnswerCallout
          label="Tu respuesta"
          value={selected?.label ?? 'Sin respuesta'}
          state={didHit ? 'correct' : 'wrong'}
        />
        <AnswerCallout label="Respuesta correcta" value={correct?.label ?? '—'} state="correct" />
        {embedded.flags.explanation ? (
          <p className="sm:col-span-2 px-1 text-13 leading-relaxed text-humo">
            {embedded.flags.explanation}
          </p>
        ) : null}
      </div>
    );
  }

  if (embedded?.gameId === 'matiz') {
    const answer = embedded.party.answers?.[view.me.playerId] ?? null;
    const target = embedded.party.targetHex;
    const accuracy = embedded.party.scoreDeltas?.[view.me.playerId] ?? result?.score ?? 0;
    return (
      <div className="flex flex-col gap-3 text-left">
        <div className="grid grid-cols-2 gap-2">
          <MatizComparisonCard
            label="Original"
            challengeId={embedded.party.challengeId}
            color={target}
          />
          <MatizComparisonCard
            label="Tu mezcla"
            challengeId={embedded.party.challengeId}
            color={answer}
          />
        </div>
        <p className="rounded-2xl border border-oro/35 bg-oro/10 px-3 py-2 text-center text-14 text-hueso">
          Has conseguido <strong className="font-mono text-oro">{accuracy}% de precisión</strong>.
        </p>
      </div>
    );
  }

  if (embedded?.gameId === 'colores') {
    const answer = embedded.party.answers?.[view.me.playerId] ?? [];
    const correct = embedded.party.correctColors ?? [];
    const didHit = sameStringSet(answer, correct);
    return (
      <div className="grid gap-2 text-left sm:grid-cols-2">
        <ColorAnswerCard
          label="Tu combinación"
          colors={answer}
          state={didHit ? 'correct' : 'wrong'}
        />
        <ColorAnswerCard label="Combinación correcta" colors={correct} state="correct" />
      </div>
    );
  }

  if (embedded?.gameId === 'cifras') {
    const itemLabel = (itemId: string) =>
      embedded.cifras.items.find((item) => item.id === itemId)?.label ?? itemId;
    if (embedded.cifras.kind === 'estimate') {
      const estimate = embedded.cifras.estimates?.[view.me.playerId];
      const unit = embedded.cifras.unit ? ` ${embedded.cifras.unit}` : '';
      return (
        <div className="flex flex-col gap-2 text-left">
          <AnswerCallout
            label="Lo correcto era"
            value={`${formatCifrasNumber(embedded.cifras.referenceValue)}${unit}`}
            state="correct"
          />
          <AnswerCallout
            label="Tú has puesto"
            value={
              estimate?.value === null || estimate?.value === undefined
                ? 'Sin respuesta'
                : `${formatCifrasNumber(estimate.value)}${unit}`
            }
            state="wrong"
          />
          <p className="rounded-2xl border border-oro/35 bg-oro/10 px-3 py-2 text-center text-14 text-hueso">
            {estimate?.errorPercent === null || estimate?.errorPercent === undefined ? (
              'No se pudo calcular tu distancia al resultado.'
            ) : (
              <>
                Te has quedado a un{' '}
                <strong className="font-mono text-oro">
                  {String(estimate.errorPercent).replace('.', ',')}% de error
                </strong>
                .
              </>
            )}
          </p>
        </div>
      );
    }

    if (embedded.cifras.kind === 'order') {
      const order = embedded.cifras.orders?.[view.me.playerId];
      const accuracy = order
        ? Math.round((order.correctPositions / embedded.cifras.items.length) * 100)
        : 0;
      return (
        <div className="flex flex-col gap-2 text-left">
          <AnswerCallout
            label="Orden correcto"
            value={order?.correctOrder.map(itemLabel).join(' → ') ?? '—'}
            state="correct"
          />
          <AnswerCallout
            label="Tu orden"
            value={order?.order?.map(itemLabel).join(' → ') ?? 'Sin respuesta'}
            state={accuracy === 100 ? 'correct' : 'wrong'}
          />
          <p className="text-center text-14 text-hueso">
            Has acertado <strong className="font-mono text-oro">{accuracy}% del orden</strong>.
          </p>
        </div>
      );
    }

    const choice = embedded.cifras.choices?.[view.me.playerId];
    return (
      <div className="grid gap-2 text-left sm:grid-cols-2">
        <AnswerCallout
          label="Lo correcto era"
          value={choice ? itemLabel(choice.correctOptionId) : '—'}
          state="correct"
        />
        <AnswerCallout
          label="Tú has puesto"
          value={choice?.selectedOptionId ? itemLabel(choice.selectedOptionId) : 'Sin respuesta'}
          state={choice?.correct ? 'correct' : 'wrong'}
        />
      </div>
    );
  }

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
          : `Terminaste con ${formatSevenHalfResult(total)} y ${result?.reward ? `ganas ${formatOroAmount(result.reward)}` : 'no sumas Oros'} en esta ronda.`}
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

function MiniGameAnswerReview({ view }: { view: GranRondaPlayerView }) {
  const embedded = view.miniGame.embeddedGame;
  if (!embedded) return null;
  const reviewPlayers = granRondaResultPlayers(view);

  if (embedded.gameId === 'banderas') {
    return (
      <AnswerReviewFrame title="Qué respondió cada persona">
        <div className="grid gap-2 sm:grid-cols-2">
          {embedded.flags.options.map((option) => {
            const isCorrect = option.id === embedded.flags.correctOptionId;
            const voters = reviewPlayers.filter(
              (player) => embedded.flags.answers?.[player.playerId] === option.id,
            );
            return (
              <div
                key={option.id}
                className={`rounded-2xl border p-3 ${
                  isCorrect
                    ? 'border-verde bg-verde/15'
                    : voters.length > 0
                      ? 'border-brasa/70 bg-brasa/10'
                      : 'border-linea bg-tinta/25'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <strong className="text-14 text-hueso">{option.label}</strong>
                  <span
                    className={isCorrect ? 'text-11 font-semibold text-verde' : 'text-11 text-humo'}
                  >
                    {isCorrect ? '✓ Correcta' : `${voters.length} votos`}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {voters.length > 0 ? (
                    voters.map((player) => (
                      <ReviewPlayerChip key={player.playerId} player={player} />
                    ))
                  ) : (
                    <span className="text-11 text-humo">Nadie la eligió</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        {embedded.flags.explanation ? (
          <p className="rounded-xl bg-tinta/35 px-3 py-2 text-12 leading-relaxed text-humo">
            {embedded.flags.explanation}
          </p>
        ) : null}
      </AnswerReviewFrame>
    );
  }

  if (embedded.gameId === 'colores') {
    const correct = embedded.party.correctColors ?? [];
    return (
      <AnswerReviewFrame title="Combinaciones de la mesa">
        <ColorAnswerCard label="Respuesta correcta" colors={correct} state="correct" />
        <div className="grid gap-2 sm:grid-cols-2">
          {reviewPlayers.map((player) => {
            const colors = embedded.party.answers?.[player.playerId] ?? [];
            return (
              <ColorAnswerCard
                key={player.playerId}
                label={`${player.tokenIcon ?? '🎲'} ${player.nick}`}
                colors={colors}
                state={sameStringSet(colors, correct) ? 'correct' : 'wrong'}
              />
            );
          })}
        </div>
      </AnswerReviewFrame>
    );
  }

  if (embedded.gameId === 'matiz') {
    return (
      <AnswerReviewFrame title="Original y mezclas de la mesa">
        <MatizComparisonCard
          label="Color original"
          challengeId={embedded.party.challengeId}
          color={embedded.party.targetHex}
        />
        <div className="grid gap-2 sm:grid-cols-2">
          {reviewPlayers.map((player) => {
            const answer = embedded.party.answers?.[player.playerId] ?? null;
            const accuracy = embedded.party.scoreDeltas?.[player.playerId] ?? 0;
            return (
              <div
                key={player.playerId}
                className="rounded-2xl border border-linea bg-tinta/25 p-2"
              >
                <MatizArtwork
                  challengeId={embedded.party.challengeId}
                  color={answer ?? MATIZ_COLOR_TOKENS.placeholder}
                  className="!rounded-xl"
                />
                <div className="mt-2 flex items-center justify-between gap-2 px-1 text-12">
                  <span className="min-w-0 truncate text-hueso">
                    {player.tokenIcon ?? '🎲'} {player.nick}
                  </span>
                  <strong className="font-mono text-oro">{accuracy}%</strong>
                </div>
              </div>
            );
          })}
        </div>
      </AnswerReviewFrame>
    );
  }

  if (embedded.gameId === 'mayoria') {
    return (
      <AnswerReviewFrame title="Respuestas de la mesa">
        <div className="grid gap-1.5 sm:grid-cols-2">
          {reviewPlayers.map((player) => {
            const answer = embedded.party.answers?.[player.playerId] ?? 'Sin respuesta';
            const isMajority = embedded.party.majorityAnswers?.includes(answer) ?? false;
            return (
              <AnswerPlayerRow
                key={player.playerId}
                player={player}
                value={answer}
                detail={isMajority ? 'Mayoría' : undefined}
                state={isMajority ? 'correct' : 'neutral'}
              />
            );
          })}
        </div>
      </AnswerReviewFrame>
    );
  }

  if (embedded.gameId === 'escala') {
    return (
      <AnswerReviewFrame title={`Punto exacto: ${embedded.party.target ?? '—'}/100`}>
        <div className="grid gap-1.5 sm:grid-cols-2">
          {reviewPlayers
            .filter((player) => player.playerId !== embedded.party.cluePlayerId)
            .map((player) => {
              const guess = embedded.party.guesses?.[player.playerId];
              const distance =
                guess === undefined || embedded.party.target === null
                  ? null
                  : Math.abs(guess - embedded.party.target);
              return (
                <AnswerPlayerRow
                  key={player.playerId}
                  player={player}
                  value={guess === undefined ? 'Sin respuesta' : `${guess}/100`}
                  detail={distance === null ? undefined : `a ${distance}`}
                />
              );
            })}
        </div>
      </AnswerReviewFrame>
    );
  }

  if (embedded.gameId === 'preciojusto') {
    return (
      <AnswerReviewFrame
        title={`Precio real: ${formatEuroCents(embedded.price.referencePriceCents)}`}
      >
        <div className="grid gap-1.5 sm:grid-cols-2">
          {reviewPlayers.map((player) => {
            const guess = embedded.price.guesses?.[player.playerId];
            return (
              <AnswerPlayerRow
                key={player.playerId}
                player={player}
                value={formatEuroCents(guess?.priceCents)}
                detail={
                  guess?.differenceCents === null || guess?.differenceCents === undefined
                    ? undefined
                    : `a ${formatEuroCents(guess.differenceCents)}`
                }
              />
            );
          })}
        </div>
      </AnswerReviewFrame>
    );
  }

  if (embedded.gameId === 'quienloharia') {
    return (
      <AnswerReviewFrame title="Quién votó a quién">
        <div className="grid gap-1.5 sm:grid-cols-2">
          {reviewPlayers.map((player) => {
            const votedId = embedded.who.votes?.[player.playerId];
            const voted = reviewPlayers.find((candidate) => candidate.playerId === votedId);
            return (
              <AnswerPlayerRow
                key={player.playerId}
                player={player}
                value={voted ? `${voted.tokenIcon ?? '🎲'} ${voted.nick}` : 'Sin voto'}
              />
            );
          })}
        </div>
      </AnswerReviewFrame>
    );
  }

  if (embedded.gameId === 'completalafrase') {
    return (
      <AnswerReviewFrame title={`Solución: ${embedded.sentence.canonicalAnswer ?? '—'}`}>
        <div className="grid gap-1.5 sm:grid-cols-2">
          {reviewPlayers.map((player) => {
            const answer = embedded.sentence.answers?.[player.playerId];
            return (
              <AnswerPlayerRow
                key={player.playerId}
                player={player}
                value={answer?.answer ?? 'Sin respuesta'}
                detail={answer?.correct ? 'Acierto' : 'Fallo'}
                state={answer?.correct ? 'correct' : 'wrong'}
              />
            );
          })}
        </div>
      </AnswerReviewFrame>
    );
  }

  if (embedded.gameId === 'cifras') {
    const itemLabel = (itemId: string) =>
      embedded.cifras.items.find((item) => item.id === itemId)?.label ?? itemId;
    return (
      <AnswerReviewFrame title="Respuestas de la mesa">
        {embedded.cifras.kind === 'order' && embedded.cifras.orders ? (
          <p className="rounded-xl border border-verde/40 bg-verde/10 px-3 py-2 text-12 text-hueso">
            Orden correcto:{' '}
            <strong>
              {Object.values(embedded.cifras.orders)[0]?.correctOrder.map(itemLabel).join(' → ') ??
                '—'}
            </strong>
          </p>
        ) : null}
        <div className="grid gap-1.5 sm:grid-cols-2">
          {reviewPlayers.map((player) => {
            const estimate = embedded.cifras.estimates?.[player.playerId];
            const choice = embedded.cifras.choices?.[player.playerId];
            const order = embedded.cifras.orders?.[player.playerId];
            const value = estimate
              ? `${estimate.value ?? 'Sin respuesta'} ${embedded.cifras.unit}`.trim()
              : choice
                ? choice.selectedOptionId
                  ? itemLabel(choice.selectedOptionId)
                  : 'Sin respuesta'
                : (order?.order?.map(itemLabel).join(' → ') ?? 'Sin respuesta');
            const correct =
              choice?.correct ??
              (order ? order.correctPositions === embedded.cifras.items.length : undefined);
            const detail =
              estimate?.errorPercent !== null && estimate?.errorPercent !== undefined
                ? `error ${String(estimate.errorPercent).replace('.', ',')}%`
                : order
                  ? `${order.correctPositions}/${embedded.cifras.items.length} posiciones`
                  : choice
                    ? choice.correct
                      ? 'Acierto'
                      : 'Fallo'
                    : undefined;
            return (
              <AnswerPlayerRow
                key={player.playerId}
                player={player}
                value={value}
                detail={detail}
                state={correct === undefined ? 'neutral' : correct ? 'correct' : 'wrong'}
              />
            );
          })}
        </div>
      </AnswerReviewFrame>
    );
  }

  return null;
}

function AnswerReviewFrame({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-mesa/40 p-3">
      <p className="text-12 font-semibold uppercase tracking-[0.1em] text-oro">{title}</p>
      {children}
    </section>
  );
}

function ReviewPlayerChip({ player }: { player: GranRondaPlayerView['players'][number] }) {
  return (
    <span className="rounded-full border border-white/10 bg-tinta/35 px-2 py-1 text-11 text-hueso">
      {player.tokenIcon ?? '🎲'} {player.nick}
    </span>
  );
}

function AnswerPlayerRow({
  player,
  value,
  detail,
  state = 'neutral',
}: {
  player: GranRondaPlayerView['players'][number];
  value: string;
  detail?: string;
  state?: 'correct' | 'wrong' | 'neutral';
}) {
  const style =
    state === 'correct'
      ? 'border-verde/55 bg-verde/10'
      : state === 'wrong'
        ? 'border-brasa/55 bg-brasa/10'
        : 'border-linea bg-tinta/25';
  return (
    <div className={`rounded-xl border px-3 py-2 ${style}`}>
      <div className="flex items-center justify-between gap-2 text-11">
        <span className="min-w-0 truncate font-semibold text-hueso">
          {player.tokenIcon ?? '🎲'} {player.nick}
        </span>
        {detail ? <span className="shrink-0 text-humo">{detail}</span> : null}
      </div>
      <p className="mt-1 break-words text-13 text-hueso">{value}</p>
    </div>
  );
}

function AnswerCallout({
  label,
  value,
  state,
}: {
  label: string;
  value: string;
  state: 'correct' | 'wrong';
}) {
  return (
    <div
      className={`rounded-2xl border px-3 py-3 ${
        state === 'correct' ? 'border-verde bg-verde/15' : 'border-brasa bg-brasa/15'
      }`}
    >
      <span className="text-10 uppercase tracking-wider text-humo">{label}</span>
      <strong className="mt-1 block text-16 text-hueso">{value}</strong>
    </div>
  );
}

function MatizComparisonCard({
  label,
  challengeId,
  color,
}: {
  label: string;
  challengeId: string;
  color: string | null;
}) {
  return (
    <div className="rounded-2xl border border-linea bg-tinta/25 p-2">
      <MatizArtwork
        challengeId={challengeId}
        color={color ?? MATIZ_COLOR_TOKENS.placeholder}
        className="!rounded-xl"
      />
      <div className="mt-2 flex items-center justify-between gap-1 px-1">
        <span className="text-11 font-semibold text-hueso">{label}</span>
        <span className="font-mono text-10 uppercase text-humo">{color ?? '—'}</span>
      </div>
    </div>
  );
}

const MINI_COLOR_CLASSES: Record<string, string> = {
  rojo: 'bg-ficha-rojo',
  azul: 'bg-ficha-azul',
  verde: 'bg-ficha-verde',
  amarillo: 'bg-ficha-amarillo',
  naranja: 'bg-ficha-naranja',
  morado: 'bg-ficha-morado',
  rosa: 'bg-ficha-rosa',
  blanco: 'bg-ficha-blanco',
  negro: 'bg-ficha-negro',
  marrón: 'bg-ficha-marron',
  gris: 'bg-ficha-gris',
};

function ColorAnswerCard({
  label,
  colors,
  state,
}: {
  label: string;
  colors: string[];
  state: 'correct' | 'wrong';
}) {
  return (
    <div
      className={`rounded-2xl border px-3 py-2 ${
        state === 'correct' ? 'border-verde/60 bg-verde/10' : 'border-brasa/60 bg-brasa/10'
      }`}
    >
      <p className="text-11 font-semibold text-hueso">{label}</p>
      <div className="mt-2 flex min-h-7 flex-wrap gap-1.5">
        {colors.length > 0 ? (
          colors.map((color, index) => (
            <span
              key={`${color}-${index}`}
              className={`grid size-7 place-items-center rounded-full border border-white/50 text-9 font-bold uppercase text-white shadow ${MINI_COLOR_CLASSES[color] ?? 'bg-humo'}`}
              title={color}
            >
              {color.slice(0, 1)}
            </span>
          ))
        ) : (
          <span className="text-11 text-humo">Sin respuesta</span>
        )}
      </div>
    </div>
  );
}

function sameStringSet(left: string[], right: string[]): boolean {
  return (
    left.length === right.length &&
    [...left].sort().every((value, index) => value === [...right].sort()[index])
  );
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

function formatCifrasNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return new Intl.NumberFormat('es-ES', { maximumFractionDigits: 2 }).format(value);
}

function formatCoinDelta(value: number): string {
  if (value > 0) return `+${value}`;
  if (value < 0) return String(value);
  return '±0';
}

function oroLabel(value: number): 'Oro' | 'Oros' {
  return Math.abs(value) === 1 ? 'Oro' : 'Oros';
}

function formatOroAmount(value: number): string {
  return `${value} ${oroLabel(value)}`;
}

function formatOroDelta(value: number): string {
  return `${formatCoinDelta(value)} ${oroLabel(value)}`;
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
            Tu bolsa · {formatOroAmount(view.me.coins)}
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
  const [duelTargetId, setDuelTargetId] = useState('');
  const rivals = view.players.filter(
    (player) => player.playerId !== view.me.playerId && !player.eliminated,
  );
  const boardByPlayer = new Map(view.boardPlayers.map((player) => [player.playerId, player]));
  const affordableDuelRivals = rivals.filter(
    (rival) => (boardByPlayer.get(rival.playerId)?.coins ?? 0) >= duelWager,
  );
  const duelTarget =
    affordableDuelRivals.find((rival) => rival.playerId === duelTargetId) ??
    affordableDuelRivals[0];
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
          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
            <label className="flex min-w-0 flex-col gap-1 text-10 text-humo">
              Rival elegido
              <select
                value={duelTarget?.playerId ?? ''}
                onChange={(event) => setDuelTargetId(event.target.value)}
                className="form-control min-h-10 w-full px-3 text-12 text-hueso"
              >
                {affordableDuelRivals.map((rival) => (
                  <option key={rival.playerId} value={rival.playerId}>
                    {rival.nick} · {formatOroAmount(boardByPlayer.get(rival.playerId)?.coins ?? 0)}
                  </option>
                ))}
              </select>
            </label>
            <Button
              type="button"
              disabled={!duelTarget || view.me.coins < duelWager}
              onClick={() => {
                if (!duelTarget) return;
                send({
                  type: 'useGranRondaPowerup',
                  powerup: 'goldDuel',
                  targetPlayerId: duelTarget.playerId,
                  wager: duelWager,
                });
              }}
              className="sm:self-end"
            >
              Retar ahora
            </Button>
          </div>
          <p className="text-10 leading-relaxed text-humo">
            La ruleta elegirá un minijuego solo para vosotros. El turno se pausa y el ganador cobra
            la apuesta; si empatáis, nadie pierde Oros.
          </p>
        </div>
      ) : null}
    </div>
  );
}
