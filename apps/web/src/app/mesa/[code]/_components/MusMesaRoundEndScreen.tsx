// Fin de mano de Mus en /mesa: el recuento de §12.9 en grande, con las
// cuatro manos descubiertas. Mismo criterio que MesaRoundEndScreen
// (Chinchón): las cartas reveladas solo llegan aquí porque ya están sobre la
// mesa de verdad. Vista siempre TableView; sin botones -- la pantalla central
// nunca acciona nada.
import type { MusTableView } from '@ronda/protocol';
import { Avatar } from '@/components/ui/Avatar';
import { PlayingCard } from '@/components/cards/PlayingCard';
import { MusMesaScore } from './MusMesaScore';

export interface MusMesaRoundEndScreenProps {
  view: MusTableView;
}

const LANCE_LABEL: Record<string, string> = {
  grande: 'Grande',
  chica: 'Chica',
  pares: 'Pares',
  juego: 'Juego',
  punto: 'Punto',
};

const OUTCOME_LABEL: Record<string, string> = {
  skipped: 'no se jugó',
  paso: 'en paso',
  querido: 'querido',
  noQuerido: 'no querido',
  soloUna: 'sin comparar',
};

export function MusMesaRoundEndScreen({ view }: MusMesaRoundEndScreenProps) {
  const result = view.handResult;
  const bySeat = [...view.players].sort((a, b) => a.seat - b.seat);

  return (
    <main className="flex min-h-dvh flex-1 flex-col items-center gap-6 px-10 py-8 text-center">
      <header className="flex flex-col items-center gap-2">
        <h1 className="font-display text-[clamp(2rem,4.5vw,3.5rem)] leading-display text-hueso">
          Fin de la mano {view.round}
        </h1>
        {result?.byOrdago ? (
          <p className="text-[clamp(1.25rem,2.5vw,2rem)] text-brasa">Órdago querido</p>
        ) : null}
      </header>

      <MusMesaScore teams={view.teams} juegosParaGanar={view.config.juegos} />

      {result ? (
        <section className="flex flex-wrap items-start justify-center gap-6">
          {bySeat.map((p) => (
            <div key={p.playerId} className="flex flex-col items-center gap-2">
              <div className="flex items-center gap-2">
                <Avatar name={p.nick} colorIndex={p.colorIndex} size={36} />
                <span className="text-[clamp(1rem,1.8vw,1.4rem)] text-hueso">{p.nick}</span>
              </div>
              <div className="flex gap-1">
                {(result.hands[p.seat] ?? []).map((cardId) => (
                  <PlayingCard key={cardId} cardId={cardId} size="sm" />
                ))}
              </div>
            </div>
          ))}
        </section>
      ) : null}

      {result ? (
        <ul className="flex w-full max-w-3xl flex-col gap-2">
          {result.rows.map((row) => (
            <li
              key={row.lance}
              className={`flex items-center justify-between gap-4 rounded-lg border border-linea bg-mesa px-5 py-2 ${
                row.counted ? '' : 'opacity-40'
              }`}
            >
              <span className="text-[clamp(1rem,1.8vw,1.4rem)] text-hueso">
                {LANCE_LABEL[row.lance] ?? row.lance}
              </span>
              <span className="text-[clamp(0.85rem,1.3vw,1.1rem)] text-humo">
                {OUTCOME_LABEL[row.outcome] ?? row.outcome}
                {row.wonByTeam !== null ? ` · gana ${row.wonByTeam === 0 ? 'A' : 'B'}` : ''}
              </span>
              <span className="font-mono text-[clamp(1rem,1.8vw,1.4rem)] text-hueso">
                {(row.wonByTeam === 0 ? row.piedras : 0) + (row.tablas[0] ?? 0)} ·{' '}
                {(row.wonByTeam === 1 ? row.piedras : 0) + (row.tablas[1] ?? 0)}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </main>
  );
}
