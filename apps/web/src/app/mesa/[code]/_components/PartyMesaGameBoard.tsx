// Pantalla central de los modos sociales. Solo recibe datos ya públicos: no
// pinta manos numéricas ni objetivos de Escala mientras siguen ocultos.
import type { PartyTableView, PlayerId } from '@ronda/protocol';
import { TableHeader } from '@/app/sala/[code]/_components/TableHeader';

export interface PartyMesaGameBoardProps {
  view: PartyTableView;
}

export function PartyMesaGameBoard({ view }: PartyMesaGameBoardProps) {
  if (view.gameId === 'orden') return <OrdenMesaBoard view={view} />;
  if (view.gameId === 'colores') return <ColoresMesaBoard view={view} />;
  if (view.gameId === 'mayoria') return <MayoriaMesaBoard view={view} />;
  return <EscalaMesaBoard view={view} />;
}

function OrdenMesaBoard({ view }: { view: Extract<PartyTableView, { gameId: 'orden' }> }) {
  const party = view.party;
  return (
    <main className="flex min-h-dvh flex-1 flex-col">
      <TableHeader
        left={`Ronda ${party.round} · ${party.cardsPerPlayer} carta${party.cardsPerPlayer === 1 ? '' : 's'} por persona`}
        turnNick={null}
      />
      <div className="flex flex-1 flex-col items-center justify-center gap-8 px-10 py-10 text-center">
        <p className="text-20 text-humo">Ordenad las cartas hablando en la mesa · quedan {party.deckCount}</p>
        <div className="flex max-w-5xl flex-wrap justify-center gap-4">
          {party.played.length > 0 ? (
            party.played.map((played, index) => (
              <span
                key={`${played.playerId}-${played.value}-${index}`}
                className="flex h-24 w-20 items-center justify-center rounded-xl border-2 border-oro bg-hueso font-mono text-40 font-semibold text-tinta"
              >
                {played.value}
              </span>
            ))
          ) : (
            <span className="text-28 text-humo">El centro está vacío</span>
          )}
        </div>
        <p className="font-mono text-20 text-oro">Última válida: {party.highest || '—'}</p>
        {party.failure ? (
          <p className="text-20 text-brasa">
            Fallo: {playerNick(view, party.failure.playerId)} jugó {party.failure.value}. La carta se descarta; no hay vidas.
          </p>
        ) : null}
      </div>
    </main>
  );
}

function ColoresMesaBoard({ view }: { view: Extract<PartyTableView, { gameId: 'colores' }> }) {
  const party = view.party;
  return (
    <main className="flex min-h-dvh flex-1 flex-col">
      <TableHeader left={`Colores · ronda ${view.round}`} turnNick={null} />
      <div className="flex flex-1 flex-col items-center justify-center gap-6 px-10 py-10 text-center">
        <h1 className="max-w-4xl text-[clamp(2rem,5vw,4rem)] font-semibold text-hueso">{party.prompt}</h1>
        <p className="text-20 text-humo">
          {party.phase === 'input'
            ? `${party.submittedPlayerIds.length}/${view.players.length} respuestas guardadas`
            : `Respuesta: ${party.correctColors?.join(', ')}`}
        </p>
      </div>
    </main>
  );
}

function MayoriaMesaBoard({ view }: { view: Extract<PartyTableView, { gameId: 'mayoria' }> }) {
  const party = view.party;
  return (
    <main className="flex min-h-dvh flex-1 flex-col">
      <TableHeader left={`Mayoría · ronda ${view.round}`} turnNick={null} />
      <div className="flex flex-1 flex-col items-center justify-center gap-6 px-10 py-10 text-center">
        <h1 className="max-w-4xl text-[clamp(2rem,5vw,4rem)] font-semibold text-hueso">{party.prompt}</h1>
        {party.phase === 'input' ? (
          <p className="text-20 text-humo">
            {party.submittedPlayerIds.length}/{view.players.length} respuestas guardadas
          </p>
        ) : (
          <p className="text-28 font-semibold text-oro">
            {party.majorityAnswers?.length ? party.majorityAnswers.join(', ') : 'Empate: nadie puntúa'}
          </p>
        )}
      </div>
    </main>
  );
}

function EscalaMesaBoard({ view }: { view: Extract<PartyTableView, { gameId: 'escala' }> }) {
  const party = view.party;
  return (
    <main className="flex min-h-dvh flex-1 flex-col">
      <TableHeader
        left={`Escala · ronda ${view.round}`}
        turnNick={playerNick(view, party.cluePlayerId)}
      />
      <div className="flex flex-1 flex-col items-center justify-center gap-8 px-10 py-10 text-center">
        <div className="flex w-full max-w-5xl items-center justify-between gap-6 text-[clamp(1.5rem,4vw,3rem)] font-semibold text-hueso">
          <span>{party.leftLabel}</span>
          <span className="text-humo">↔</span>
          <span>{party.rightLabel}</span>
        </div>
        {party.phase === 'reveal' ? (
          <div className="flex flex-col gap-3">
            <p className="text-40 font-mono text-oro">Objetivo: {party.target}</p>
            <p className="text-20 text-humo">
              {Object.keys(party.guesses ?? {}).length} estimaciones reveladas
            </p>
          </div>
        ) : (
          <p className="text-20 text-humo">{playerNick(view, party.cluePlayerId)} está dando una pista</p>
        )}
      </div>
    </main>
  );
}

function playerNick(view: { players: { playerId: PlayerId; nick: string }[] }, playerId: PlayerId): string {
  return view.players.find((player) => player.playerId === playerId)?.nick ?? 'Alguien';
}
