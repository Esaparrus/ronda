'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { GranRondaPlayerView, GranRondaPowerupType } from '@ronda/protocol';
import { GranRondaBoard } from '@/components/granronda/GranRondaBoard';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Pill } from '@/components/ui/Pill';
import { useRondaStore } from '@/lib/store';

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

  useEffect(() => {
    if (!canAdvance) return;
    const timer = window.setTimeout(() => {
      void useRondaStore.getState().sendAction({ type: 'advanceGranRondaMovement' });
    }, 520);
    return () => window.clearTimeout(timer);
  }, [canAdvance, view.me.playerId, view.movement?.path.length, view.movement?.remainingSteps]);

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

      <section className="surface-panel p-2.5">
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

      {view.phase === 'minigameInput' || view.phase === 'minigameReveal' ? (
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
        <section className="surface-panel flex flex-col gap-3 border-oro/35 p-4 text-center">
          <p className="eyebrow text-oro">Camino abierto</p>
          <h2 className="text-20 font-semibold text-hueso">
            {can('chooseGranRondaPath') ? 'Elige una casilla iluminada en el mapa' : `${currentTurn?.nick ?? 'La persona activa'} elige camino`}
          </h2>
          <p className="text-13 text-humo">
            El dado ha salido {view.movement?.roll ?? '—'}. Las opciones aparecen marcadas en oro.
          </p>
          {can('chooseGranRondaPath') ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {view.routeOptions.map((spaceId) => {
                const space = view.board.find((candidate) => candidate.id === spaceId);
                return (
                  <Button key={spaceId} variant="ghost" onClick={() => send({ type: 'chooseGranRondaPath', nextSpaceId: spaceId })}>
                    Ir a {space?.label ?? 'la siguiente casilla'}
                  </Button>
                );
              })}
            </div>
          ) : null}
        </section>
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
  const correct = view.miniGame.correctOptionId;
  return (
    <section className="surface-panel flex flex-col gap-3 border-oro/40 bg-oro/5 p-4 shadow-[0_14px_40px_rgba(246,195,76,0.08)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow text-oro">Juego de la ronda</p>
          <h2 className="mt-1 text-22 font-semibold text-hueso">{view.miniGame.title}</h2>
          <p className="mt-1 text-14 leading-relaxed text-humo">{view.miniGame.prompt}</p>
        </div>
        <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-oro/15 font-display text-20 text-oro">?</span>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {view.miniGame.options.map((option) => {
          const isSelected = selected === option.id;
          const isCorrect = revealed && correct === option.id;
          const isWrongSelected = revealed && isSelected && !isCorrect;
          return (
            <button
              key={option.id}
              type="button"
              disabled={revealed || !can('submitGranRondaAnswer')}
              onClick={() => send({ type: 'submitGranRondaAnswer', optionId: option.id })}
              className={`min-h-12 rounded-2xl border px-3 py-2 text-left text-14 font-semibold transition-[transform,background-color,border-color,opacity] active:scale-[0.985] disabled:cursor-default disabled:opacity-85 ${
                isCorrect
                  ? 'border-equipo-turquesa bg-equipo-turquesa/15 text-equipo-turquesa'
                  : isWrongSelected
                    ? 'border-brasa bg-brasa/15 text-brasa'
                    : isSelected
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
      {revealed ? (
        <div className="flex flex-col gap-2 rounded-2xl border border-linea bg-tinta/35 p-3">
          <p className="text-12 text-humo">
            Respuesta correcta: <strong className="text-equipo-turquesa">{view.miniGame.options.find((option) => option.id === correct)?.label ?? '—'}</strong>
          </p>
          <div className="grid gap-1.5 sm:grid-cols-2">
            {view.players.map((player) => {
              const delta = view.miniGame.scoreDeltas?.[player.playerId] ?? 0;
              return (
                <div key={player.playerId} className="flex items-center justify-between gap-2 text-12">
                  <span className="truncate text-hueso">{player.nick}</span>
                  <strong className={delta > 0 ? 'font-mono text-oro' : 'font-mono text-humo'}>
                    {delta > 0 ? `+${delta}` : '±0'} Oros
                  </strong>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-2 text-12 text-humo">
          <span>{view.miniGame.submittedPlayerIds.length}/{view.players.length} respuestas bloqueadas</span>
          <span>Acertar: +4 · fallar: +1</span>
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
