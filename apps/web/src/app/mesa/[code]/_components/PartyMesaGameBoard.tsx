// Pantalla central de los modos sociales. Solo recibe datos ya públicos: no
// pinta manos numéricas ni objetivos de Escala mientras siguen ocultos.
import type { PartyTableView, PlayerId } from '@ronda/protocol';
import { MatizArtwork } from '@/components/matiz/MatizGame';
import { TableHeader } from '@/app/sala/[code]/_components/TableHeader';
import { ColorCountdownHeader } from '@/app/sala/[code]/_components/ColorCountdownHeader';
import { NumberTableGrid } from '@/components/cards/NumberTableGrid';
import { MATIZ_COLOR_TOKENS } from '@/lib/tokens';

export interface PartyMesaGameBoardProps {
  view: PartyTableView;
}

export function PartyMesaGameBoard({ view }: PartyMesaGameBoardProps) {
  if (view.gameId === 'orden') return <OrdenMesaBoard view={view} />;
  if (view.gameId === 'colores') return <ColoresMesaBoard view={view} />;
  if (view.gameId === 'mayoria') return <MayoriaMesaBoard view={view} />;
  if (view.gameId === 'matiz') return <MatizMesaBoard view={view} />;
  return <EscalaMesaBoard view={view} />;
}

