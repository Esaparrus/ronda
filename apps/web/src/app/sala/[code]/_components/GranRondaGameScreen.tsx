'use client';

import { useRouter } from 'next/navigation';
import type { GranRondaPlayerView } from '@ronda/protocol';
import { GranRondaBoard } from '@/components/granronda/GranRondaBoard';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Pill } from '@/components/ui/Pill';
import { useRondaStore } from '@/lib/store';

export interface GranRondaGameScreenProps {
  view: GranRondaPlayerView;
  onRequestLeave: () => void;
}

export function GranRondaGameScreen({ view, onRequestLeave }: GranRondaGameScreenProps) {
  const router = useRouter();
  const me = view.players.find((player) => player.playerId === view.me.playerId);
  const isHost = me?.isHost ?? false;
  const currentTurn = view.players.find((player) => player.playerId === view.turnPlayerId);
  const can = (action: GranRondaPlayerView['me']['availableActions'][number]) =>
    view.me.availableActions.includes(action);

  function send(action: Parameters<ReturnType<typeof useRondaStore.getState>['sendAction']>[0]) {
    void useRondaStore.getState().sendAction(action);
  }

  async function handleExit() {
    await useRondaStore.getState().leave();
    router.push('/');
  }

  const final = view.status === 'gameEnd';
  const standings = [...view.players].sort((left, right) => {
    const leftBoard = view.boardPlayers.find((player) => player.playerId === left.playerId);
    const rightBoard = view.boardPlayers.find((player) => player.playerId === right.playerId);
    return (rightBoard?.seals ?? 0) - (leftBoard?.seals ?? 0) || (rightBoard?.coins ?? 0) - (leftBoard?.coins ?? 0);
  });

  return (
    <main className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col gap-3 overflow-y-auto px-3 pb-[max(0.8rem,env(safe-area-inset-bottom))] pt-3">
      <header className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="eyebrow">Tablero y minijuegos</p>
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
          compact
        />
      </section>

      {!final && view.phase === 'movement' ? (
        <section className="surface-panel flex flex-col gap-3 p-4 text-center">
          <p className="eyebrow">Movimiento</p>
          <h2 className="text-20 font-semibold text-hueso">
            {can('rollGranRonda') ? 'Tu turno' : `Turno de ${currentTurn?.nick ?? 'la mesa'}`}
          </h2>
          <p className="text-13 text-humo">
            {can('rollGranRonda')
              ? 'Tira el dado y deja que el tablero resuelva la casilla.'
              : 'Mira cómo avanza la ficha y prepara la siguiente decisión.'}
          </p>
          {can('rollGranRonda') ? (
            <Button onClick={() => send({ type: 'rollGranRonda' })}>Tirar el dado</Button>
          ) : null}
        </section>
      ) : null}

      {!final && view.phase === 'routeChoice' ? (
        <section className="surface-panel flex flex-col gap-3 p-4 text-center">
          <p className="eyebrow">Bifurcación</p>
          <h2 className="text-20 font-semibold text-hueso">
            {can('chooseGranRondaPath') ? 'Elige tu camino' : `Elige la ruta de ${currentTurn?.nick ?? 'la persona activa'}`}
          </h2>
          {can('chooseGranRondaPath') ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {view.routeOptions.map((spaceId) => {
                const space = view.board.find((candidate) => candidate.id === spaceId);
                return (
                  <Button
                    key={spaceId}
                    variant="ghost"
                    onClick={() => send({ type: 'chooseGranRondaPath', nextSpaceId: spaceId })}
                  >
                    {space?.label ?? 'Siguiente casilla'}
                  </Button>
                );
              })}
            </div>
          ) : null}
        </section>
      ) : null}

      {(view.phase === 'minigameInput' || view.phase === 'minigameReveal') && !final ? (
        <MiniGamePanel view={view} can={can} send={send} isHost={isHost} />
      ) : null}

      {final ? (
        <section className="surface-panel flex flex-col gap-4 p-4">
          <div className="text-center">
            <p className="eyebrow">Partida terminada</p>
            <h2 className="mt-2 font-display text-32 text-hueso">
              Gana {view.players.find((player) => player.playerId === view.winnerId)?.nick ?? 'la mesa'}
            </h2>
            <p className="mt-1 text-13 text-humo">Más Sellos, y los Oros han desempatedo.</p>
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

function MiniGamePanel({
  view,
  can,
  send,
  isHost,
}: {
  view: GranRondaPlayerView;
  can: (action: GranRondaPlayerView['me']['availableActions'][number]) => boolean;
  send: (action: Parameters<ReturnType<typeof useRondaStore.getState>['sendAction']>[0]) => void;
  isHost: boolean;
}) {
  const revealed = view.phase === 'minigameReveal';
  return (
    <section className="surface-panel flex flex-col gap-3 p-4">
      <div>
        <p className="eyebrow">Pulso de la ronda</p>
        <h2 className="mt-1 text-20 font-semibold text-hueso">{view.miniGame.title}</h2>
        <p className="mt-1 text-14 leading-relaxed text-humo">{view.miniGame.prompt}</p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {view.miniGame.options.map((option) => {
          const selected = view.me.selectedOptionId === option.id;
          const correct = revealed && view.miniGame.correctOptionId === option.id;
          return (
            <button
              key={option.id}
              type="button"
              disabled={!can('submitGranRondaAnswer') || revealed}
              onClick={() => send({ type: 'submitGranRondaAnswer', optionId: option.id })}
              className={`min-h-12 rounded-2xl border px-3 text-left text-14 transition-colors ${
                correct
                  ? 'border-verde bg-verde/15 text-verde'
                  : selected
                    ? 'border-oro bg-oro/12 text-oro'
                    : 'border-linea bg-tinta/30 text-hueso'
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
      <p className="text-12 text-humo">
        {revealed
          ? `Respuesta correcta: ${view.miniGame.options.find((option) => option.id === view.miniGame.correctOptionId)?.label ?? '—'}.`
          : `${view.miniGame.submittedPlayerIds.length}/${view.players.length} respuestas bloqueadas.`}
      </p>
      {can('finishGranRondaMiniGame') && isHost ? (
        <Button variant="ghost" onClick={() => send({ type: 'finishGranRondaMiniGame' })}>
          Revelar ahora
        </Button>
      ) : null}
      {revealed && can('nextRound') ? (
        <Button onClick={() => send({ type: 'nextRound' })}>Siguiente ronda</Button>
      ) : null}
    </section>
  );
}
