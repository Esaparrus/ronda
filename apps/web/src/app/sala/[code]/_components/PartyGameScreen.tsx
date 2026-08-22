'use client';

import { useEffect, useState, type CSSProperties } from 'react';
import type {
  ColoresPlayerView,
  EscalaPlayerView,
  MajorityGroup,
  MayoriaPlayerView,
  OrdenPlayerView,
  PartyPlayerView,
  PlayerId,
} from '@ronda/protocol';
import { MatizPlayerRound } from '@/components/matiz/MatizGame';
import { useRondaStore } from '@/lib/store';
import { Button } from '@/components/ui/Button';
import { NumberCard } from '@/components/cards/NumberCard';
import { NumberTableGrid } from '@/components/cards/NumberTableGrid';
import { TableHeader } from './TableHeader';
import { PlayerStrip } from './PlayerStrip';
import { QuantityStepper } from '@/components/ui/QuantityStepper';
import { ColorCountdownHeader } from './ColorCountdownHeader';

export interface PartyGameScreenProps {
  view: PartyPlayerView;
}

export function PartyGameScreen({ view }: PartyGameScreenProps) {
  if (view.gameId === 'orden') return <OrdenGame view={view} />;
  if (view.gameId === 'colores') return <ColoresGame view={view} />;
  if (view.gameId === 'mayoria') return <MayoriaGame view={view} />;
  if (view.gameId === 'matiz') return <MatizPlayerRound view={view} />;
  return <EscalaGame view={view} />;
}

