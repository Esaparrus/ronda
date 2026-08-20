// Pantalla central de Musical: enseña el ritmo de la ronda y la revelación,
// pero nunca la respuesta mientras la mesa sigue adivinando.

import type { MusicalTableView } from '@ronda/protocol';
import { TableHeader } from '@/app/sala/[code]/_components/TableHeader';
import { musicFiltersLabel } from '@/lib/musical';

export interface MusicalMesaGameBoardProps {
  view: MusicalTableView;
}

export function MusicalMesaGameBoard({ view }: MusicalMesaGameBoardProps) {
  const result = view.roundResult;
  return (
    <main className="flex min-h-dvh flex-1 flex-col">
      <TableHeader left={`Musical · ronda ${view.round}/${view.config.rounds}`} turnNick={null} />
      <div className="flex flex-1 flex-col items-center justify-center gap-8 px-10 py-10 text-center">
        <span className="text-[clamp(3rem,10vw,7rem)] text-oro" aria-hidden="true">
          ♪
        </span>
        {view.phase === 'setup' ? (
          <>
            <h1 className="text-[clamp(2rem,5vw,4rem)] font-semibold text-hueso">
              Preparando una canción al azar
            </h1>
            <p className="text-20 text-humo">Filtros: {musicFiltersLabel(view.config)}</p>
            <p className="text-14 text-humo">La siguiente ronda empieza en unos segundos.</p>
          </>
        ) : view.phase === 'playing' ? (
          <>
            <h1 className="text-[clamp(2rem,5vw,4rem)] font-semibold text-hueso">
              Escuchad {view.clipSeconds} segundos
            </h1>
            <p className="text-20 text-humo">
              {Object.values(view.guessCounts).filter((count) => count > 0).length} personas ya han
              probado suerte
            </p>
          </>
        ) : result ? (
          <>
            <p className="text-20 uppercase tracking-wider text-humo">Era esta</p>
            <h1 className="max-w-5xl text-[clamp(2rem,5vw,4rem)] font-semibold text-crema">
              {result.title}
            </h1>
            <p className="text-[clamp(1.25rem,3vw,2rem)] text-hueso">{result.artist}</p>
            <p className="text-20 text-oro">
              {result.winnerId
                ? `${view.players.find((player) => player.playerId === result.winnerId)?.nick ?? 'Alguien'} gana +${result.points}`
                : 'Nadie se lleva puntos'}
            </p>
          </>
        ) : null}
        <div className="flex flex-wrap justify-center gap-3">
          {view.players.map((player) => (
            <span
              key={player.playerId}
              className="rounded-full border border-linea bg-mesa px-4 py-2 text-16 text-hueso"
            >
              {player.nick} · <span className="font-mono text-oro">{player.score}</span>
            </span>
          ))}
        </div>
        <p className="text-14 text-humo">El audio se reproduce desde los móviles de la mesa.</p>
      </div>
    </main>
  );
}
