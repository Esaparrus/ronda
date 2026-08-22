// Fin de partida en /mesa: misma información que /sala (GameEndScreen), en
// grande, con la clasificación revelándose escalonada (contrato P16 /
// §8.4). Vista siempre TableView: nunca lee `me`. Sin botones -- ni
// «Revancha» ni «Salir» viven aquí, la pantalla central nunca acciona
// nada; solo se informa de los votos ya emitidos.
import type { TableView } from '@ronda/protocol';
import { Avatar } from '@/components/ui/Avatar';
import { Pill } from '@/components/ui/Pill';
import { StatsPanel } from '@/components/ui/StatsPanel';
import { pendingConfirmations } from '@/lib/pending';

export interface MesaGameEndScreenProps {
  view: TableView;
}

const STAGGER_MS = 80;

export function MesaGameEndScreen({ view }: MesaGameEndScreenProps) {
  const winner = view.players.find((p) => p.playerId === view.winnerId);
  const rest = view.players
    .filter((p) => p.playerId !== view.winnerId)
    .sort((a, b) => (view.gameId === 'chinchon' ? a.score - b.score : b.score - a.score));
  const isScaleGroups = view.gameId === 'escala' && view.config.groupMode === 'groups';
  const standings = isScaleGroups ? [] : winner ? [winner, ...rest] : rest;
  const winningGroupIndex =
    view.gameId === 'escala' && view.config.groupMode === 'groups'
      ? view.party.winnerGroupIndex
      : null;
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
        {view.gameId === 'orden' ? (
          <p className="text-[clamp(1.5rem,3vw,2.25rem)] text-hueso">
            La cuadrilla ha completado {view.round} rondas
          </p>
        ) : view.gameId === 'escala' && winningGroupIndex !== null ? (
          <p className="text-[clamp(1.5rem,3vw,2.25rem)] text-hueso">
            Gana el Grupo {groupLetter(winningGroupIndex)}
          </p>
        ) : winner ? (
          <p className="text-[clamp(1.5rem,3vw,2.25rem)] text-hueso">Gana {winner.nick}</p>
        ) : null}
        <p className="text-[clamp(0.9rem,1.5vw,1.15rem)] text-humo">
          {view.round} {view.round === 1 ? 'ronda' : 'rondas'}
        </p>
      </header>

      {!isScaleGroups ? (
        <ol className="flex w-full max-w-2xl flex-col gap-3">
          {standings.map((p, i) => (
            <li
              key={p.playerId}
              className="flex items-center gap-4 rounded-lg border border-linea bg-mesa px-5 py-3"
              style={{
                animation: `stagger-reveal 300ms ease-out both`,
                animationDelay: `${i * STAGGER_MS}ms`,
              }}
            >
              <span className="w-8 text-center font-mono text-[clamp(1rem,1.6vw,1.4rem)] text-humo">
                {i + 1}
              </span>
              <Avatar name={p.nick} colorIndex={p.colorIndex} size={44} />
              <span className="flex-1 text-left text-[clamp(1.1rem,2vw,1.5rem)] text-hueso">
                {p.nick}
              </span>
              {p.playerId === view.winnerId ? (
                <Pill className="text-[clamp(0.8rem,1.2vw,1rem)]">
                  {winningGroupIndex === null ? 'Ganador' : 'Grupo ganador'}
                </Pill>
              ) : null}
              {p.eliminated ? (
                <Pill className="text-[clamp(0.8rem,1.2vw,1rem)]">Eliminado</Pill>
              ) : null}
              <span className="font-mono text-[clamp(1.1rem,2vw,1.5rem)] text-hueso">{p.score}</span>
            </li>
          ))}
        </ol>
      ) : null}

      {view.gameId === 'escala' && view.party.groups ? (
        <section className="flex w-full max-w-2xl flex-col gap-3">
          <h2 className="text-[clamp(1.1rem,2vw,1.5rem)] text-hueso">Marcador final por grupos</h2>
          <div className="grid grid-cols-2 gap-3">
            {view.party.groups.map((group) => (
              <div
                key={group.index}
                className={`rounded-lg border px-4 py-3 ${
                  group.index === winningGroupIndex
                    ? 'border-oro bg-oro/10'
                    : 'border-linea bg-mesa'
                }`}
              >
                <span className="text-[clamp(0.9rem,1.5vw,1.15rem)] text-humo">
                  Grupo {groupLetter(group.index)}
                </span>
                <span className="ml-3 font-mono text-[clamp(1.1rem,2vw,1.5rem)] text-oro">
                  {group.score}
                </span>
                <span className="mt-1 block text-[clamp(0.75rem,1.2vw,0.95rem)] text-humo">
                  {group.playerIds
                    .map((playerId) => view.players.find((player) => player.playerId === playerId)?.nick)
                    .filter((nick): nick is string => Boolean(nick))
                    .join(', ')}
                </span>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* Estadísticas del grupo (roadmap "Después del MVP" §3): la pantalla
          central las pide igual que un jugador -- `room:stats` solo devuelve
          información pública, así que no rompe la regla de que aquí nunca
          llega nada privado. */}
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

function groupLetter(index: number): string {
  return String.fromCharCode('A'.charCodeAt(0) + index);
}
