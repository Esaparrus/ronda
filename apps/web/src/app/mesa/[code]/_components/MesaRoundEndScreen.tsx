// Fin de ronda en /mesa: placeholder DELIBERADAMENTE MÍNIMO, mismo motivo
// que RoundEndScreen de /sala (P14) -- el revelado escalonado en grande es
// explícitamente P16 ("En /mesa, la misma información en grande y con el
// revelado escalonado"). Aquí solo se deja la partida completable de punta
// a punta. Vista siempre TableView: nunca lee `me`; los nombres salen de
// `view.players`, no de ningún campo privado.
import type { TableView } from '@ronda/protocol';

export interface MesaRoundEndScreenProps {
  view: TableView;
}

export function MesaRoundEndScreen({ view }: MesaRoundEndScreenProps) {
  const result = view.roundResult;

  return (
    <main className="flex min-h-dvh flex-1 flex-col items-center justify-center gap-8 px-10 py-8">
      <h1 className="font-display text-[clamp(2rem,4vw,3rem)] leading-display text-hueso">
        Fin de ronda
      </h1>

      {result ? (
        <ul className="flex flex-col gap-3">
          {result.rows.map((row) => {
            const player = view.players.find((p) => p.playerId === row.playerId);
            return (
              <li
                key={row.playerId}
                className="flex items-center justify-between gap-8 rounded-lg border border-linea bg-mesa px-6 py-3"
              >
                <span className="text-[clamp(1.25rem,2.2vw,1.75rem)] text-hueso">
                  {player?.nick ?? row.playerId}
                </span>
                <span className="font-mono text-[clamp(1.25rem,2.2vw,1.75rem)] text-humo">
                  {row.delta >= 0 ? '+' : ''}
                  {row.delta} · {row.total}
                  {row.eliminated ? ' · eliminado' : ''}
                </span>
              </li>
            );
          })}
        </ul>
      ) : null}

      <p className="text-16 text-humo">Esperando a que el anfitrión empiece la siguiente ronda.</p>
    </main>
  );
}
