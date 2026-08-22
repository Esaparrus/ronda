'use client';

import { useEffect, useState, type FormEvent } from 'react';
import type {
  BanderasPlayerView,
  CifrasPlayerView,
  CompletaLaFrasePlayerView,
  QuienLoHariaPlayerView,
  RoadmapPlayerView,
} from '@ronda/protocol';
import { useRondaStore } from '@/lib/store';
import { Button } from '@/components/ui/Button';
import { PlayerStrip } from './PlayerStrip';
import { ColorCountdownHeader } from './ColorCountdownHeader';

export interface RoadmapGameScreenProps {
  view: RoadmapPlayerView;
}

export function RoadmapGameScreen({ view }: RoadmapGameScreenProps) {
  if (view.gameId === 'banderas') return <BanderasScreen view={view} />;
  if (view.gameId === 'cifras') return <CifrasScreen view={view} />;
  if (view.gameId === 'quienloharia') return <QuienLoHariaScreen view={view} />;
  return <CompletaLaFraseScreen view={view} />;
}

function BanderasScreen({ view }: { view: BanderasPlayerView }) {
  const pendingAction = useRondaStore((state) => state.pendingAction);
  const lastError = useRondaStore((state) => state.lastError);
  const canSubmit = view.me.availableActions.includes('submitFlag');
  const canFinish = view.me.availableActions.includes('finishFlags');
  const canAdvance = view.me.availableActions.includes('nextRound');

  return (
    <GameFrame
      title={`Banderas · ronda ${view.round}/${view.config.rounds}`}
      deadlineAt={view.phase === 'input' ? view.flags.deadlineAt : null}
      durationSeconds={view.config.answerTimeSeconds || 1}
      players={view.players}
      myPlayerId={view.me.playerId}
      submittedPlayerIds={view.flags.submittedPlayerIds}
    >
      <section className="flex w-full max-w-2xl flex-col gap-5">
        <div className="overflow-hidden rounded-3xl border border-linea bg-white/95 p-5 shadow-lg">
          <img
            src={view.flags.image}
            alt={view.flags.entityName ?? 'Bandera para identificar'}
            className="mx-auto block aspect-[3/2] w-full max-w-xl object-contain"
          />
        </div>
        {view.phase === 'input' ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {view.flags.options.map((option) => (
              <button
                key={option.id}
                type="button"
                disabled={!canSubmit || pendingAction}
                aria-pressed={view.me.selectedOptionId === option.id}
                onClick={() =>
                  void useRondaStore.getState().sendAction({
                    type: 'submitFlag',
                    optionId: option.id,
                  })
                }
                className={`min-h-16 rounded-2xl border px-4 text-left text-16 font-semibold transition-colors disabled:opacity-55 ${
                  view.me.selectedOptionId === option.id
                    ? 'border-oro bg-oro/15 text-oro'
                    : 'border-linea bg-mesa/80 text-hueso hover:border-oro/60'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        ) : (
          <BanderasReveal view={view} canAdvance={canAdvance} pending={pendingAction} />
        )}
        {canFinish ? (
          <Button
            variant="ghost"
            onClick={() => void useRondaStore.getState().sendAction({ type: 'finishFlags' })}
            loading={pendingAction}
          >
            Revelar ahora
          </Button>
        ) : null}
        {lastError ? <p className="text-center text-13 text-brasa">{lastError}</p> : null}
      </section>
    </GameFrame>
  );
}

function BanderasReveal({
  view,
  canAdvance,
  pending,
}: {
  view: BanderasPlayerView;
  canAdvance: boolean;
  pending: boolean;
}) {
  const correct = view.flags.correctOptionId;
  return (
    <section className="flex flex-col gap-4">
      <div className="rounded-3xl border border-oro/60 bg-oro/10 px-5 py-5 text-center">
        <p className="eyebrow">Respuesta</p>
        <p className="mt-1 font-display text-36 text-hueso">{view.flags.entityName ?? '—'}</p>
        <p className="mt-1 text-14 text-humo">{view.flags.explanation ?? 'Buen ojo.'}</p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {view.flags.options.map((option) => (
          <div
            key={option.id}
            className={`rounded-2xl border px-4 py-3 text-14 ${
              option.id === correct
                ? 'border-equipo-turquesa/70 bg-equipo-turquesa/10 text-hueso'
                : 'border-linea bg-mesa/70 text-humo'
            }`}
          >
            <span className="font-semibold">{option.label}</span>
            {view.flags.answers ? (
              <span className="ml-2 text-12 text-humo">
                {Object.values(view.flags.answers).filter((answer) => answer === option.id).length}{' '}
                votos
              </span>
            ) : null}
          </div>
        ))}
      </div>
      <RevealNextAction canAdvance={canAdvance} pending={pending} />
    </section>
  );
}

function CifrasScreen({ view }: { view: CifrasPlayerView }) {
  const pendingAction = useRondaStore((state) => state.pendingAction);
  const lastError = useRondaStore((state) => state.lastError);
  const [numberInput, setNumberInput] = useState('');
  const [order, setOrder] = useState<string[]>([]);
  const questionId = view.cifras.questionId;
  const canSubmit = view.me.availableActions.includes(
    view.cifras.kind === 'estimate' ? 'submitNumber' : 'submitOrder',
  );
  const canFinish = view.me.availableActions.includes('finishCifras');
  const canAdvance = view.me.availableActions.includes('nextRound');

  useEffect(() => {
    setNumberInput('');
    setOrder(view.me.selectedOrder);
  }, [questionId, view.me.selectedOrder]);

  function submitEstimate(event: FormEvent) {
    event.preventDefault();
    const value = Number(numberInput.replace(',', '.'));
    if (!Number.isFinite(value) || value < 0 || !canSubmit) return;
    void useRondaStore.getState().sendAction({ type: 'submitNumber', value });
  }

  function submitOrder() {
    if (!canSubmit || order.length !== view.cifras.items.length) return;
    void useRondaStore.getState().sendAction({ type: 'submitOrder', order });
  }

  return (
    <GameFrame
      title={`Cifras · ronda ${view.round}/${view.config.rounds}`}
      deadlineAt={view.phase === 'input' ? view.cifras.deadlineAt : null}
      durationSeconds={view.config.answerTimeSeconds || 1}
      players={view.players}
      myPlayerId={view.me.playerId}
      submittedPlayerIds={view.cifras.submittedPlayerIds}
    >
      <section className="flex w-full max-w-2xl flex-col gap-5">
        <div className="surface-panel flex flex-col gap-2 p-5 text-center">
          <p className="eyebrow">{view.cifras.kind === 'estimate' ? 'Estima' : 'Ordena'}</p>
          <h1 className="font-display text-32 leading-tight text-hueso">{view.cifras.prompt}</h1>
          <p className="text-14 text-humo">{view.cifras.definition}</p>
          <p className="font-mono text-16 text-oro">{view.cifras.unit}</p>
        </div>
        {view.phase === 'input' && view.cifras.kind === 'estimate' ? (
          <form className="flex flex-col gap-3" onSubmit={submitEstimate}>
            <input
              type="number"
              min="0"
              step="any"
              inputMode="decimal"
              value={numberInput}
              onChange={(event) => setNumberInput(event.target.value)}
              className="form-control h-16 px-5 text-center font-mono text-28"
              placeholder="Escribe una cifra"
              disabled={!canSubmit || pendingAction}
              autoFocus
            />
            <Button type="submit" loading={pendingAction} disabled={!numberInput.trim() || !canSubmit}>
              Bloquear mi estimación
            </Button>
          </form>
        ) : null}
        {view.phase === 'input' && view.cifras.kind === 'order' ? (
          <OrderPicker
            items={view.cifras.items}
            order={order}
            setOrder={setOrder}
            disabled={!canSubmit || pendingAction}
            onSubmit={submitOrder}
          />
        ) : null}
        {view.phase === 'reveal' ? (
          <CifrasReveal view={view} canAdvance={canAdvance} pending={pendingAction} />
        ) : null}
        {canFinish ? (
          <Button
            variant="ghost"
            onClick={() => void useRondaStore.getState().sendAction({ type: 'finishCifras' })}
            loading={pendingAction}
          >
            Revelar ahora
          </Button>
        ) : null}
        {lastError ? <p className="text-center text-13 text-brasa">{lastError}</p> : null}
      </section>
    </GameFrame>
  );
}

function OrderPicker({
  items,
  order,
  setOrder,
  disabled,
  onSubmit,
}: {
  items: CifrasPlayerView['cifras']['items'];
  order: string[];
  setOrder: (value: string[]) => void;
  disabled: boolean;
  onSubmit: () => void;
}) {
  const byId = new Map(items.map((item) => [item.id, item.label]));
  const remaining = items.filter((item) => !order.includes(item.id));
  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-2xl border border-linea bg-mesa/70 p-3">
        <p className="mb-2 text-12 uppercase tracking-wider text-humo">Tu orden</p>
        <div className="flex flex-col gap-2">
          {order.length === 0 ? <p className="px-2 py-3 text-14 text-humo">Toca las tarjetas de abajo.</p> : null}
          {order.map((id, index) => (
            <button
              key={id}
              type="button"
              disabled={disabled}
              onClick={() => setOrder(order.filter((item) => item !== id))}
              className="flex items-center gap-3 rounded-xl border border-oro/50 bg-oro/10 px-3 py-3 text-left text-14 text-hueso"
            >
              <span className="font-mono text-oro">{index + 1}</span>
              <span>{byId.get(id) ?? id}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {remaining.map((item) => (
          <button
            key={item.id}
            type="button"
            disabled={disabled}
            onClick={() => setOrder([...order, item.id])}
            className="min-h-14 rounded-2xl border border-linea bg-mesa/80 px-4 text-left text-14 font-semibold text-hueso hover:border-oro/60 disabled:opacity-50"
          >
            {item.label}
          </button>
        ))}
      </div>
      <Button onClick={onSubmit} disabled={disabled || order.length !== items.length}>
        Bloquear este orden
      </Button>
    </div>
  );
}

function CifrasReveal({
  view,
  canAdvance,
  pending,
}: {
  view: CifrasPlayerView;
  canAdvance: boolean;
  pending: boolean;
}) {
  if (view.cifras.kind === 'estimate') {
    return (
      <section className="flex flex-col gap-4">
        <div className="rounded-3xl border border-oro/60 bg-oro/10 px-5 py-5 text-center">
          <p className="eyebrow">Dato de referencia</p>
          <p className="mt-1 font-display text-40 text-oro">
            {formatNumber(view.cifras.referenceValue)} {view.cifras.unit}
          </p>
          <p className="mt-1 text-13 text-humo">
            {view.cifras.source ?? 'Referencia editorial'} · {view.cifras.updatedAt ?? 'actualizado'}
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {view.players.map((player) => {
            const result = view.cifras.estimates?.[player.playerId];
            return (
              <div key={player.playerId} className="rounded-2xl border border-linea bg-mesa/75 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="truncate text-14 font-semibold text-hueso">{player.nick}</span>
                  <span className="font-mono text-20 text-oro">+{result?.points ?? 0}</span>
                </div>
                <p className="mt-1 text-12 text-humo">
                  {result?.value === null || result?.value === undefined
                    ? 'Sin respuesta'
                    : `${formatNumber(result.value)} · error ${formatPercent(result.errorPercent)}`}
                </p>
              </div>
            );
          })}
        </div>
        <RevealNextAction canAdvance={canAdvance} pending={pending} />
      </section>
    );
  }

  const values = view.cifras.itemValues;
  const correctOrder = view.cifras.orders?.[view.players[0]?.playerId ?? '']?.correctOrder ?? [];
  return (
    <section className="flex flex-col gap-4">
      <div className="rounded-3xl border border-oro/60 bg-oro/10 px-5 py-5 text-center">
        <p className="eyebrow">Orden correcto</p>
        <p className="mt-2 text-16 font-semibold text-hueso">
          {correctOrder.map((id) => view.cifras.items.find((item) => item.id === id)?.label ?? id).join(' → ')}
        </p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {view.cifras.items.map((item) => (
          <div key={item.id} className="rounded-2xl border border-linea bg-mesa/75 px-4 py-3 text-left">
            <p className="text-14 font-semibold text-hueso">{item.label}</p>
            <p className="font-mono text-14 text-oro">{formatNumber(values?.[item.id])} {view.cifras.unit}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {view.players.map((player) => {
          const result = view.cifras.orders?.[player.playerId];
          return (
            <div key={player.playerId} className="rounded-2xl border border-linea bg-mesa/75 px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <span className="truncate text-14 font-semibold text-hueso">{player.nick}</span>
                <span className="font-mono text-20 text-oro">+{result?.points ?? 0}</span>
              </div>
              <p className="mt-1 text-12 text-humo">
                {result ? `${result.correctPositions}/${view.cifras.items.length} posiciones correctas` : 'Sin respuesta'}
              </p>
            </div>
          );
        })}
      </div>
      <RevealNextAction canAdvance={canAdvance} pending={pending} />
    </section>
  );
}

function QuienLoHariaScreen({ view }: { view: QuienLoHariaPlayerView }) {
  const pendingAction = useRondaStore((state) => state.pendingAction);
  const lastError = useRondaStore((state) => state.lastError);
  const canSubmit = view.me.availableActions.includes('submitWhoVote');
  const canFinish = view.me.availableActions.includes('finishWho');
  const canAdvance = view.me.availableActions.includes('nextRound');
  return (
    <GameFrame
      title={`Quién lo haría · ronda ${view.round}/${view.config.rounds}`}
      deadlineAt={view.phase === 'input' ? view.who.deadlineAt : null}
      durationSeconds={view.config.answerTimeSeconds || 1}
      players={view.players}
      myPlayerId={view.me.playerId}
      submittedPlayerIds={view.who.submittedPlayerIds}
    >
      <section className="flex w-full max-w-2xl flex-col gap-5">
        <div className="surface-panel px-5 py-7 text-center">
          <p className="eyebrow">Pregunta para la mesa</p>
          <h1 className="mt-2 font-display text-32 leading-tight text-hueso">{view.who.prompt}</h1>
        </div>
        {view.phase === 'input' ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {view.players
              .filter((player) => view.who.allowSelfVote || player.playerId !== view.me.playerId)
              .map((player) => (
                <button
                  key={player.playerId}
                  type="button"
                  disabled={!canSubmit || pendingAction}
                  aria-pressed={view.me.selectedPlayerId === player.playerId}
                  onClick={() =>
                    void useRondaStore.getState().sendAction({
                      type: 'submitWhoVote',
                      targetPlayerId: player.playerId,
                    })
                  }
                  className={`min-h-16 rounded-2xl border px-4 text-left text-16 font-semibold disabled:opacity-50 ${
                    view.me.selectedPlayerId === player.playerId
                      ? 'border-oro bg-oro/15 text-oro'
                      : 'border-linea bg-mesa/80 text-hueso hover:border-oro/60'
                  }`}
                >
                  {player.nick}
                </button>
              ))}
          </div>
        ) : (
          <WhoReveal view={view} canAdvance={canAdvance} pending={pendingAction} />
        )}
        {canFinish ? (
          <Button
            variant="ghost"
            onClick={() => void useRondaStore.getState().sendAction({ type: 'finishWho' })}
            loading={pendingAction}
          >
            Revelar ahora
          </Button>
        ) : null}
        {lastError ? <p className="text-center text-13 text-brasa">{lastError}</p> : null}
      </section>
    </GameFrame>
  );
}

function WhoReveal({
  view,
  canAdvance,
  pending,
}: {
  view: QuienLoHariaPlayerView;
  canAdvance: boolean;
  pending: boolean;
}) {
  return (
    <section className="flex flex-col gap-4">
      {view.who.resultsVisible ? (
        <div className="grid gap-2 sm:grid-cols-2">
          {view.players.map((player) => (
            <div key={player.playerId} className="flex items-center justify-between rounded-2xl border border-linea bg-mesa/75 px-4 py-3">
              <span className="truncate text-14 font-semibold text-hueso">{player.nick}</span>
              <span className="font-mono text-22 text-oro">{view.who.voteCounts?.[player.playerId] ?? 0}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-oro/50 bg-oro/10 px-4 py-4 text-center text-14 text-hueso">
          Los votos quedan guardados hasta la clasificación final.
        </div>
      )}
      <RevealNextAction canAdvance={canAdvance} pending={pending} />
    </section>
  );
}

function CompletaLaFraseScreen({ view }: { view: CompletaLaFrasePlayerView }) {
  const pendingAction = useRondaStore((state) => state.pendingAction);
  const lastError = useRondaStore((state) => state.lastError);
  const [answer, setAnswer] = useState('');
  const canSubmit = view.me.availableActions.includes('submitSentence');
  const canHint = view.me.availableActions.includes('useSentenceHint');
  const canFinish = view.me.availableActions.includes('finishSentence');
  const canAdvance = view.me.availableActions.includes('nextRound');

  useEffect(() => setAnswer(''), [view.sentence.questionId]);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!answer.trim() || !canSubmit) return;
    void useRondaStore.getState().sendAction({ type: 'submitSentence', answer: answer.trim() });
  }

  return (
    <GameFrame
      title={`Completa la frase · ronda ${view.round}/${view.config.rounds}`}
      deadlineAt={view.phase === 'input' ? view.sentence.deadlineAt : null}
      durationSeconds={view.config.answerTimeSeconds || 1}
      players={view.players}
      myPlayerId={view.me.playerId}
      submittedPlayerIds={view.sentence.submittedPlayerIds}
    >
      <section className="flex w-full max-w-2xl flex-col gap-5">
        <div className="surface-panel px-5 py-7 text-center">
          <p className="eyebrow">{view.sentence.category}</p>
          <h1 className="mt-2 font-display text-32 leading-tight text-hueso">{view.sentence.prompt}</h1>
        </div>
        {view.phase === 'input' ? (
          <form className="flex flex-col gap-3" onSubmit={submit}>
            <input
              type="text"
              maxLength={120}
              value={answer}
              onChange={(event) => setAnswer(event.target.value)}
              className="form-control h-16 px-5 text-center text-20"
              placeholder="Completa la frase…"
              disabled={!canSubmit || pendingAction}
              autoFocus
            />
            <Button type="submit" loading={pendingAction} disabled={!answer.trim() || !canSubmit}>
              Bloquear respuesta
            </Button>
            {canHint ? (
              <Button
                type="button"
                variant="ghost"
                onClick={() => void useRondaStore.getState().sendAction({ type: 'useSentenceHint' })}
                loading={pendingAction}
              >
                Necesito una pista
              </Button>
            ) : null}
            {view.sentence.hint ? (
              <p className="rounded-2xl border border-oro/50 bg-oro/10 px-4 py-3 text-center text-14 text-hueso">
                Pista: {view.sentence.hint}
              </p>
            ) : null}
          </form>
        ) : (
          <SentenceReveal view={view} canAdvance={canAdvance} pending={pendingAction} />
        )}
        {canFinish ? (
          <Button
            variant="ghost"
            onClick={() => void useRondaStore.getState().sendAction({ type: 'finishSentence' })}
            loading={pendingAction}
          >
            Revelar ahora
          </Button>
        ) : null}
        {lastError ? <p className="text-center text-13 text-brasa">{lastError}</p> : null}
      </section>
    </GameFrame>
  );
}

function SentenceReveal({
  view,
  canAdvance,
  pending,
}: {
  view: CompletaLaFrasePlayerView;
  canAdvance: boolean;
  pending: boolean;
}) {
  return (
    <section className="flex flex-col gap-4">
      <div className="rounded-3xl border border-oro/60 bg-oro/10 px-5 py-5 text-center">
        <p className="eyebrow">Respuesta esperada</p>
        <p className="mt-1 font-display text-36 text-hueso">{view.sentence.canonicalAnswer ?? '—'}</p>
        {view.sentence.hint ? <p className="mt-1 text-13 text-humo">Pista: {view.sentence.hint}</p> : null}
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {view.players.map((player) => {
          const result = view.sentence.answers?.[player.playerId];
          return (
            <div key={player.playerId} className="rounded-2xl border border-linea bg-mesa/75 px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <span className="truncate text-14 font-semibold text-hueso">{player.nick}</span>
                <span className="font-mono text-20 text-oro">+{result?.points ?? 0}</span>
              </div>
              <p className="mt-1 text-12 text-humo">
                {result?.answer ?? 'Sin respuesta'}{result?.hintUsed ? ' · con pista' : ''}
              </p>
            </div>
          );
        })}
      </div>
      <RevealNextAction canAdvance={canAdvance} pending={pending} />
    </section>
  );
}

function RevealNextAction({ canAdvance, pending }: { canAdvance: boolean; pending: boolean }) {
  return canAdvance ? (
    <Button onClick={() => void useRondaStore.getState().sendAction({ type: 'nextRound' })} loading={pending}>
      Siguiente ronda
    </Button>
  ) : (
    <p className="text-center text-14 text-humo">El anfitrión prepara la siguiente ronda.</p>
  );
}

function GameFrame({
  title,
  deadlineAt,
  durationSeconds,
  players,
  myPlayerId,
  submittedPlayerIds,
  children,
}: {
  title: string;
  deadlineAt: number | null;
  durationSeconds: number;
  players: RoadmapPlayerView['players'];
  myPlayerId: string;
  submittedPlayerIds: string[];
  children: React.ReactNode;
}) {
  return (
    <div className="game-shell flex min-h-0 flex-1 flex-col overflow-hidden">
      <ColorCountdownHeader
        left={title}
        deadlineAt={deadlineAt}
        durationSeconds={durationSeconds}
      />
      <PlayerStrip
        players={players}
        turnPlayerId={null}
        myPlayerId={myPlayerId}
        renderInfo={(player) =>
          `${player.score} puntos · ${submittedPlayerIds.includes(player.playerId) ? 'listo' : 'pensando'}`
        }
      />
      <main className="flex min-h-0 flex-1 flex-col items-center gap-5 overflow-y-auto px-4 py-5">
        {children}
      </main>
    </div>
  );
}

function formatNumber(value: number | null | undefined): string {
  return value === null || value === undefined
    ? '—'
    : value.toLocaleString('es-ES', { maximumFractionDigits: 2 });
}

function formatPercent(value: number | null | undefined): string {
  return value === null || value === undefined
    ? '—'
    : `${value.toLocaleString('es-ES', { maximumFractionDigits: 1 })} %`;
}
