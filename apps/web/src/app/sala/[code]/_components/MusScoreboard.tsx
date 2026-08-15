// Marcador de Mus: las dos parejas, sus piedras y sus amarrakos. Contrato
// §12.3 (40 piedras = 8 amarrakos = 1 juego) y §12.12 (el marcador es de la
// pareja, nunca del jugador).
//
// Los amarrakos se pintan como GARBANZOS (P32) porque es literalmente como se
// llevan en la mesa -- se apartan de cinco en cinco -- y porque de un vistazo
// se ve quién va ganando sin leer un número. Hasta P32 eran bolitas grises:
// el comentario ya decía "como en la mesa" y el dibujo no lo cumplía.
'use client';

import type { MusTeam } from '@ronda/protocol';
import { Garbanzos } from '@/components/ui/Garbanzos';

/** §12.3. Se repite aquí y no se importa del motor: apps/web no depende de
 * @ronda/engine, solo del protocolo. */
const AMARRAKOS_POR_JUEGO = 8;

export interface MusScoreboardProps {
  teams: MusTeam[];
  /** Mi pareja, para marcarla. */
  myTeamIndex: 0 | 1;
  /** Juegos que hay que ganar para llevarse la partida (`config.juegos`). */
  juegosParaGanar: number;
}

export function MusScoreboard({ teams, myTeamIndex, juegosParaGanar }: MusScoreboardProps) {
  return (
    <section aria-label="Marcador por parejas" className="flex shrink-0 gap-1.5 px-3 py-1.5">
      {teams.map((team) => {
        const mine = team.index === myTeamIndex;
        return (
          <div
            key={team.index}
            aria-current={mine ? 'true' : undefined}
            className={`flex min-w-0 flex-1 flex-col gap-1 rounded-xl border px-2.5 py-1.5 ${
              mine ? 'border-brasa' : 'border-linea'
            }`}
          >
            <div className="flex min-w-0 items-baseline justify-between gap-2">
              <span className="truncate text-12 font-medium text-hueso">
                Pareja {team.index === 0 ? 'A' : 'B'}
                {mine ? ' (tú)' : ''}
              </span>
              <span className="shrink-0 font-mono text-18 font-semibold text-hueso">
                {team.piedras}
              </span>
            </div>
            <div className="flex min-w-0 items-center justify-between gap-2">
              <Garbanzos
                count={team.amarrakos}
                total={AMARRAKOS_POR_JUEGO}
                label={`Amarrakos de la pareja ${team.index === 0 ? 'A' : 'B'}`}
              />
              <span className="truncate text-10 text-humo">
                {team.amarrakos} am.
                {juegosParaGanar > 1 ? ` · ${team.juegos}/${juegosParaGanar} juegos` : ''}
              </span>
            </div>
          </div>
        );
      })}
    </section>
  );
}