function OrdenGame({ view }: { view: OrdenPlayerView }) {
  const pendingAction = useRondaStore((state) => state.pendingAction);
  const lastError = useRondaStore((state) => state.lastError);
  const { party, me } = view;
  const [numberDrag, setNumberDrag] = useState({ active: false, ready: false });
  const isHost = view.players.find((player) => player.playerId === me.playerId)?.isHost ?? false;

  function playNumber(value: number) {
    void useRondaStore.getState().sendAction({ type: 'playNumber', value });
  }

  function nextLevel() {
    void useRondaStore.getState().sendAction({ type: 'nextRound' });
  }

  function endOrder() {
    void useRondaStore.getState().sendAction({ type: 'endOrder' });
  }

  return (
    <div className="game-shell flex min-h-0 flex-1 flex-col overflow-hidden">
      <TableHeader
        left={`Ronda ${party.round} · ${party.cardsPerPlayer} carta${party.cardsPerPlayer === 1 ? '' : 's'} por persona`}
        turnNick={null}
      />
      <PlayerStrip
        players={view.players}
        turnPlayerId={null}
        myPlayerId={me.playerId}
        renderInfo={(player) =>
          `${player.handCount} ${player.handCount === 1 ? 'carta' : 'cartas'}`
        }
      />
      <main className="flex min-h-0 flex-1 flex-col items-center gap-5 overflow-y-auto px-4 py-5">
        <p className="drag-instruction max-w-md text-center">
          Toca o desliza una carta hacia el centro
        </p>
        <section
          data-card-drop-target="number"
          className={`surface-panel drop-zone flex w-full max-w-md flex-col items-center gap-3 p-5 ${
            numberDrag.ready ? 'drop-zone-active' : ''
          }`}
        >
          <span className="text-12 uppercase tracking-wider text-humo">
            {numberDrag.active
              ? numberDrag.ready
                ? 'Suelta para jugarla'
                : 'Lleva la carta hasta aquí'
              : `Centro · quedan ${party.deckCount} cartas sin repartir`}
          </span>
          <div className="flex min-h-36 w-full items-center justify-center">
            <NumberTableGrid cards={party.played} failure={party.failure} variant="compact" />
          </div>
          <p className="font-mono text-14 text-oro">Última válida: {party.highest || '—'}</p>
        </section>

        {party.failure ? (
          <section
            role="status"
            className="flex w-full max-w-md flex-col gap-2 rounded-xl border border-brasa bg-mesa p-4 text-center"
          >
            <p className="text-16 text-brasa">
              {playerNick(view, party.failure.playerId)} jugó {party.failure.value}, pero la última
              válida era {party.failure.highest}.
            </p>
            <p className="text-14 text-humo">
              La ronda se detiene aquí. La carta se descarta y no hay vidas: decidid si queréis
              repartir de nuevo.
            </p>
            {isHost ? (
              <p className="text-14 font-semibold text-hueso">
                Puedes cambiar el número de cartas o terminar la partida.
              </p>
            ) : (
              <p className="text-14 text-humo">Esperando a que el anfitrión decida.</p>
            )}
          </section>
        ) : null}

        <section className="flex w-full max-w-md flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-20 font-semibold text-hueso">Tus cartas</h2>
            <span className="text-14 text-humo">{me.hand.length} pendientes</span>
          </div>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {me.hand.map((value) => (
              <NumberCard
                key={value}
                value={value}
                disabled={pendingAction || view.phase !== 'input'}
                onPlay={playNumber}
                onDragStateChange={(active, ready) => setNumberDrag({ active, ready })}
              />
            ))}
          </div>
          {me.hand.length === 0 && view.phase === 'input' ? (
            <p className="text-center text-14 text-humo">
              Ya has jugado todas tus cartas. Espera al resto.
            </p>
          ) : null}
        </section>

        {lastError ? <p className="text-14 text-brasa">{lastError}</p> : null}
        {view.phase === 'reveal' &&
        view.status === 'playing' &&
        me.availableActions.includes('setOrderCards') ? (
          <div className="surface-panel w-full max-w-md p-4">
            <QuantityStepper
              legend="Próximo reparto"
              helperText="Elige cuántas cartas recibe cada persona."
              value={party.nextCardsPerPlayer}
              disabled={pendingAction}
              onChange={(count) =>
                void useRondaStore.getState().sendAction({
                  type: 'setOrderCards',
                  count,
                })
              }
              options={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((count) => ({
                value: count,
                label: String(count),
              }))}
              valueSuffix="cartas por persona"
            />
          </div>
        ) : null}
        {view.phase === 'reveal' &&
        view.status === 'playing' &&
        me.availableActions.includes('nextRound') ? (
          <Button onClick={nextLevel} loading={pendingAction}>
            {party.failure ? (
              'Repartir de nuevo'
            ) : (
              <>
                Repartir {party.nextCardsPerPlayer} carta{party.nextCardsPerPlayer === 1 ? '' : 's'}
              </>
            )}
          </Button>
        ) : null}
        {party.failure && view.status === 'playing' && me.availableActions.includes('endOrder') ? (
          <Button variant="danger" onClick={endOrder} loading={pendingAction}>
            Terminar partida
          </Button>
        ) : null}
        {view.phase === 'reveal' && view.status === 'playing' && !isHost ? (
          <p className="text-center text-14 text-humo">
            Esperando al anfitrión para el siguiente reparto.
          </p>
        ) : null}
      </main>
    </div>
  );
}

const COLOR_OPTIONS = [
  { name: 'rojo', className: 'bg-ficha-rojo', symbol: '●', darkText: false },
  { name: 'azul', className: 'bg-ficha-azul', symbol: '◆', darkText: false },
  { name: 'verde', className: 'bg-ficha-verde', symbol: '▲', darkText: false },
  { name: 'amarillo', className: 'bg-ficha-amarillo', symbol: '✦', darkText: true },
  { name: 'naranja', className: 'bg-ficha-naranja', symbol: '⬟', darkText: true },
  { name: 'morado', className: 'bg-ficha-morado', symbol: '✚', darkText: false },
  { name: 'rosa', className: 'bg-ficha-rosa', symbol: '♥', darkText: true },
  { name: 'negro', className: 'bg-ficha-negro', symbol: '■', darkText: false },
  { name: 'blanco', className: 'bg-ficha-blanco', symbol: '○', darkText: true },
  { name: 'marrón', className: 'bg-ficha-marron', symbol: '⬢', darkText: false },
  { name: 'gris', className: 'bg-ficha-gris', symbol: '╳', darkText: false },
] as const;

const COLOR_OPTION_BY_NAME = new Map(COLOR_OPTIONS.map((color) => [color.name, color]));

