// Marcador de parejas para la pantalla central. Es el mismo dato que
// MusScoreboard de /sala (§12.3), pero en tamaño "de tele": los amarrakos se
// leen desde el sofá.
//
// Vista siempre pública: piedras, amarrakos y juegos son de la pareja y los
// ve todo el mundo. Aquí no llega nada privado.
import type { MusTeam } from '@ronda/protocol';

const PIEDRAS_POR_AMARRAKO = 5;
const AMARRAKOS_POR_JUEGO = 8;

export interface MusMesaScoreProps {
  teams: MusTeam[];
  juegosParaGanar: number;
}

export function MusMesaScore({ teams, juegosParaGanar }: MusMesaScoreProps) {
  return (
    <div className="flex gap-6">
      {teams.map((team) => {
        const sueltas = team.piedras % PIEDRAS_POR_AMARRAKO;
        return (
          <div key={team.index} className="flex flex-col items-center gap-1">
            <span className="text-[clamp(0.9rem,1.4vw,1.25rem)] text-humo">
              Pareja {team.index === 0 ? 'A' : 'B'}
            </span>
            <span className="font-mono text-[clamp(2rem,4.5vw,3.5rem)] text-hueso">
              {team.piedras}
            </span>
            <div className="flex items-center gap-1" aria-hidden="true">
              {Array.from({ length: AMARRAKOS_POR_JUEGO }, (_, i) => (
                <span
                  key={i}
                  className={`h-3 w-3 rounded-full ${i < team.amarrakos ? 'bg-brasa' : 'bg-linea'}`}
                />
              ))}
            </div>
            <span className="text-[clamp(0.8rem,1.2vw,1rem)] text-humo">
              {team.amarrakos} {team.amarrakos === 1 ? 'amarrako' : 'amarrakos'}
              {sueltas > 0 ? ` y ${sueltas}` : ''}
              {juegosParaGanar > 1 ? ` · ${team.juegos}/${juegosParaGanar}` : ''}
            </span>
          </div>
        );
      })}
    </div>
  );
}
