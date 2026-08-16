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

const TEAM_PRESENTATION = {
  0: {
    label: 'Pareja A',
    avatarColorIndex: 1 as const,
    panelClass: 'border-verde/60 bg-verde/10',
    badgeClass: 'border-verde/60 bg-verde/20',
    scoreClass: 'border-verde/50 bg-verde/15',
    winningScoreClass: 'border-verde bg-verde/30',
    dotClass: 'bg-verde',
  },
  1: {
    label: 'Pareja B',
    avatarColorIndex: 3 as const,
    panelClass: 'border-azul/60 bg-azul/10',
    badgeClass: 'border-azul/60 bg-azul/20',
    scoreClass: 'border-azul/50 bg-azul/15',
    winningScoreClass: 'border-azul bg-azul/30',
    dotClass: 'bg-azul',
  },
} as const;

export function MusRoundEndScreen({ view }: MusRoundEndScreenProps) {
  const [confirming, setConfirming] = useState(false);
  const result = view.handResult;

  const iConfirmed = view.rematchVotes.includes(view.me.playerId);
  const waitingFor = pendingConfirmations(view.players, view.rematchVotes);
  const teams = ([0, 1] as const).map((teamIndex) => {
    const members = view.players
      .filter((player) => player.teamIndex === teamIndex)
      .sort((a, b) => a.seat - b.seat);

    return {
      teamIndex,
      members,
      names: members.map((player) => player.nick).join(' + '),
      ...TEAM_PRESENTATION[teamIndex],
    };
  });

  function teamNames(teamIndex: 0 | 1): string {
    const team = teams.find((candidate) => candidate.teamIndex === teamIndex);
    return team?.names || TEAM_PRESENTATION[teamIndex].label;
  }

  async function handleNextRound() {
    setConfirming(true);
    await useRondaStore.getState().sendAction({ type: 'nextRound' });
    setConfirming(false);
  }

  return (
    <main className="app-page safe-page mx-auto flex min-h-dvh max-w-lg flex-col gap-6 px-5">
      <header className="flex flex-col items-center gap-2 text-center">
        <h1 className="font-display text-28 leading-display text-hueso">
          Fin de la mano {view.round}
        </h1>
        {result?.byOrdago ? <p className="text-16 text-brasa">Órdago querido</p> : null}
        {result?.juegoWonByTeam !== null && result?.juegoWonByTeam !== undefined ? (
          <p className="text-16 text-hueso">Juego para {teamNames(result.juegoWonByTeam)}</p>
        ) : null}
      </header>

      {/* Las cuatro manos, descubiertas. Solo existen aquí: hasta el recuento
          ninguna vista las lleva (§2.5 / views.ts del motor). */}
      {result ? (
        <section aria-label="Manos descubiertas por pareja" className="flex flex-col gap-3">
          {teams.map((team) => (
            <div
              key={team.teamIndex}
              className={`overflow-hidden rounded-xl border ${team.panelClass}`}
            >
              <header className="flex min-w-0 items-center gap-2 border-b border-inherit px-3 py-2">
                <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${team.dotClass}`} />
                <span className="shrink-0 text-12 font-semibold uppercase tracking-wide text-hueso">
                  {team.label}
                </span>
                <span className="min-w-0 truncate text-12 text-humo">{team.names}</span>
              </header>
              <div className="flex flex-col gap-2 p-2">
                {team.members.map((player) => (
                  <div key={player.playerId} className="flex min-w-0 items-center gap-2">
                    <Avatar name={player.nick} colorIndex={team.avatarColorIndex} size={28} />
                    <span className="w-16 shrink-0 truncate text-14 text-hueso">{player.nick}</span>
                    <div className="grid min-w-0 flex-1 grid-cols-4 gap-1">
                      {(result.hands[player.seat] ?? []).map((cardId) => (
                        <PlayingCard
                          key={cardId}
                          cardId={cardId}
                          size="sm"
                          className="h-auto w-full min-w-0 max-w-12"
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>
      ) : null}

      {result ? (
        <section className="flex flex-col gap-2">
          <div className="grid grid-cols-[minmax(0,1.15fr)_repeat(2,minmax(0,1fr))] items-stretch gap-1">
            <span className="self-end pb-1 text-12 text-humo">Lance</span>
            {teams.map((team) => (
              <div
                key={team.teamIndex}
                title={`${team.label}: ${team.names}`}
                className={`flex min-w-0 flex-col rounded-lg border px-1.5 py-1 text-center ${team.badgeClass}`}
              >
                <span className="text-[9px] font-semibold uppercase tracking-wide text-humo">
                  {team.label}
                </span>
                <span className="text-[10px] leading-tight text-hueso">{team.names}</span>
              </div>
            ))}
          </div>
          <ul className="flex flex-col gap-2">
            {result.rows.map((row) => {
              const rowScores = ([0, 1] as const).map(
                (teamIndex) =>
                  (row.wonByTeam === teamIndex ? row.piedras : 0) + (row.tablas[teamIndex] ?? 0),
              );

              return (
                <li
                  key={row.lance}
                  className={`interactive-surface grid grid-cols-[minmax(0,1.15fr)_repeat(2,minmax(0,1fr))] items-center gap-1.5 p-3 ${
                    row.counted ? '' : 'opacity-40'
                  }`}
                >
                  <div className="col-span-3 flex min-w-0 items-baseline justify-between gap-2">
                    <span className="text-16 text-hueso">{LANCE_LABEL[row.lance]}</span>
                    <span className="min-w-0 text-right text-11 leading-tight text-humo">
                      {OUTCOME_LABEL[row.outcome] ?? row.outcome}
                      {row.wonByTeam !== null ? ` · gana ${teamNames(row.wonByTeam)}` : ''}
                      {row.counted ? '' : ' · sin contar'}
                    </span>
                  </div>
                  <span className="text-10 font-semibold uppercase tracking-wide text-humo">
                    Piedras
                  </span>
                  {teams.map((team) => (
                    <span
                      key={team.teamIndex}
                      aria-label={`${team.names}: ${rowScores[team.teamIndex]} piedras`}
                      className={`rounded-lg border py-1.5 text-center font-mono text-16 font-semibold text-hueso ${
                        row.wonByTeam === team.teamIndex ? team.winningScoreClass : team.scoreClass
                      }`}
                    >
                      {rowScores[team.teamIndex]}
                    </span>
                  ))}
                </li>
              );
            })}
          </ul>
          <div className="grid grid-cols-[minmax(0,1.15fr)_repeat(2,minmax(0,1fr))] items-center gap-1.5 rounded-xl border border-linea bg-mesa px-3 py-2">
            <span className="text-12 font-semibold uppercase tracking-wide text-humo">
              Marcador
            </span>
            {teams.map((team) => (
              <span
                key={team.teamIndex}
                aria-label={`${team.names}: ${result.piedras[team.teamIndex] ?? 0} piedras en total`}
                className={`rounded-lg border py-1 text-center font-mono text-16 font-semibold text-hueso ${team.scoreClass}`}
              >
                {result.piedras[team.teamIndex] ?? 0}
              </span>
            ))}
          </div>
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
