import type { GranRondaTableView } from '@ronda/protocol';
import { GranRondaBoard } from '@/components/granronda/GranRondaBoard';
import { Pill } from '@/components/ui/Pill';

export function GranRondaMesaGameBoard({ view }: { view: GranRondaTableView }) {
  const final = view.status === 'gameEnd';
  const standings = [...view.players].sort((left, right) => {
    const leftBoard = view.boardPlayers.find((player) => player.playerId === left.playerId);
    const rightBoard = view.boardPlayers.find((player) => player.playerId === right.playerId);
    return (rightBoard?.seals ?? 0) - (leftBoard?.seals ?? 0) || (rightBoard?.coins ?? 0) - (leftBoard?.coins ?? 0);
  });
  const turnNick = view.players.find((player) => player.playerId === view.turnPlayerId)?.nick;

  return (
    <main className="flex min-h-dvh flex-1 flex-col gap-6 px-8 py-7 xl:px-14">
      <header className="flex items-end justify-between gap-5">
        <div>
          <p className="eyebrow">Tablero y minijuegos</p>
          <h1 className="mt-2 font-display text-[clamp(2.5rem,6vw,5rem)] leading-display text-hueso">
            La Gran Ronda
          </h1>
        </div>
        <div className="text-right text-18 text-humo">
          <p>Ronda {view.round}</p>
          <p>{final ? 'Resultado final' : turnNick ? `Turno de ${turnNick}` : view.phase === 'minigameInput' ? 'Pulso de la ronda' : 'Resolviendo'}</p>
        </div>
      </header>

      <GranRondaBoard
        board={view.board}
        boardPlayers={view.boardPlayers}
        players={view.players}
        stampSpaceId={view.stampSpaceId}
      />

      {!final && (view.phase === 'minigameInput' || view.phase === 'minigameReveal') ? (
        <section className="mx-auto flex w-full max-w-3xl flex-col gap-3 rounded-[24px] border border-oro/25 bg-oro/8 p-5 text-center">
          <p className="eyebrow">{view.miniGame.title}</p>
          <h2 className="text-28 font-semibold text-hueso">{view.miniGame.prompt}</h2>
          <p className="text-15 text-humo">
            {view.phase === 'minigameReveal'
              ? `Correcta: ${view.miniGame.options.find((option) => option.id === view.miniGame.correctOptionId)?.label ?? '—'}`
              : `${view.miniGame.submittedPlayerIds.length}/${view.players.length} han respondido`}
          </p>
        </section>
      ) : null}

      <section className="mx-auto grid w-full max-w-4xl grid-cols-2 gap-3 lg:grid-cols-3">
        {standings.map((player) => {
          const boardPlayer = view.boardPlayers.find((candidate) => candidate.playerId === player.playerId);
          return (
            <div key={player.playerId} className="flex items-center gap-3 rounded-2xl border border-linea bg-mesa px-4 py-3">
              <span className="min-w-0 flex-1 truncate text-18 text-hueso">{player.nick}</span>
              {player.playerId === view.winnerId ? <Pill>Ganador</Pill> : null}
              <span className="font-mono text-18 text-verde">{boardPlayer?.seals ?? 0}✦</span>
              <span className="font-mono text-18 text-oro">{boardPlayer?.coins ?? 0}</span>
            </div>
          );
        })}
      </section>
    </main>
  );
}
