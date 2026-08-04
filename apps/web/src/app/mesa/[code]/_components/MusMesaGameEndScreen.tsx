// Fin de partida de Mus en /mesa. No reutiliza MesaGameEndScreen porque esa
// pantalla ordena una clasificación por `score` y corona a `winnerId`, y en
// Mus los dos van siempre a 0 y a null: gana una PAREJA (§12.12).
//
// Vista siempre TableView; sin botones, solo se informa de los votos ya
// emitidos, igual que el resto de esta carpeta.
import type { MusTableView } from '@ronda/protocol';
import { Avatar } from '@/components/ui/Avatar';
import { Pill } from '@/components/ui/Pill';
import { StatsPanel } from '@/components/ui/StatsPanel';
import { pendingConfirmations } from '@/lib/pending';

export interface MusMesaGameEndScreenProps {
  view: MusTableView;
}

export function MusMesaGameEndScreen({ view }: MusMesaGameEndScreenProps) {
  const winnerTeam = view.winnerTeamIndex;
  const waitingFor = pendingConfirmations(view.players, view.rematchVotes);
  const votedNicks = view.players
    .filter((p) => view.rematchVotes.includes(p.playerId))
    .map((p) => p.nick);

  return (
    <main className="flex min-h-dvh flex-1 flex-col items-center gap-8 px-10 py-10 text-center">
      <header className="flex flex-col items-center gap-2">
        <h1 className="font-display text-[clamp(2.25rem,5vw,4rem)] leading-display text-hueso">
          Partida terminada
        </h1>
        {winnerTeam !== null ? (
          <p className="text-[clamp(1.5rem,3vw,2.25rem)] text-hueso">
            Gana la pareja {winnerTeam === 0 ? 'A' : 'B'}
          </p>
        ) : (
          <p className="text-[clamp(1rem,1.8vw,1.4rem)] text-humo">
            La partida se ha quedado sin cuatro jugadores y queda anulada.
          </p>
        )}
        <p className="text-[clamp(0.9rem,1.5vw,1.15rem)] text-humo">
          {view.round} {view.round === 1 ? 'mano' : 'manos'}
        </p>
      </header>

      <ol className="flex w-full max-w-2xl flex-col gap-3">
        {view.teams.map((team) => {
          const members = view.players
            .filter((p) => p.teamIndex === team.index)
            .sort((a, b) => a.seat - b.seat);
          return (
            <li
              key={team.index}
              className={`flex items-center gap-4 rounded-lg border bg-mesa px-5 py-3 ${
                team.index === winnerTeam ? 'border-brasa' : 'border-linea'
              }`}
            >
              <span className="text-[clamp(1.1rem,2vw,1.5rem)] text-hueso">
                Pareja {team.index === 0 ? 'A' : 'B'}
              </span>
              <span className="flex flex-1 flex-wrap justify-center gap-4">
                {members.map((p) => (
                  <span key={p.playerId} className="flex items-center gap-2">
                    <Avatar name={p.nick} colorIndex={p.colorIndex} size={36} />
                    <span className="text-[clamp(1rem,1.6vw,1.3rem)] text-hueso">{p.nick}</span>
                  </span>
                ))}
              </span>
              {team.index === winnerTeam ? (
                <Pill className="text-[clamp(0.8rem,1.2vw,1rem)]">Ganadora</Pill>
              ) : null}
              <span className="font-mono text-[clamp(1.1rem,2vw,1.5rem)] text-hueso">
                {view.config.juegos > 1 ? `${team.juegos} juegos` : `${team.piedras} piedras`}
              </span>
            </li>
          );
        })}
      </ol>

      <section className="flex w-full max-w-2xl flex-col gap-2">
        <h2 className="text-[clamp(1.1rem,2vw,1.5rem)] text-hueso">Estadísticas del grupo</h2>
        <StatsPanel refreshKey={`${view.roomCode}-${view.round}`} />
      </section>

      <p className="mt-auto text-[clamp(0.9rem,1.5vw,1.15rem)] text-humo">
        {votedNicks.length > 0
          ? `Han votado revancha: ${votedNicks.join(', ')}.`
          : 'Nadie ha votado revancha todavía.'}
        {waitingFor.length > 0 ? ` Falta: ${waitingFor.map((p) => p.nick).join(', ')}.` : ''}
      </p>
    </main>
  );
}
