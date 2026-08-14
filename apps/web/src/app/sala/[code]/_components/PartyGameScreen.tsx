'use client';

import { useEffect, useState, type CSSProperties } from 'react';
import type {
  ColoresPlayerView,
  EscalaPlayerView,
  MayoriaPlayerView,
  OrdenPlayerView,
  PartyPlayerView,
  PlayerId,
} from '@ronda/protocol';
import { useRondaStore } from '@/lib/store';
import { Button } from '@/components/ui/Button';
import { NumberCard, NumberCardFace } from '@/components/cards/NumberCard';
import { TableHeader } from './TableHeader';
import { PlayerStrip } from './PlayerStrip';
import { QuantityStepper } from '@/components/ui/QuantityStepper';

export interface PartyGameScreenProps {
  view: PartyPlayerView;
}

export function PartyGameScreen({ view }: PartyGameScreenProps) {
  if (view.gameId === 'orden') return <OrdenGame view={view} />;
  if (view.gameId === 'colores') return <ColoresGame view={view} />;
  if (view.gameId === 'mayoria') return <MayoriaGame view={view} />;
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
          <div className="flex min-h-36 flex-wrap items-center justify-center gap-3">
            {party.played.length > 0 ? (
              party.played.map((played, index) => (
                <NumberCardFace
                  key={`${played.playerId}-${played.value}-${index}`}
                  value={played.value}
                  className={
                    party.failure?.value === played.value &&
                    party.failure.playerId === played.playerId
                      ? 'number-card-played number-card-failed'
                      : 'number-card-played'
                  }
                />
              ))
            ) : (
              <span className="text-16 text-humo">Aún no hay cartas</span>
            )}
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
  { name: 'rojo', className: 'bg-brasa' },
  { name: 'azul', className: 'bg-azul' },
  { name: 'verde', className: 'bg-verde' },
  { name: 'amarillo', className: 'bg-oro' },
  { name: 'naranja', className: 'bg-teja' },
  { name: 'morado', className: 'bg-violeta' },
  { name: 'rosa', className: 'bg-rosa' },
  { name: 'negro', className: 'bg-tinta' },
  { name: 'blanco', className: 'bg-hueso' },
  { name: 'marrón', className: 'bg-mesa' },
  { name: 'gris', className: 'bg-azul' },
] as const;

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
    if (!party.allowMultiple) {
      setSelected([color]);
      return;
    }
    setSelected((current) =>
      current.includes(color) ? current.filter((item) => item !== color) : [...current, color],
    );
  }

  function submit() {
    if (selected.length === 0) return;
    void useRondaStore.getState().sendAction({ type: 'submitColors', colors: selected });
  }

  return (
    <div className="game-shell flex min-h-0 flex-1 flex-col overflow-hidden">
      <TableHeader
        left={`Ronda ${view.round} · primero a ${view.config.pointsToWin} puntos`}
        turnNick={null}
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
          <p className="mt-2 text-14 text-humo">
            {party.allowMultiple ? 'Puedes elegir varios.' : 'Elige una respuesta.'}
          </p>
          <p className="mt-2 text-12 text-oro">Exacto: 4 puntos · parecido: 1–3 · lejos: 0</p>
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
                  disabled={me.submitted || pendingAction}
                  onClick={() => toggleColor(color.name)}
                  className={`min-h-20 rounded-2xl border-2 px-2 text-14 font-semibold shadow-md transition-[transform,filter,border-color] active:scale-95 ${
                    color.className
                  } ${color.name === 'blanco' ? 'text-tinta' : 'text-hueso'} ${
                    checked
                      ? 'border-oro ring-2 ring-oro ring-offset-2 ring-offset-tinta'
                      : 'border-linea'
                  }`}
                >
                  {color.name}
                </button>
              );
            })}
          </section>
        ) : null}
        {party.phase === 'input' && !me.submitted ? (
          <Button onClick={submit} disabled={selected.length === 0} loading={pendingAction}>
            Guardar respuesta
          </Button>
        ) : party.phase === 'input' ? (
          <p className="text-16 text-oro">Respuesta guardada. Espera a los demás.</p>
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
  const answers = view.party.answers;
  return (
    <section className="surface-panel flex w-full max-w-md flex-col gap-3 p-4">
      <p className="text-16 text-hueso">Correctos: {view.party.correctColors?.join(', ')}</p>
      {answers
        ? Object.entries(answers).map(([playerId, colors]) => (
            <p key={playerId} className="text-14 text-humo">
              {playerNick(view, playerId)}: {colors.join(', ')}
            </p>
          ))
        : null}
    </section>
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
        left={`Ronda ${view.round} · primero a ${view.config.pointsToWin} puntos`}
        turnNick={null}
      />
      <PlayerStrip
        players={view.players}
        turnPlayerId={null}
        myPlayerId={me.playerId}
        renderInfo={(player) => `${player.score} puntos`}
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
            <Button onClick={submit} disabled={!answer.trim()} loading={pendingAction}>
              Guardar respuesta
            </Button>
          </div>
        ) : party.phase === 'input' ? (
          <p className="text-16 text-oro">Respuesta guardada. Espera a los demás.</p>
        ) : (
          <MajorityReveal view={view} />
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

function MajorityReveal({ view }: { view: MayoriaPlayerView }) {
  const answers = view.party.answers;
  return (
    <section className="surface-panel flex w-full max-w-md flex-col gap-3 p-4">
      <p className="text-16 font-semibold text-oro">
        {view.party.majorityAnswers?.length
          ? `Mayoría: ${view.party.majorityAnswers.join(', ')}`
          : 'No hubo mayoría: empate.'}
      </p>
      {answers
        ? Object.entries(answers).map(([playerId, answer]) => (
            <p key={playerId} className="text-14 text-humo">
              {playerNick(view, playerId)}: {answer}
            </p>
          ))
        : null}
    </section>
  );
}

function EscalaGame({ view }: { view: EscalaPlayerView }) {
  const pendingAction = useRondaStore((state) => state.pendingAction);
  const [guess, setGuess] = useState(50);
  const { party, me } = view;
  const isGuide = party.cluePlayerId === me.playerId;
  const isHost = view.players.find((player) => player.playerId === me.playerId)?.isHost ?? false;

  useEffect(() => {
    setGuess(50);
  }, [party.questionId]);

  function submit() {
    void useRondaStore.getState().sendAction({ type: 'submitScale', value: guess });
  }

  return (
    <div className="game-shell flex min-h-0 flex-1 flex-col overflow-hidden">
      <TableHeader
        left={`Ronda ${view.round} · primero a ${view.config.pointsToWin} puntos`}
        turnNick={
          view.players.find((player) => player.playerId === party.cluePlayerId)?.nick ?? null
        }
      />
      <PlayerStrip
        players={view.players}
        turnPlayerId={party.cluePlayerId}
        myPlayerId={me.playerId}
        renderInfo={(player) => `${player.score} puntos`}
      />
      <main className="flex min-h-0 flex-1 flex-col items-center gap-5 overflow-y-auto px-4 py-6">
        <section className="surface-panel w-full max-w-md p-5 text-center">
          <span className="text-12 uppercase tracking-wider text-humo">Escala</span>
          <div className="mt-3 flex items-center justify-between gap-3 text-16 font-semibold text-hueso">
            <span>{party.leftLabel}</span>
            <span className="text-humo">·</span>
            <span>{party.rightLabel}</span>
          </div>
          <p className="mt-3 text-14 text-humo">
            {isGuide
              ? 'Tienes el objetivo. Da una pista hablando, sin decir el número.'
              : 'Coloca tu estimación.'}
          </p>
        </section>
        {party.phase === 'input' && isGuide ? (
          <p className="rounded-lg border border-oro bg-mesa px-4 py-3 text-center text-16 text-oro">
            Tu objetivo secreto está entre 0 y 100. Los demás no lo ven.
          </p>
        ) : null}
        {party.phase === 'input' && !isGuide && !me.submitted ? (
          <div className="flex w-full max-w-md flex-col gap-4">
            <label htmlFor="scale-guess" className="flex justify-between text-16 text-hueso">
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
              className="ronda-range my-3"
              style={{ '--range-value': `${guess}%` } as CSSProperties}
            />
            <div className="flex justify-between text-12 text-humo">
              <span>0</span>
              <span>50</span>
              <span>100</span>
            </div>
            <Button onClick={submit} loading={pendingAction}>
              Fijar estimación
            </Button>
          </div>
        ) : party.phase === 'input' && !isGuide ? (
          <p className="text-16 text-oro">Estimación guardada. Espera a los demás.</p>
        ) : null}
        {party.phase === 'reveal' ? <ScaleReveal view={view} /> : null}
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

function ScaleReveal({ view }: { view: EscalaPlayerView }) {
  const guesses = view.party.guesses;
  return (
    <section className="surface-panel flex w-full max-w-md flex-col gap-3 p-4">
      <p className="text-16 font-semibold text-oro">Objetivo: {view.party.target}</p>
      {guesses
        ? Object.entries(guesses).map(([playerId, value]) => (
            <p key={playerId} className="text-14 text-humo">
              {playerNick(view, playerId)}: {value}
            </p>
          ))
        : null}
    </section>
  );
}

function playerNick(
  view: { players: { playerId: PlayerId; nick: string }[] },
  playerId: string,
): string {
  return view.players.find((player) => player.playerId === playerId)?.nick ?? 'Alguien';
}
