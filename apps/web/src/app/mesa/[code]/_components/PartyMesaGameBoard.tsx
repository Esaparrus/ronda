// Pantalla central de los modos sociales. Solo recibe datos ya públicos: no
// pinta manos numéricas ni objetivos de Escala mientras siguen ocultos.
import type { PartyTableView, PlayerId } from '@ronda/protocol';
import { TableHeader } from '@/app/sala/[code]/_components/TableHeader';
import { ColorCountdownHeader } from '@/app/sala/[code]/_components/ColorCountdownHeader';
import { NumberTableGrid } from '@/components/cards/NumberTableGrid';

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
        <p className="text-20 text-humo">
          Ordenad las cartas hablando en la mesa · quedan {party.deckCount}
        </p>
        <div className="flex w-full max-w-6xl flex-1 items-center justify-center">
          <NumberTableGrid
            cards={party.played}
            failure={party.failure}
            variant="large"
            emptyLabel="El centro está vacío"
          />
        </div>
        <p className="font-mono text-20 text-oro">Última válida: {party.highest || '—'}</p>
        {party.failure ? (
          <p className="text-20 text-brasa">
            Fallo: {playerNick(view, party.failure.playerId)} jugó {party.failure.value}. La carta
            se descarta; no hay vidas.
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
      <ColorCountdownHeader
        left={`Colores · ronda ${view.round} · primero a ${view.config.pointsToWin}`}
        deadlineAt={party.deadlineAt}
      />
      <div className="flex flex-1 flex-col items-center justify-center gap-6 px-10 py-10 text-center">
        <h1 className="max-w-4xl text-[clamp(2rem,5vw,4rem)] font-semibold text-hueso">
          {party.prompt}
        </h1>
        <p className="text-20 font-semibold text-oro">
          Elige exactamente {party.answerCount} {party.answerCount === 1 ? 'color' : 'colores'}
        </p>
        {party.rollover > 0 ? (
          <p className="rounded-full border border-oro bg-oro/10 px-5 py-2 font-mono text-20 text-crema">
            Bote: +{party.rollover}
          </p>
        ) : null}
        {party.phase === 'input' ? (
          <div className="flex flex-col gap-2">
            <p className="text-20 text-humo">
              {party.submittedPlayerIds.length}/{view.players.length} respuestas bloqueadas
            </p>
            <p className="text-16 text-humo">
              {party.deadlineAt === null
                ? 'La primera respuesta inicia 15 segundos para el resto.'
                : 'La cuenta atrás está en marcha.'}
            </p>
          </div>
        ) : (
          <div className="flex w-full max-w-4xl flex-col items-center gap-5">
            <div className="flex flex-wrap justify-center gap-3">
              {party.correctColors?.map((color) => (
                <span
                  key={color}
                  className={`rounded-2xl border-2 border-hueso/40 px-5 py-3 text-20 font-semibold ${
                    MESA_COLOR_CLASSES[color] ?? 'bg-mesa'
                  } ${LIGHT_COLOR_NAMES.has(color) ? 'text-carbon' : 'text-white'}`}
                >
                  {color}
                </span>
              ))}
            </div>
            <div className="grid w-full grid-cols-2 gap-3 lg:grid-cols-3">
              {view.players.map((player) => {
                const delta = party.scoreDeltas?.[player.playerId] ?? 0;
                const answered = party.answers?.[player.playerId];
                return (
                  <div
                    key={player.playerId}
                    className="rounded-xl border border-linea bg-tinta/40 p-3"
                  >
                    <p className="text-16 font-semibold text-hueso">
                      {player.nick} {delta > 0 ? <span className="text-oro">+{delta}</span> : null}
                    </p>
                    <p className="mt-1 text-14 text-humo">
                      {answered?.length ? answered.join(', ') : 'Sin respuesta'}
                    </p>
                  </div>
                );
              })}
            </div>
            <p className="text-16 text-humo">
              Cada acierto gana un punto por cada rival que falla, más el bote.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}

const MESA_COLOR_CLASSES: Record<string, string> = {
  rojo: 'bg-ficha-rojo',
  azul: 'bg-ficha-azul',
  verde: 'bg-ficha-verde',
  amarillo: 'bg-ficha-amarillo',
  naranja: 'bg-ficha-naranja',
  morado: 'bg-ficha-morado',
  rosa: 'bg-ficha-rosa',
  negro: 'bg-ficha-negro',
  blanco: 'bg-ficha-blanco',
  marrón: 'bg-ficha-marron',
  gris: 'bg-ficha-gris',
};

const LIGHT_COLOR_NAMES = new Set(['amarillo', 'naranja', 'rosa', 'blanco']);

function MayoriaMesaBoard({ view }: { view: Extract<PartyTableView, { gameId: 'mayoria' }> }) {
  const party = view.party;
  return (
    <main className="flex min-h-dvh flex-1 flex-col">
      <TableHeader left={`Mayoría · ronda ${view.round}`} turnNick={null} />
      <div className="flex flex-1 flex-col items-center justify-center gap-6 px-10 py-10 text-center">
        <h1 className="max-w-4xl text-[clamp(2rem,5vw,4rem)] font-semibold text-hueso">
          {party.prompt}
        </h1>
        {party.phase === 'input' ? (
          <p className="text-20 text-humo">
            {party.submittedPlayerIds.length}/{view.players.length} respuestas guardadas
          </p>
        ) : (
          <p className="text-28 font-semibold text-oro">
            {party.majorityAnswers?.length
              ? party.majorityAnswers.join(', ')
              : 'Empate: nadie puntúa'}
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
          <p className="text-20 text-humo">
            {playerNick(view, party.cluePlayerId)} está dando una pista
          </p>
        )}
      </div>
    </main>
  );
}

function playerNick(
  view: { players: { playerId: PlayerId; nick: string }[] },
  playerId: PlayerId,
): string {
  return view.players.find((player) => player.playerId === playerId)?.nick ?? 'Alguien';
}