function MatizMesaBoard({ view }: { view: Extract<PartyTableView, { gameId: 'matiz' }> }) {
  const party = view.party;
  return (
    <main className="flex min-h-dvh flex-1 flex-col">
      <TableHeader left={`Matiz · ronda ${view.round}/${view.config.rounds}`} turnNick={null} />
      <div className="flex flex-1 flex-col items-center gap-6 overflow-y-auto px-10 py-8 text-center">
        <div>
          <p className="text-20 font-semibold uppercase tracking-[0.14em] text-oro">{party.title}</p>
          <h1 className="mt-2 text-[clamp(1.5rem,3vw,2.4rem)] font-semibold text-hueso">{party.subtitle}</h1>
        </div>
        <MatizArtwork
          challengeId={party.challengeId}
          color={MATIZ_COLOR_TOKENS.neutral}
          targetHex={party.targetHex}
          className="w-full max-w-2xl"
        />
        {party.phase === 'input' ? (
          <p className="text-20 text-humo">
            {party.submittedPlayerIds.length}/{view.players.length} colores bloqueados
          </p>
        ) : (
          <section className="grid w-full max-w-3xl gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {view.players.map((player) => {
              const answer = party.answers?.[player.playerId];
              const points = party.scoreDeltas?.[player.playerId] ?? 0;
              return (
                <div key={player.playerId} className="flex items-center gap-3 rounded-2xl border border-linea bg-mesa px-4 py-3 text-left">
                  <span className="size-11 shrink-0 rounded-xl border-2 border-white shadow" style={{ backgroundColor: answer ?? MATIZ_COLOR_TOKENS.placeholder }} />
                  <span className="min-w-0 flex-1 truncate text-18 font-semibold text-hueso">{player.nick}</span>
                  <span className="font-mono text-20 font-semibold text-oro">+{points}</span>
                </div>
              );
            })}
          </section>
        )}
      </div>
    </main>
  );
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
  const resolved = party.groups !== null;
  return (
    <main className="flex min-h-dvh flex-1 flex-col">
      <TableHeader left={`Mayoría · ronda ${view.round}`} turnNick={null} />
      <div className="flex flex-1 flex-col items-center gap-6 overflow-y-auto px-10 py-10 text-center">
        <h1 className="max-w-4xl text-[clamp(2rem,5vw,4rem)] font-semibold text-hueso">
          {party.prompt}
        </h1>
        {party.phase === 'input' ? (
          <p className="text-20 text-humo">
            {party.submittedPlayerIds.length}/{view.players.length} respuestas guardadas
          </p>
        ) : !resolved ? (
          <>
            <div>
              <p className="text-28 font-semibold text-oro">Respuestas reveladas</p>
              <p className="mt-2 text-16 text-humo">
                El anfitrión está agrupando las respuestas que significan lo mismo.
              </p>
            </div>
            <div className="grid w-full max-w-5xl gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Object.entries(party.answers ?? {}).map(([playerId, answer]) => (
                <div
                  key={playerId}
                  className="flex flex-col gap-1 rounded-2xl border border-linea bg-mesa/80 px-4 py-3 text-left"
                >
                  <span className="text-12 font-semibold uppercase tracking-wider text-humo">
                    {playerNick(view, playerId)}
                  </span>
                  <span className="text-18 font-semibold text-hueso">{answer}</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            <p className="text-28 font-semibold text-oro">
              {party.majorityAnswers?.length
                ? `Mayoría: ${party.majorityAnswers.join(', ')}`
                : 'Empate: nadie puntúa'}
            </p>
            {party.pinkCowPlayerId ? (
              <p className="text-18 font-semibold text-rosa">
                🐄 Vaca rosa: {playerNick(view, party.pinkCowPlayerId)}
              </p>
            ) : null}
            <div className="grid w-full max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {(party.groups ?? []).map((group) => {
                const winning = party.majorityAnswers?.includes(group.answer) ?? false;
                return (
                  <div
                    key={group.playerIds.join('-')}
                    className={`flex flex-col gap-2 rounded-2xl border px-5 py-4 text-left ${
                      winning ? 'border-oro bg-oro/10' : 'border-linea bg-mesa/80'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-20 font-semibold text-hueso">{group.answer}</span>
                      <span className="font-mono text-20 text-oro">{group.playerIds.length}</span>
                    </div>
                    <span className="text-14 text-humo">
                      {group.playerIds.map((playerId) => playerNick(view, playerId)).join(', ')}
                    </span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </main>
  );
}

function EscalaMesaBoard({ view }: { view: Extract<PartyTableView, { gameId: 'escala' }> }) {
  const party = view.party;
  return (
    <main className="flex min-h-dvh flex-1 flex-col">
      <ColorCountdownHeader
        left={`Escala · ronda ${view.round}`}
        deadlineAt={party.phase === 'input' ? party.deadlineAt : null}
        durationSeconds={view.config.answerTimeSeconds}
      />
      <div className="flex flex-1 flex-col items-center justify-center gap-8 px-10 py-10 text-center">
        <div className="flex w-full max-w-5xl items-center justify-between gap-6 text-[clamp(1.5rem,4vw,3rem)] font-semibold text-hueso">
          <span>{party.leftLabel}</span>
          <span className="text-humo">↔</span>
          <span>{party.rightLabel}</span>
        </div>
        {party.clue ? (
          <div className="flex max-w-4xl flex-col gap-3">
            <p className="text-20 uppercase tracking-wider text-humo">Pista</p>
            <p className="text-[clamp(2rem,5vw,4rem)] font-semibold text-hueso">«{party.clue}»</p>
          </div>
        ) : (
          <p className="text-20 text-humo">
            {playerNick(view, party.cluePlayerId)} está preparando la pista
          </p>
        )}
        {party.phase === 'input' ? (
          <p className="text-20 text-humo">
            {party.submittedPlayerIds.length} estimaciones confirmadas
          </p>
        ) : (
          <div className="flex w-full max-w-5xl flex-col gap-5">
            <p className="text-40 font-mono text-oro">Punto secreto: {party.target}</p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {view.players
                .filter(
                  (player) =>
                    player.playerId !== party.cluePlayerId &&
                    (view.config.groupMode !== 'groups' ||
                      player.groupIndex === party.clueGroupIndex),
                )
                .map((player) => {
                  const value = party.guesses?.[player.playerId];
                  const distance =
                    value === undefined || party.target === null
                      ? 100
                      : Math.abs(value - party.target);
                  return (
                    <div
                      key={player.playerId}
                      className="rounded-2xl border border-linea bg-mesa/70 px-4 py-3"
                    >
                      <p className="text-18 font-semibold text-hueso">{player.nick}</p>
                      <p className="mt-1 font-mono text-20 text-oro">
                        {value === undefined ? 'Sin respuesta' : value}
                        {view.config.groupMode === 'groups'
                          ? ` · distancia ${distance}`
                          : ` · +${party.scoreDeltas?.[player.playerId] ?? 0}`}
                      </p>
                    </div>
                  );
                })}
            </div>
            {view.config.groupMode === 'groups' && party.clueGroupIndex !== null ? (
              <p className="text-20 font-semibold text-oro">
                Grupo {groupLetter(party.clueGroupIndex)} · distancia media{' '}
                {party.groupAverageDistances?.[String(party.clueGroupIndex)] ?? 100} · +
                {party.groupScoreDeltas?.[String(party.clueGroupIndex)] ?? 0} puntos
              </p>
            ) : null}
            {party.groups ? (
              <div className="flex flex-wrap justify-center gap-3">
                {party.groups.map((group) => (
                  <div
                    key={group.index}
                    className={`rounded-full border px-5 py-2 text-18 ${
                      group.index === party.winnerGroupIndex
                        ? 'border-oro bg-oro/10 text-oro'
                        : 'border-linea bg-mesa/70 text-humo'
                    }`}
                  >
                    Grupo {groupLetter(group.index)} · {group.score}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        )}
      </div>
    </main>
  );
}

function groupLetter(index: number): string {
  return String.fromCharCode('A'.charCodeAt(0) + index);
}

function playerNick(
  view: { players: { playerId: PlayerId; nick: string }[] },
  playerId: PlayerId,
): string {
  return view.players.find((player) => player.playerId === playerId)?.nick ?? 'Alguien';
}
