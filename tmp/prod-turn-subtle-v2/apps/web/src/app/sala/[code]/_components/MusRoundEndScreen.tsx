// Fin de mano de Mus: el recuento de §12.9, con las cuatro manos ya
// descubiertas. Mismo patrón que RoundEndScreen/PochaRoundEndScreen: la tabla
// se pinta tal cual llega en `handResult`, sin recalcular una piedra.
//
// Un detalle que sí se pinta y no está en los otros dos: las filas con
// `counted === false` son los lances a los que el recuento no llegó porque
// una pareja ya había hecho 40 (§12.9.3). Se enseñan atenuadas en vez de
// esconderse: que se vea qué se quedó sin contar es justo lo que explica el
// resultado.
'use client';

import { useState } from 'react';
import type { MusPlayerView } from '@ronda/protocol';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { PlayingCard } from '@/components/cards/PlayingCard';
import { useRondaStore } from '@/lib/store';
import { pendingConfirmations } from '@/lib/pending';
import { LANCE_LABEL } from './MusActionBar';

export interface MusRoundEndScreenProps {
  view: MusPlayerView;
}

const OUTCOME_LABEL: Record<string, string> = {
  skipped: 'no se jugó',
  paso: 'en paso',
  querido: 'querido',
  noQuerido: 'no querido',
  soloUna: 'sin comparar',
};

export function MusRoundEndScreen({ view }: MusRoundEndScreenProps) {
  const [confirming, setConfirming] = useState(false);
  const result = view.handResult;

  const iConfirmed = view.rematchVotes.includes(view.me.playerId);
  const waitingFor = pendingConfirmations(view.players, view.rematchVotes);
  const bySeat = [...view.players].sort((a, b) => a.seat - b.seat);

  async function handleNextRound() {
    setConfirming(true);
    await useRondaStore.getState().sendAction({ type: 'nextRound' });
    setConfirming(false);
  }

  return (
    <main className="app-page safe-page mx-auto flex min-h-dvh max-w-lg flex-col gap-6 px-5">
      <header className="flex flex-col items-center gap-2 text-center">
        <h1 className="font-display text-28 leading-display text-hueso">Fin de la mano {view.round}</h1>
        {result?.byOrdago ? <p className="text-16 text-brasa">Órdago querido</p> : null}
        {result?.juegoWonByTeam !== null && result?.juegoWonByTeam !== undefined ? (
          <p className="text-16 text-hueso">
            Juego para la pareja {result.juegoWonByTeam === 0 ? 'A' : 'B'}
          </p>
        ) : null}
      </header>

      {/* Las cuatro manos, descubiertas. Solo existen aquí: hasta el recuento
          ninguna vista las lleva (§2.5 / views.ts del motor). */}
      {result ? (
        <section className="flex flex-col gap-2">
          {bySeat.map((p) => (
            <div key={p.playerId} className="flex items-center gap-2">
              <Avatar name={p.nick} colorIndex={p.colorIndex} size={28} />
              <span className="w-20 shrink-0 truncate text-14 text-hueso">{p.nick}</span>
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
        <section className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between text-14 text-humo">
            <span>Lance</span>
            <span>Pareja A · Pareja B</span>
          </div>
          <ul className="flex flex-col gap-2">
            {result.rows.map((row) => (
              <li
                key={row.lance}
                className={`interactive-surface flex items-center justify-between gap-2 p-3 ${
                  row.counted ? '' : 'opacity-40'
                }`}
              >
                <div className="flex flex-col">
                  <span className="text-16 text-hueso">{LANCE_LABEL[row.lance]}</span>
                  <span className="text-12 text-humo">
                    {OUTCOME_LABEL[row.outcome] ?? row.outcome}
                    {row.wonByTeam !== null ? ` · gana ${row.wonByTeam === 0 ? 'A' : 'B'}` : ''}
                    {row.counted ? '' : ' · sin contar'}
                  </span>
                </div>
                <span className="font-mono text-16 text-hueso">
                  {(row.wonByTeam === 0 ? row.piedras : 0) + (row.tablas[0] ?? 0)} ·{' '}
                  {(row.wonByTeam === 1 ? row.piedras : 0) + (row.tablas[1] ?? 0)}
                </span>
              </li>
            ))}
          </ul>
          <p className="text-center font-mono text-16 text-hueso">
            {result.piedras[0] ?? 0} · {result.piedras[1] ?? 0} piedras
          </p>
        </section>
      ) : null}

      <div className="mt-auto flex flex-col gap-2">
        {iConfirmed ? (
          <p className="text-center text-14 text-humo">
            Confirmado.{' '}
            {waitingFor.length > 0
              ? `Esperando a ${waitingFor.map((p) => p.nick).join(', ')}.`
              : 'El postre ya puede preparar el siguiente reparto.'}
          </p>
        ) : (
          <Button onClick={handleNextRound} loading={confirming}>
            Siguiente mano
          </Button>
        )}
      </div>
    </main>
  );
}