function ColoresGame({ view }: { view: ColoresPlayerView }) {
  const pendingAction = useRondaStore((state) => state.pendingAction);
  const [selected, setSelected] = useState<string[]>([]);
  const { party, me } = view;
  const isHost = view.players.find((player) => player.playerId === me.playerId)?.isHost ?? false;

  useEffect(() => {
    setSelected([]);
  }, [party.questionId]);

  function toggleColor(color: string) {
    if (party.phase !== 'input' || me.submitted) return;
    setSelected((current) => {
      if (current.includes(color)) return current.filter((item) => item !== color);
      if (current.length >= party.answerCount) return current;
      return [...current, color];
    });
  }

  function submit() {
    if (selected.length !== party.answerCount) return;
    void useRondaStore.getState().sendAction({ type: 'submitColors', colors: selected });
  }

  return (
    <div className="game-shell flex min-h-0 flex-1 flex-col overflow-hidden">
      <ColorCountdownHeader
        left={`Ronda ${view.round} · primero a ${view.config.pointsToWin} puntos`}
        deadlineAt={party.deadlineAt}
      />
      <PlayerStrip
        players={view.players}
        turnPlayerId={null}
        myPlayerId={me.playerId}
        renderInfo={(player) => `${player.score} puntos`}
      />
      <main className="flex min-h-0 flex-1 flex-col items-center gap-5 overflow-y-auto px-4 py-6">
        <section className="surface-panel w-full max-w-md p-5 text-center">
          <span className="text-12 uppercase tracking-wider text-humo">Colores</span>
          <h1 className="mt-3 text-20 font-semibold text-hueso">{party.prompt}</h1>
          <p className="mt-3 text-16 font-semibold text-oro">
            Elige exactamente {party.answerCount} {party.answerCount === 1 ? 'color' : 'colores'}
          </p>
          <p className="mt-2 text-12 text-humo">
            Quien acierte gana 1 punto por cada rival que falle, más el bote.
          </p>
          {party.rollover > 0 ? (
            <p className="mt-2 font-mono text-14 font-semibold text-crema">
              Bote: +{party.rollover}
            </p>
          ) : null}
          {party.deadlineAt === null && party.phase === 'input' ? (
            <p className="mt-2 text-12 text-humo">
              La primera respuesta inicia la cuenta atrás de 15 segundos.
            </p>
          ) : null}
        </section>
        {party.phase === 'input' ? (
          <section className="grid w-full max-w-md grid-cols-3 gap-3">
            {COLOR_OPTIONS.map((color) => {
              const checked = selected.includes(color.name);
              return (
                <button
                  key={color.name}
                  type="button"
                  aria-pressed={checked}
                  aria-label={`${color.name}${checked ? ', seleccionado' : ''}`}
                  disabled={me.submitted || pendingAction}
                  onClick={() => toggleColor(color.name)}
                  className={`min-h-20 rounded-2xl border-2 px-2 text-14 font-semibold shadow-md transition-[transform,filter,border-color] active:scale-95 ${
                    color.className
                  } ${color.darkText ? 'text-carbon' : 'text-white'} ${
                    checked
                      ? 'border-oro ring-2 ring-oro ring-offset-2 ring-offset-tinta'
                      : 'border-linea'
                  }`}
                >
                  <span className="flex flex-col items-center gap-1">
                    <span className="text-20 leading-none" aria-hidden="true">
                      {color.symbol}
                    </span>
                    <span>{color.name}</span>
                  </span>
                </button>
              );
            })}
          </section>
        ) : null}
        {party.phase === 'input' && !me.submitted ? (
          <Button
            onClick={submit}
            disabled={selected.length !== party.answerCount}
            loading={pendingAction}
          >
            Bloquear respuesta ({selected.length}/{party.answerCount})
          </Button>
        ) : party.phase === 'input' ? (
          <p className="text-center text-16 text-oro">
            Respuesta bloqueada. El resto tiene 15 segundos desde la primera respuesta.
          </p>
        ) : (
          <ColorsReveal view={view} />
        )}
        {party.phase === 'reveal' && view.status === 'playing' && isHost ? (
          <Button
            onClick={() => void useRondaStore.getState().sendAction({ type: 'nextRound' })}
            loading={pendingAction}
          >
            Siguiente ronda
          </Button>
        ) : null}
        {party.phase === 'reveal' && view.status === 'playing' && !isHost ? (
          <p className="text-center text-14 text-humo">Esperando al anfitrión.</p>
        ) : null}
      </main>
    </div>
  );
}

