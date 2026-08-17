// "Partida" de Mus en /mesa. Mismo envoltorio que MesaGameBoard.tsx
// (Chinchón) y PochaMesaGameBoard.tsx: SeatRing + centro. Vista siempre
// TableView: no lee nada privado.
//
// El centro de una mesa de Mus no tiene cartas -- aquí no se juega ninguna,
// se habla -- así que lo que ocupa el centro es el marcador de las dos
// parejas y en qué lance van. Es justo lo que la gente levanta la cabeza para
// mirar, y sigue siendo información pública.
import type { MusTableView } from '@ronda/protocol';
import { SeatRing } from './SeatRing';
import { MusMesaScore } from './MusMesaScore';
import { formatMusAmount } from '@/lib/mus';

export interface MusMesaGameBoardProps {
  view: MusTableView;
}

const LANCE_LABEL: Record<string, string> = {
  grande: 'Grande',
  chica: 'Chica',
  pares: 'Pares',
  juego: 'Juego',
  punto: 'Punto',
};

const PHASE_LABEL: Record<string, string> = {
  reparto: 'Esperando el reparto',
  mus: '¿Mus?',
  descarte: 'Descarte',
  recuento: 'Recuento',
};

export function MusMesaGameBoard({ view }: MusMesaGameBoardProps) {
  const consultingTeam =
    view.config.modo === 'online' && view.phase === 'mus' ? view.musConsultingTeam : null;
  const titulo =
    consultingTeam !== null
      ? `Decide la pareja ${consultingTeam === 0 ? 'A' : 'B'}`
      : view.phase === 'lance' && view.lance
        ? (LANCE_LABEL[view.lance] ?? '')
        : (PHASE_LABEL[view.phase] ?? '');

  return (
    <main className="flex min-h-dvh flex-1 items-center justify-center p-6">
      <div className="relative aspect-square w-[min(90vw,80vh)]">
        <SeatRing
          players={view.players}
          turnPlayerId={view.turnPlayerId}
          showScore={false}
          renderBadge={(p) => {
            const marks: string[] = [];
            if (p.seat === view.manoSeat) marks.push('mano');
            if (p.seat === view.postreSeat) marks.push('postre');
            if (consultingTeam === p.teamIndex) marks.push('hablando');
            if (view.phase === 'mus' && view.musSaid[p.seat] === true) marks.push('mus');
            if (view.phase === 'mus' && view.musSaid[p.seat] === false) marks.push('corta');
            if (view.paresDeclared[p.seat] === true) marks.push('pares');
            if (view.juegoDeclared[p.seat] === true) marks.push('juego');
            return (
              <span className="text-[clamp(0.9rem,1.4vw,1.25rem)] text-humo">
                {p.teamIndex === 0 ? 'Pareja A' : 'Pareja B'}
                {marks.length > 0 ? ` · ${marks.join(' ')}` : ''}
              </span>
            );
          }}
        />
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-center">
          <MusMesaScore teams={view.teams} juegosParaGanar={view.config.juegos} />
          <p className="font-display text-[clamp(1.75rem,4vw,3rem)] leading-display text-hueso">
            {titulo}
          </p>
          {view.bet ? (
            <p className="text-[clamp(1rem,2vw,1.5rem)] text-brasa">
              {view.bet.isOrdago
                ? '¡Órdago!'
                : `${formatMusAmount(view.bet.piedras)} · pareja ${view.bet.byTeam === 0 ? 'A' : 'B'}`}
            </p>
          ) : null}
        </div>
      </div>
    </main>
  );
}
