import type { GranRondaTableView } from '@ronda/protocol';
import { GranRondaBoard } from '@/components/granronda/GranRondaBoard';
import { Pill } from '@/components/ui/Pill';

export function GranRondaMesaGameBoard({ view }: { view: GranRondaTableView }) {
  const final = view.status === 'gameEnd';
  const standings = [...view.players].sort((left, right) => {
    const leftBoard = view.boardPlayers.find((player) => player.playerId === left.playerId);
    const rightBoard = view.boardPlayers.find((player) => player.playerId === right.playerId);
    return (
      (rightBoard?.seals ?? 0) - (leftBoard?.seals ?? 0) ||
      (rightBoard?.coins ?? 0) - (leftBoard?.coins ?? 0)
    );
  });
  const turnNick = view.players.find((player) => player.playerId === view.turnPlayerId)?.nick;
  const phaseLabel =
    view.phase === 'routeChoice'
      ? 'Eligiendo camino'
      : view.phase === 'moving'
        ? 'Ficha en movimiento'
        : view.phase === 'resolving'
          ? 'Resolviendo casilla'
          : view.phase === 'roundEnd'
            ? 'Ronda completada'
            : turnNick
              ? `Turno de ${turnNick}`
              : 'Mapa listo';

  return (
    <main className="flex min-h-dvh flex-1 flex-col gap-6 px-5 py-6 xl:px-14 xl:py-8">
      <header className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="eyebrow">Mapa público · La Gran Ronda</p>
          <h1 className="mt-2 font-display text-[clamp(2.5rem,6vw,5rem)] leading-display text-hueso">La Gran Ronda</h1>
        </div>
        <div className="text-right text-18 text-humo">
          <p>Ronda {view.round}</p>
          <p>{final ? 'Resultado final' : phaseLabel}</p>
        </div>
      </header>

      <div className="mx-auto w-full max-w-6xl">
        <GranRondaBoard
          board={view.board}
          boardPlayers={view.boardPlayers}
          players={view.players}
          stampSpaceId={view.stampSpaceId}
          routeOptions={view.routeOptions}
          activePlayerId={view.turnPlayerId}
          movement={view.movement}
        />
      </div>

      {!final && view.phase === 'routeChoice' ? (
        <section className="mx-auto flex w-full max-w-3xl items-center justify-center gap-3 rounded-[24px] border border-oro/35 bg-oro/10 p-5 text-center">
          <span className="grid size-12 place-items-center rounded-2xl bg-oro font-display text-24 text-tinta">?</span>
          <div>
            <p className="eyebrow text-oro">Camino abierto</p>
            <h2 className="text-24 font-semibold text-hueso">{turnNick ?? 'La persona activa'} elige una casilla iluminada</h2>
            <p className="mt-1 text-14 text-humo">Dado: {view.movement?.roll ?? '—'} · El móvil controla la elección.</p>
          </div>
        </section>
      ) : null}

      {!final && view.phase === 'moving' ? (
        <section className="mx-auto flex w-full max-w-3xl items-center justify-center gap-4 rounded-[24px] border border-azul/35 bg-azul/10 p-5 text-center">
          <div className="grid size-16 place-items-center rounded-2xl bg-hueso font-display text-32 text-tinta shadow-lg">{view.movement?.roll ?? '—'}</div>
          <div>
            <p className="eyebrow text-azul">Movimiento visible para todos</p>
            <h2 className="text-26 font-semibold text-hueso">La ficha de {turnNick ?? 'la persona activa'} avanza</h2>
            <p className="mt-1 text-14 text-humo">Quedan {view.movement?.remainingSteps ?? 0} casillas.</p>
          </div>
        </section>
      ) : null}

      {!final && view.phase === 'resolving' && view.resolution ? (
        <section className="mx-auto flex w-full max-w-3xl items-center gap-4 rounded-[24px] border border-oro/35 bg-oro/10 p-5">
          <div className="grid size-16 shrink-0 place-items-center rounded-2xl bg-oro/20 font-display text-24 text-oro">✦</div>
          <div>
            <p className="eyebrow text-oro">Llegada de {turnNick ?? 'la ficha'}</p>
            <h2 className="text-26 font-semibold text-hueso">{view.resolution.title}</h2>
            <p className="mt-1 text-14 text-humo">{view.resolution.message}</p>
          </div>
        </section>
      ) : null}

      {!final && view.phase === 'roundEnd' ? (
        <section className="mx-auto w-full max-w-3xl rounded-[24px] border border-linea bg-mesa p-5 text-center">
          <p className="eyebrow">Ronda completada</p>
          <h2 className="mt-1 text-26 font-semibold text-hueso">Todas las fichas han llegado</h2>
          <p className="mt-1 text-14 text-humo">El anfitrión puede comenzar la siguiente ronda desde su móvil.</p>
        </section>
      ) : null}

      <section className="mx-auto grid w-full max-w-4xl grid-cols-2 gap-3 lg:grid-cols-3">
        {standings.map((player) => {
          const boardPlayer = view.boardPlayers.find((candidate) => candidate.playerId === player.playerId);
          return (
            <div key={player.playerId} className={`flex items-center gap-3 rounded-2xl border px-4 py-3 ${player.playerId === view.turnPlayerId ? 'border-oro/60 bg-oro/10' : 'border-linea bg-mesa'}`}>
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