function ColorsReveal({ view }: { view: ColoresPlayerView }) {
  const { answers, correctColors, scoreDeltas, rollover } = view.party;
  const correctCount = view.players.filter((player) =>
    isExactColorAnswer(answers?.[player.playerId], correctColors),
  ).length;
  const everyoneCorrect = correctCount === view.players.length;
  const nobodyCorrect = correctCount === 0;

  return (
    <section className="surface-panel flex w-full max-w-md flex-col gap-4 p-4">
      <div className="text-center">
        <p className="text-12 uppercase tracking-wider text-humo">Respuesta correcta</p>
        <div className="mt-2 flex flex-wrap justify-center gap-2">
          {correctColors?.map((color) => (
            <ColorChip key={color} color={color} />
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {view.players.map((player) => {
          const colors = answers?.[player.playerId];
          const correct = isExactColorAnswer(colors, correctColors);
          const delta = scoreDeltas?.[player.playerId] ?? 0;
          return (
            <div
              key={player.playerId}
              className={`rounded-xl border px-3 py-2 ${
                correct ? 'border-verde bg-verde/15' : 'border-linea bg-tinta/30'
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-14 font-semibold text-hueso">{player.nick}</span>
                <span
                  className={correct ? 'text-14 font-semibold text-crema' : 'text-14 text-humo'}
                >
                  {correct ? (delta > 0 ? `+${delta}` : 'Acierto') : 'Fallo'}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {colors?.length ? (
                  colors.map((color) => <ColorChip key={color} color={color} />)
                ) : (
                  <span className="text-12 text-humo">Sin respuesta</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-center text-14 text-humo">
        {everyoneCorrect
          ? `Todos habéis acertado: el bote sube a +${rollover}.`
          : nobodyCorrect
            ? 'Nadie ha acertado: el bote se pierde.'
            : `${view.players.length - correctCount} ${view.players.length - correctCount === 1 ? 'rival ha fallado' : 'rivales han fallado'}.`}
      </p>
    </section>
  );
}

function ColorChip({ color }: { color: string }) {
  const option = COLOR_OPTION_BY_NAME.get(color as (typeof COLOR_OPTIONS)[number]['name']);
  if (!option) return <span className="text-12 text-humo">{color}</span>;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border border-hueso/30 px-2 py-1 text-12 font-semibold ${
        option.className
      } ${option.darkText ? 'text-carbon' : 'text-white'}`}
    >
      <span aria-hidden="true">{option.symbol}</span>
      {option.name}
    </span>
  );
}

function isExactColorAnswer(
  answer: readonly string[] | undefined,
  correct: readonly string[] | null,
): boolean {
  return (
    answer !== undefined &&
    correct !== null &&
    answer.length === correct.length &&
    correct.every((color) => answer.includes(color))
  );
}

function MayoriaGame({ view }: { view: MayoriaPlayerView }) {
  const pendingAction = useRondaStore((state) => state.pendingAction);
  const [answer, setAnswer] = useState('');
  const { party, me } = view;
  const isHost = view.players.find((player) => player.playerId === me.playerId)?.isHost ?? false;

  useEffect(() => {
    setAnswer('');
  }, [party.questionId]);

  function submit() {
    if (!answer.trim()) return;
    void useRondaStore.getState().sendAction({ type: 'submitMajority', answer: answer.trim() });
  }

  return (
    <div className="game-shell flex min-h-0 flex-1 flex-col overflow-hidden">
      <TableHeader
        left={`Ronda ${view.round} · primero a ${view.config.pointsToWin} vacas`}
        turnNick={null}
      />
      <PlayerStrip
        players={view.players}
        turnPlayerId={null}
        myPlayerId={me.playerId}
        renderInfo={(player) => {
          const hasPinkCow = player.playerId === party.pinkCowPlayerId;
          return (
            <span
              role="img"
              className="inline-flex items-center gap-1"
              aria-label={`${player.score} vacas${hasPinkCow ? ', tiene la vaca rosa' : ''}`}
              title={hasPinkCow ? 'Tiene la vaca rosa' : undefined}
            >
              <span>{player.score}</span>
              <span aria-hidden="true" className="text-14 leading-none">
                🐄
              </span>
              {hasPinkCow ? (
                <span aria-hidden="true" className="text-[9px] text-rosa">
                  ●
                </span>
              ) : null}
            </span>
          );
        }}
      />
      <main className="flex min-h-0 flex-1 flex-col items-center gap-5 overflow-y-auto px-4 py-6">
        <section className="surface-panel w-full max-w-md p-5 text-center">
          <span className="text-12 uppercase tracking-wider text-humo">Mayoría</span>
          <h1 className="mt-3 text-20 font-semibold text-hueso">{party.prompt}</h1>
        </section>
        {party.phase === 'input' && !me.submitted ? (
          <div className="flex w-full max-w-md flex-col gap-3">
            <label htmlFor="majority-answer" className="text-16 font-semibold text-hueso">
              Tu respuesta
            </label>
            <input
              id="majority-answer"
              value={answer}
              maxLength={80}
              autoComplete="off"
              onChange={(event) => setAnswer(event.target.value)}
              className="form-control px-4 text-16"
            />
            <p className="text-12 text-humo">
              El anfitrión podrá unir respuestas que signifiquen lo mismo.
            </p>
            <Button onClick={submit} disabled={!answer.trim()} loading={pendingAction}>
              Guardar respuesta
            </Button>
          </div>
        ) : party.phase === 'input' ? (
          <p className="text-16 text-oro">Respuesta guardada. Espera a los demás.</p>
        ) : (
          <MajorityReveal view={view} />
        )}
        {party.phase === 'reveal' && view.status === 'playing' && party.groups && isHost ? (
          <Button
            onClick={() => void useRondaStore.getState().sendAction({ type: 'nextRound' })}
            loading={pendingAction}
          >
            Siguiente ronda
          </Button>
        ) : null}
        {party.phase === 'reveal' && view.status === 'playing' && !party.groups && !isHost ? (
          <p className="text-center text-14 text-humo">Esperando al anfitrión.</p>
        ) : null}
        {party.phase === 'reveal' && view.status === 'playing' && party.groups && !isHost ? (
          <p className="text-center text-14 text-humo">
            Resultados confirmados. Esperando al anfitrión.
          </p>
        ) : null}
      </main>
    </div>
  );
}

function MajorityReveal({ view }: { view: MayoriaPlayerView }) {
  const answers = view.party.answers;
  const pendingAction = useRondaStore((state) => state.pendingAction);
  const isHost =
    view.players.find((player) => player.playerId === view.me.playerId)?.isHost ?? false;
  const [draftGroups, setDraftGroups] = useState<MajorityDraftGroup[]>(() =>
    suggestedMajorityGroups(answers),
  );

  if (!answers) return null;

  const resolved = view.party.groups !== null;

  function mergeGroups(sourceIndex: number, targetIndex: number) {
    setDraftGroups((current) => {
      const source = current[sourceIndex];
      const target = current[targetIndex];
      if (!source || !target || sourceIndex === targetIndex) return current;
      return current
        .map((group, index) =>
          index === targetIndex
            ? { ...group, playerIds: [...group.playerIds, ...source.playerIds] }
            : group,
        )
        .filter((_, index) => index !== sourceIndex);
    });
  }

  function resolve() {
    void useRondaStore.getState().sendAction({
      type: 'resolveMajority',
      groups: draftGroups.map((group) => group.playerIds),
    });
  }

  return (
    <section className="surface-panel flex w-full max-w-md flex-col gap-3 p-4">
      {resolved ? (
        <p className="text-16 font-semibold text-oro">
          {view.party.majorityAnswers?.length
            ? `Mayoría: ${view.party.majorityAnswers.join(', ')}`
            : 'No hubo mayoría: empate.'}
        </p>
      ) : (
        <>
          <p className="text-16 font-semibold text-oro">Revisad las respuestas</p>
          <p className="text-12 text-humo">
            El anfitrión puede unir grupos cuando una falta, un apodo o un nombre abreviado se
            refieren claramente a lo mismo.
          </p>
        </>
      )}

      <div className="flex flex-col gap-3">
        {(resolved ? (view.party.groups ?? []) : draftGroups).map((group, groupIndex) => (
          <div
            key={`${groupIndex}-${group.answer}`}
            className="rounded-xl border border-linea bg-tinta/30 p-3"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-16 font-semibold text-hueso">{group.answer}</span>
              <span className="font-mono text-14 text-oro">{group.playerIds.length}</span>
            </div>
            <div className="mt-2 flex flex-col gap-1">
              {group.playerIds.map((playerId) => (
                <span key={playerId} className="text-13 text-humo">
                  {playerNick(view, playerId)}: {answers[playerId]}
                  {resolved && view.party.scoreDeltas?.[playerId] ? ' · +1' : ''}
                </span>
              ))}
            </div>
            {!resolved && isHost ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {draftGroups.map((otherGroup, otherIndex) =>
                  otherIndex === groupIndex ? null : (
                    <button
                      key={`${groupIndex}-${otherIndex}`}
                      type="button"
                      onClick={() => mergeGroups(groupIndex, otherIndex)}
                      className="rounded-full border border-oro/50 px-3 py-2 text-12 font-semibold text-oro transition-colors hover:bg-oro/10"
                    >
                      Unir con «{otherGroup.answer}»
                    </button>
                  ),
                )}
              </div>
            ) : null}
          </div>
        ))}
      </div>

      {!resolved && isHost ? (
        <Button onClick={resolve} loading={pendingAction}>
          Confirmar grupos y puntuar
        </Button>
      ) : null}

      {resolved && view.party.pinkCowPlayerId ? (
        <p className="text-center text-14 text-rosa">
          🐄 Vaca rosa: {playerNick(view, view.party.pinkCowPlayerId)}. No puede ganar mientras la
          tenga.
        </p>
      ) : null}
    </section>
  );
}

type MajorityDraftGroup = Pick<MajorityGroup, 'answer' | 'playerIds'>;

function suggestedMajorityGroups(answers: Record<PlayerId, string> | null): MajorityDraftGroup[] {
  const groups = new Map<string, MajorityDraftGroup>();
  for (const [playerId, answer] of Object.entries(answers ?? {})) {
    const key = normalizeMajorityText(answer);
    const group = groups.get(key);
    if (group) group.playerIds.push(playerId);
    else groups.set(key, { answer, playerIds: [playerId] });
  }
  return [...groups.values()];
}

function normalizeMajorityText(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase('es-ES')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function EscalaGame({ view }: { view: EscalaPlayerView }) {
  const pendingAction = useRondaStore((state) => state.pendingAction);
  const [guess, setGuess] = useState(50);
  const [clue, setClue] = useState('');
  const { party, me } = view;
  const isGuide = party.cluePlayerId === me.playerId;
  const myPlayer = view.players.find((player) => player.playerId === me.playerId);
  const isOpponentOfGuide =
    view.config.groupMode === 'groups' &&
    myPlayer?.groupIndex !== null &&
    myPlayer?.groupIndex !== undefined &&
    myPlayer?.groupIndex !== party.clueGroupIndex &&
    !isGuide;
  const guesserCount = view.players.filter((player) => {
    if (player.playerId === party.cluePlayerId) return false;
    if (view.config.groupMode !== 'groups') return true;
    return player.groupIndex === party.clueGroupIndex;
  }).length;

  useEffect(() => {
    setGuess(50);
    setClue('');
  }, [party.questionId, party.cluePlayerId]);

  function submitClue() {
    if (!clue.trim()) return;
    void useRondaStore.getState().sendAction({ type: 'submitScaleClue', clue: clue.trim() });
  }

  function submitGuess() {
    void useRondaStore.getState().sendAction({ type: 'submitScale', value: guess });
  }

  return (
    <div className="game-shell flex min-h-0 flex-1 flex-col overflow-hidden">
      <ColorCountdownHeader
        left={`Ronda ${view.round} · primero a ${view.config.pointsToWin} puntos`}
        deadlineAt={party.phase === 'input' ? party.deadlineAt : null}
        durationSeconds={view.config.answerTimeSeconds}
      />
      <PlayerStrip
        players={view.players}
        turnPlayerId={party.cluePlayerId}
        myPlayerId={me.playerId}
        groups={party.groups ?? undefined}
        renderInfo={(player) => {
          const group = party.groups?.find((candidate) => candidate.index === player.groupIndex);
          return group
            ? `Grupo ${groupLetter(group.index)} · ${group.score} puntos`
            : `${player.score} puntos`;
        }}
      />
      <main className="flex min-h-0 flex-1 flex-col items-center gap-2 overflow-hidden px-3 py-2">
        <section className="surface-panel w-full max-w-md p-3 text-center">
          <span className="text-12 uppercase tracking-wider text-humo">Escala</span>
          <div className="mt-2 flex items-center justify-between gap-2 text-15 font-semibold text-hueso">
            <span>{party.leftLabel}</span>
            <span className="text-humo">·</span>
            <span>{party.rightLabel}</span>
          </div>
          <p className="mt-2 text-13 text-humo">
            {isGuide
              ? view.config.modo === 'online'
                ? 'Escribe una palabra o frase que apunte a tu objetivo.'
                : 'Di una palabra o frase en voz alta y confírmala aquí.'
              : isOpponentOfGuide
                ? party.clue
                  ? 'Esta vuelta responde el grupo de la guía.'
                  : 'El otro grupo está preparando la pista.'
                : party.clue
                  ? 'Lee la pista y coloca el punto que te parezca.'
                  : 'La guía está preparando su pista.'}
          </p>
        </section>

        {party.clue ? (
          <section className="surface-panel w-full max-w-md p-3 text-center">
            <p className="text-12 uppercase tracking-wider text-humo">Pista de la ronda</p>
            <p className="mt-1 text-22 font-semibold leading-tight text-hueso">«{party.clue}»</p>
            <p className="mt-1 text-12 text-humo">
              {party.submittedPlayerIds.length}/{guesserCount} estimaciones confirmadas
            </p>
          </section>
        ) : null}

        {party.phase === 'input' && isGuide && !party.clue ? (
          <div className="flex w-full max-w-md flex-col gap-3">
            <p className="rounded-lg border border-oro bg-mesa px-4 py-3 text-center text-14 text-oro">
              Objetivo secreto: <span className="font-mono text-18">{me.scaleTarget}</span>/100
            </p>
            <label htmlFor="scale-clue" className="text-16 font-semibold text-hueso">
              {view.config.modo === 'online'
                ? 'Tu palabra o frase'
                : 'Confirma la pista que has dicho'}
            </label>
            <input
              id="scale-clue"
              value={clue}
              maxLength={120}
              autoComplete="off"
              onChange={(event) => setClue(event.target.value)}
              className="form-control px-4 text-16"
              placeholder="Por ejemplo: una cena que empieza tranquila…"
            />
            <p className="text-12 text-humo">
              Al aceptar, la pista aparece para todos y empieza la cuenta atrás.
            </p>
            <Button onClick={submitClue} disabled={!clue.trim()} loading={pendingAction}>
              Aceptar pista
            </Button>
          </div>
        ) : null}

        {party.phase === 'input' && isOpponentOfGuide ? (
          <p className="rounded-lg border border-linea bg-mesa px-4 py-3 text-center text-14 text-humo">
            Esta vuelta responde el grupo de la guía. Espera a vuestro siguiente turno.
          </p>
        ) : null}

        {party.phase === 'input' && me.availableActions.includes('submitScale') && !me.submitted ? (
          <div className="flex w-full max-w-md flex-col gap-2">
            <label htmlFor="scale-guess" className="flex justify-between text-15 text-hueso">
              <span>Tu estimación</span>
              <span className="font-mono text-oro">{guess}</span>
            </label>
            <input
              id="scale-guess"
              type="range"
              min={0}
              max={100}
              value={guess}
              onChange={(event) => setGuess(Number(event.target.value))}
              className="ronda-range my-2"
              style={{ '--range-value': `${guess}%` } as CSSProperties}
            />
            <div className="-mt-1 flex justify-between text-11 text-humo">
              <span>0</span>
              <span>50</span>
              <span>100</span>
            </div>
            <Button
              onClick={submitGuess}
              loading={pendingAction}
              className="!min-h-12 rounded-2xl px-5 text-14"
            >
              Aceptar estimación
            </Button>
          </div>
        ) : party.phase === 'input' && me.submitted ? (
          <p className="text-16 text-oro">Estimación guardada. Espera a los demás.</p>
        ) : null}
        {party.phase === 'reveal' ? <ScaleReveal view={view} /> : null}
        {party.phase === 'reveal' && view.status === 'playing' ? (
          <Button
            onClick={() => void useRondaStore.getState().sendAction({ type: 'nextRound' })}
            loading={pendingAction}
            className="!min-h-12 rounded-2xl px-5 text-14"
          >
            Siguiente persona
          </Button>
        ) : null}
      </main>
    </div>
  );
}

function ScaleReveal({ view }: { view: EscalaPlayerView }) {
  const { guesses, scoreDeltas } = view.party;
  const guessers = view.players.filter(
    (player) =>
      player.playerId !== view.party.cluePlayerId &&
      (view.config.groupMode !== 'groups' || player.groupIndex === view.party.clueGroupIndex),
  );
  const groupIndex = view.party.clueGroupIndex;
  const groupAverageDistance =
    groupIndex === null ? undefined : view.party.groupAverageDistances?.[String(groupIndex)];
  const groupPoints = groupIndex === null ? undefined : view.party.groupScoreDeltas?.[String(groupIndex)];
  return (
    <section className="surface-panel flex w-full max-w-md flex-col gap-1 p-2">
      <p className="text-14 font-semibold leading-tight text-oro">
        Punto secreto: {view.party.target}/100
      </p>
      {view.party.clue ? (
        <p className="text-12 leading-tight text-humo">
          Pista: <span className="font-semibold text-hueso">«{view.party.clue}»</span>
        </p>
      ) : null}
      {guesses
        ? guessers.map((player) => {
            const value = guesses[player.playerId];
            const distance =
              value === undefined || view.party.target === null
                ? 100
                : Math.abs(value - view.party.target);
            return (
              <div
                key={player.playerId}
                className="flex items-center justify-between gap-2 text-12 leading-tight text-humo"
              >
                <span className="min-w-0 truncate">
                  {player.nick}: {value === undefined ? 'Sin respuesta' : value}
                </span>
                {view.config.groupMode === 'groups' ? (
                  <span className="font-mono text-oro">dist. {distance}</span>
                ) : (
                  <span className="font-mono text-oro">+{scoreDeltas?.[player.playerId] ?? 0}</span>
                )}
              </div>
            );
          })
        : null}
      {view.config.groupMode === 'groups' && groupAverageDistance !== undefined ? (
        <p className="mt-1 border-t border-linea pt-1 text-12 font-semibold text-oro">
          Grupo {groupIndex === null ? '' : groupLetter(groupIndex)} · distancia media{' '}
          {groupAverageDistance} · +{groupPoints ?? 0} puntos
        </p>
      ) : null}
      {view.party.groups ? (
        <div className="mt-1 border-t border-linea pt-2">
          <p className="text-[10px] uppercase leading-none tracking-wider text-humo">
            Marcador de grupos
          </p>
          <div className="mt-1 grid grid-cols-2 gap-1">
            {view.party.groups.map((group) => (
              <div
                key={group.index}
                className={`rounded-lg border px-2 py-1 ${
                  group.index === view.party.winnerGroupIndex
                    ? 'border-oro bg-oro/10'
                    : 'border-linea bg-tinta/20'
                }`}
              >
                <span className="text-11 text-humo">Grupo {groupLetter(group.index)}</span>
                <span className="ml-1 font-mono text-11 text-oro">{group.score}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function groupLetter(index: number): string {
  return String.fromCharCode('A'.charCodeAt(0) + index);
}

function playerNick(
  view: { players: { playerId: PlayerId; nick: string }[] },
  playerId: string,
): string {
  return view.players.find((player) => player.playerId === playerId)?.nick ?? 'Alguien';
}
