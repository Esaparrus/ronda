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
const PIEDRAS_POR_AMARRAKO = 5;
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
    <div className="flex gap-2 border-b border-linea px-4 py-2">
      {teams.map((team) => {
        const sueltas = team.piedras % PIEDRAS_POR_AMARRAKO;
        const mine = team.index === myTeamIndex;
        return (
          <div
            key={team.index}
            className={`flex flex-1 flex-col gap-1 rounded-lg border px-3 py-2 ${
              mine ? 'border-brasa' : 'border-linea'
            }`}
          >
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-14 text-hueso">
                Pareja {team.index === 0 ? 'A' : 'B'}
                {mine ? ' (tú)' : ''}
              </span>
              <span className="font-mono text-16 text-hueso">{team.piedras}</span>
            </div>
            <Garbanzos
              count={team.amarrakos}
              total={AMARRAKOS_POR_JUEGO}
              label={`Amarrakos de la pareja ${team.index === 0 ? 'A' : 'B'}`}
            />
            <span className="text-12 text-humo">
              {team.amarrakos} {team.amarrakos === 1 ? 'amarrako' : 'amarrakos'}
              {sueltas > 0 ? ` y ${sueltas}` : ''}
              {juegosParaGanar > 1 ? ` · ${team.juegos}/${juegosParaGanar} juegos` : ''}
            </span>
          </div>
        );
      })}
    </div>
  );
}
