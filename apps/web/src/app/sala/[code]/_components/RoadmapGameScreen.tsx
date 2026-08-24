'use client';

import {
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type FormEvent,
  type SetStateAction,
} from 'react';
import type {
  BanderasPlayerView,
  CifrasPlayerView,
  CompletaLaFrasePlayerView,
  GameAction,
  QuienLoHariaPlayerView,
  RoadmapPlayerView,
} from '@ronda/protocol';
import { BANDERAS_PRESSURE_SECONDS } from '@ronda/protocol';
import { useRondaStore } from '@/lib/store';
import { Button } from '@/components/ui/Button';
import { PlayerStrip } from './PlayerStrip';
import { ColorCountdownHeader } from './ColorCountdownHeader';

export interface RoadmapGameScreenProps {
  view: RoadmapPlayerView;
  onAction?: (action: GameAction) => void;
  embedded?: boolean;
}

type RoadmapActionSender = (action: GameAction) => void;

function sendRoadmapAction(onAction: RoadmapActionSender | undefined, action: GameAction): void {
  if (onAction) {
    onAction(action);
    return;
  }
  void useRondaStore.getState().sendAction(action);
}

export function RoadmapGameScreen({ view, onAction }: RoadmapGameScreenProps) {
  if (view.gameId === 'banderas') return <BanderasScreen view={view} onAction={onAction} />;
  if (view.gameId === 'cifras') return <CifrasScreen view={view} onAction={onAction} />;
  if (view.gameId === 'quienloharia') return <QuienLoHariaScreen view={view} onAction={onAction} />;
  return <CompletaLaFraseScreen view={view} onAction={onAction} />;
}

function BanderasScreen({ view, onAction }: { view: BanderasPlayerView; onAction?: RoadmapActionSender }) {
  const pendingAction = useRondaStore((state) => state.pendingAction);
  const lastError = useRondaStore((state) => state.lastError);
  const canSubmit = view.me.availableActions.includes('submitFlag');
  const canFinish = view.me.availableActions.includes('finishFlags');
  const canAdvance = view.me.availableActions.includes('nextRound');
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const pressureActive = view.flags.submittedPlayerIds.length > 0;
  const timerSeconds = pressureActive
    ? BANDERAS_PRESSURE_SECONDS
    : view.config.answerTimeSeconds || 1;

  useEffect(() => {
    setSelectedOptionId(view.me.submitted ? view.me.selectedOptionId : null);
  }, [view.flags.questionId, view.me.submitted, view.me.selectedOptionId]);

  function confirmAnswer() {
    if (!selectedOptionId || !canSubmit || pendingAction) return;
    sendRoadmapAction(onAction, {
      type: 'submitFlag',
      optionId: selectedOptionId,
    });
  }

  return (
    <GameFrame
      title={`Banderas · ronda ${view.round}/${view.config.rounds}`}
      deadlineAt={view.phase === 'input' ? view.flags.deadlineAt : null}
      durationSeconds={timerSeconds}
      timerVariant={pressureActive ? 'countdown' : 'default'}
      players={view.players}
      myPlayerId={view.me.playerId}
      submittedPlayerIds={view.flags.submittedPlayerIds}
      mainClassName="w-full gap-3 overflow-hidden px-3 py-3 sm:gap-4 sm:px-4 sm:py-4"
    >
      <section className="flex w-full max-w-xl flex-col gap-3">
        <div className="overflow-hidden rounded-3xl border border-linea bg-white/95 p-3 shadow-lg sm:p-4">
          <img
            src={view.flags.image}
            alt={view.flags.entityName ?? 'Bandera para identificar'}
            className="mx-auto block h-[clamp(8.5rem,27vh,14rem)] w-full object-contain"
          />
        </div>
        {view.phase === 'input' ? (
          <div className="flex flex-col gap-2">
            <div className="grid grid-cols-2 gap-2">
              {view.flags.options.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  disabled={!canSubmit || pendingAction}
                  aria-pressed={selectedOptionId === option.id}
                  onClick={() => setSelectedOptionId(option.id)}
                  className={`min-h-12 rounded-2xl border px-3 py-2 text-center text-14 font-semibold leading-tight transition-colors disabled:opacity-55 sm:min-h-14 sm:px-4 sm:text-15 ${
                    selectedOptionId === option.id
                      ? 'border-oro bg-oro/15 text-oro ring-2 ring-oro/20'
                      : 'border-linea bg-mesa/80 text-hueso hover:border-oro/60'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            {!view.me.submitted ? (
              <button
                type="button"
                disabled={!selectedOptionId || !canSubmit || pendingAction}
                onClick={confirmAnswer}
                className="mx-auto min-h-11 rounded-2xl border border-oro bg-oro px-5 py-2 text-14 font-bold text-white shadow-md transition-[transform,filter,opacity] active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-45"
              >
                ✓ OK, bloquear respuesta
              </button>
            ) : (
              <p className="text-center text-13 font-semibold text-equipo-turquesa">
                ✓ Respuesta bloqueada
              </p>
            )}
            {pressureActive && !view.me.submitted ? (
              <p className="text-center text-12 text-brasa" aria-live="polite">
                ¡Alguien se ha adelantado! Elige y confirma.
              </p>
            ) : null}
          </div>
        ) : (
          <BanderasReveal view={view} canAdvance={canAdvance} pending={pendingAction} onAction={onAction} />
        )}
        {canFinish ? (
          <Button
            variant="ghost"
            onClick={() => sendRoadmapAction(onAction, { type: 'finishFlags' })}
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
  onAction,
}: {
  view: BanderasPlayerView;
  canAdvance: boolean;
  pending: boolean;
  onAction?: RoadmapActionSender;
}) {
  const correct = view.flags.correctOptionId;
  const myAnswer = view.me.selectedOptionId;
  return (
    <section className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2">
        {view.flags.options.map((option) => {
          const isCorrect = option.id === correct;
          const isMyWrongAnswer = option.id === myAnswer && !isCorrect;
          const optionStyle = isCorrect
            ? 'border-equipo-turquesa bg-equipo-turquesa/15 text-hueso ring-2 ring-equipo-turquesa/20'
            : isMyWrongAnswer
              ? 'border-brasa bg-brasa/15 text-hueso ring-2 ring-brasa/20'
              : 'border-linea bg-mesa/70 text-humo';
          return (
            <div key={option.id} className={`rounded-2xl border px-3 py-2 text-13 ${optionStyle}`}>
              <span className="font-semibold">{option.label}</span>
              {view.flags.answers ? (
                <span className="ml-2 text-12 text-humo">
                  {
                    Object.values(view.flags.answers).filter((answer) => answer === option.id)
                      .length
                  }{' '}
                  votos
                </span>
              ) : null}
            </div>
          );
        })}
      </div>
      <RevealNextAction canAdvance={canAdvance} pending={pending} onAction={onAction} />
    </section>
  );
}

function CifrasScreen({ view, onAction }: { view: CifrasPlayerView; onAction?: RoadmapActionSender }) {
  const pendingAction = useRondaStore((state) => state.pendingAction);
  const lastError = useRondaStore((state) => state.lastError);
  const [numberInput, setNumberInput] = useState('');
  const [order, setOrder] = useState<string[]>([]);
  const [choiceId, setChoiceId] = useState<string | null>(null);
  const questionId = view.cifras.questionId;
  const canSubmit =
    view.cifras.kind === 'estimate'
      ? view.me.availableActions.includes('submitNumber')
      : view.cifras.kind === 'order'
        ? view.me.availableActions.includes('submitOrder')
        : view.me.availableActions.includes('submitChoice');
  const canFinish = view.me.availableActions.includes('finishCifras');
  const canAdvance = view.me.availableActions.includes('nextRound');

  useEffect(() => {
    setNumberInput('');
    setOrder(
      view.me.selectedOrder.length > 0
        ? view.me.selectedOrder
        : initialOrderFor(view.cifras.items, questionId),
    );
    setChoiceId(view.me.selectedChoiceId);
  }, [questionId, view.me.selectedChoiceId, view.me.selectedOrder, view.cifras.items]);

  function submitEstimate(event: FormEvent) {
    event.preventDefault();
    const value = Number(numberInput.replace(',', '.'));
    if (!Number.isFinite(value) || value < 0 || !canSubmit) return;
    sendRoadmapAction(onAction, { type: 'submitNumber', value });
  }

  function submitOrder() {
    if (!canSubmit || order.length !== view.cifras.items.length) return;
    sendRoadmapAction(onAction, { type: 'submitOrder', order });
  }

  function submitChoice(optionId: string) {
    if (!canSubmit || pendingAction) return;
    setChoiceId(optionId);
    sendRoadmapAction(onAction, { type: 'submitChoice', optionId });
  }

  return (
    <GameFrame
      title={`Cifras · ronda ${view.round}/${view.config.rounds}`}
      deadlineAt={view.phase === 'input' ? view.cifras.deadlineAt : null}
      durationSeconds={view.config.answerTimeSeconds || 1}
      players={view.players}
      myPlayerId={view.me.playerId}
      submittedPlayerIds={view.cifras.submittedPlayerIds}
      mainClassName={
        view.cifras.kind === 'order'
          ? 'w-full gap-2 overflow-hidden px-3 py-2 sm:gap-3 sm:px-4 sm:py-3'
          : 'gap-5 overflow-y-auto px-4 py-5'
      }
    >
      <section
        className={`flex w-full max-w-2xl min-h-0 flex-col ${view.cifras.kind === 'order' ? 'gap-2' : 'gap-5'}`}
      >
        <div
          className={`surface-panel flex shrink-0 flex-col gap-1.5 p-4 text-center sm:p-5 ${view.cifras.kind === 'order' ? 'gap-1.5' : 'gap-2'}`}
        >
          <p className="eyebrow">
            {view.cifras.kind === 'estimate'
              ? 'Estima'
              : view.cifras.kind === 'order'
                ? 'Ordena'
                : 'Elige una'}
          </p>
          <h1 className="font-display text-[clamp(1.35rem,4.8vw,2rem)] font-normal leading-tight text-hueso">
            {view.cifras.prompt}
          </h1>
          {view.cifras.kind === 'order' ? (
            <OrderDirectionBadge direction={view.cifras.direction ?? 'asc'} />
          ) : null}
          <p className="text-13 text-humo sm:text-14">{view.cifras.definition}</p>
          <p className="font-mono text-14 text-oro sm:text-16">{view.cifras.unit}</p>
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
            <Button
              type="submit"
              loading={pendingAction}
              disabled={!numberInput.trim() || !canSubmit}
            >
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
        {view.phase === 'input' && view.cifras.kind === 'compare' ? (
          <ChoicePicker
            items={view.cifras.items}
            selectedOptionId={choiceId}
            disabled={!canSubmit || pendingAction}
            onSelect={submitChoice}
          />
        ) : null}
        {view.phase === 'reveal' ? (
          <CifrasReveal view={view} canAdvance={canAdvance} pending={pendingAction} onAction={onAction} />
        ) : null}
        {canFinish ? (
          <Button
            variant="ghost"
            onClick={() => sendRoadmapAction(onAction, { type: 'finishCifras' })}
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
  setOrder: Dispatch<SetStateAction<string[]>>;
  disabled: boolean;
  onSubmit: () => void;
}) {
  const byId = new Map(items.map((item) => [item.id, item.label]));
  const listRef = useRef<HTMLDivElement>(null);
  const orderRef = useRef(order);
  const draggingIdRef = useRef<string | null>(null);
  const lastTargetRef = useRef<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  useEffect(() => {
    orderRef.current = order;
  }, [order]);

  function moveItem(itemId: string, targetId: string, after: boolean) {
    if (itemId === targetId) return;
    setOrder((current) => reorderAround(current, itemId, targetId, after));
  }

  function moveBy(itemId: string, offset: -1 | 1) {
    setOrder((current) => {
      const index = current.indexOf(itemId);
      const targetIndex = index + offset;
      if (index < 0 || targetIndex < 0 || targetIndex >= current.length) return current;
      const next = [...current];
      const currentItem = next[index];
      const targetItem = next[targetIndex];
      if (currentItem === undefined || targetItem === undefined) return current;
      next[index] = targetItem;
      next[targetIndex] = currentItem;
      return next;
    });
  }

  function stopDragging() {
    draggingIdRef.current = null;
    lastTargetRef.current = null;
    setDraggingId(null);
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const itemId = draggingIdRef.current;
    if (!itemId || disabled) return;
    const target = document
      .elementFromPoint(event.clientX, event.clientY)
      ?.closest<HTMLElement>('[data-order-card]');
    const targetId = target?.dataset.orderCard;
    if (!targetId || targetId === itemId || targetId === lastTargetRef.current) return;
    const rect = target.getBoundingClientRect();
    lastTargetRef.current = targetId;
    moveItem(itemId, targetId, event.clientY > rect.top + rect.height / 2);
  }

  return (
    <div className="order-picker flex min-h-0 flex-1 flex-col gap-2">
      <div className="flex shrink-0 items-center justify-between gap-3 px-1 text-11 text-humo sm:text-12">
        <span className="font-semibold uppercase tracking-[0.14em] text-oro">Tu orden</span>
        <span>Arrastra · desliza · usa ↑ ↓</span>
      </div>
      <div
        ref={listRef}
        className="order-picker__list flex min-h-0 flex-1 flex-col gap-1.5"
        role="list"
        aria-label="Tarjetas para ordenar"
      >
        {order.map((id, index) => (
          <div
            key={id}
            data-order-card={id}
            role="listitem"
            tabIndex={disabled ? -1 : 0}
            draggable={!disabled}
            aria-roledescription="tarjeta reordenable"
            aria-label={`${byId.get(id) ?? id}. Posición ${index + 1} de ${order.length}. Usa las flechas o arrastra para moverla.`}
            className={`order-card flex min-h-0 flex-1 items-center gap-2 rounded-2xl border px-2.5 py-1.5 text-left transition-[transform,box-shadow,border-color,background-color] sm:gap-3 sm:px-3 ${draggingId === id ? 'order-card--dragging' : ''}`}
            onDragStart={(event) => {
              draggingIdRef.current = id;
              setDraggingId(id);
              event.dataTransfer.effectAllowed = 'move';
              event.dataTransfer.setData('text/plain', id);
            }}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              const sourceId = event.dataTransfer.getData('text/plain') || draggingIdRef.current;
              const target = event.currentTarget.getBoundingClientRect();
              if (sourceId) moveItem(sourceId, id, event.clientY > target.top + target.height / 2);
              stopDragging();
            }}
            onDragEnd={stopDragging}
            onPointerDown={(event) => {
              if (disabled || event.pointerType === 'mouse') return;
              event.currentTarget.setPointerCapture(event.pointerId);
              draggingIdRef.current = id;
              setDraggingId(id);
              event.preventDefault();
            }}
            onPointerMove={handlePointerMove}
            onPointerUp={stopDragging}
            onPointerCancel={stopDragging}
            onKeyDown={(event) => {
              if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
                event.preventDefault();
                moveBy(id, event.key === 'ArrowUp' ? -1 : 1);
              }
            }}
          >
            <span className="order-card__rank flex h-7 w-7 shrink-0 items-center justify-center rounded-lg font-mono text-13 font-bold sm:h-8 sm:w-8 sm:text-14">
              {index + 1}
            </span>
            <span className="min-w-0 flex-1 truncate text-13 font-semibold text-hueso sm:text-14">
              {byId.get(id) ?? id}
            </span>
            <span className="order-card__grip shrink-0 text-17 leading-none" aria-hidden="true">
              ⠿
            </span>
            <span className="flex shrink-0 gap-1">
              <button
                type="button"
                className="order-card__move"
                disabled={disabled || index === 0}
                aria-label={`Subir ${byId.get(id) ?? id}`}
                onPointerDown={(event) => event.stopPropagation()}
                onClick={() => moveBy(id, -1)}
              >
                ↑
              </button>
              <button
                type="button"
                className="order-card__move"
                disabled={disabled || index === order.length - 1}
                aria-label={`Bajar ${byId.get(id) ?? id}`}
                onPointerDown={(event) => event.stopPropagation()}
                onClick={() => moveBy(id, 1)}
              >
                ↓
              </button>
            </span>
          </div>
        ))}
      </div>
      <Button
        className="shrink-0"
        onClick={onSubmit}
        disabled={disabled || order.length !== items.length}
      >
        Bloquear este orden
      </Button>
    </div>
  );
}

function ChoicePicker({
  items,
  selectedOptionId,
  disabled,
  onSelect,
}: {
  items: CifrasPlayerView['cifras']['items'];
  selectedOptionId: string | null;
  disabled: boolean;
  onSelect: (optionId: string) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-center text-12 text-humo">Toca una tarjeta para bloquear tu respuesta.</p>
      <div className="grid grid-cols-2 gap-3">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            disabled={disabled}
            aria-pressed={selectedOptionId === item.id}
            onClick={() => onSelect(item.id)}
            className={`flex min-h-28 flex-col items-center justify-center rounded-3xl border px-3 py-4 text-center text-16 font-semibold transition-[transform,background-color,border-color,box-shadow] active:scale-[0.985] disabled:opacity-55 sm:min-h-32 sm:text-18 ${selectedOptionId === item.id ? 'border-oro bg-oro/15 text-oro shadow-[0_0_0_3px_rgb(241_183_74_/_0.18)]' : 'border-linea bg-mesa/80 text-hueso hover:border-oro/60'}`}
          >
            {item.label}
          </button>
        ))}
      </div>
      {selectedOptionId ? (
        <p className="text-center text-13 font-semibold text-equipo-turquesa">✓ Respuesta bloqueada</p>
      ) : null}
    </div>
  );
}

function OrderDirectionBadge({ direction }: { direction: 'asc' | 'desc' }) {
  const ascending = direction === 'asc';
  return (
    <div className="order-direction mx-auto inline-flex items-center gap-2 rounded-2xl px-3 py-1.5 text-left">
      <span className="order-direction__icon flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-20 font-bold" aria-hidden="true">
        {ascending ? '↑' : '↓'}
      </span>
      <span className="text-12 leading-tight text-humo sm:text-13">
        de <strong className="font-extrabold text-oro">{ascending ? 'MENOR A MAYOR' : 'MAYOR A MENOR'}</strong>
      </span>
    </div>
  );
}

function initialOrderFor(items: CifrasPlayerView['cifras']['items'], seed: string): string[] {
  const next = items.map((item) => item.id);
  let hash = 0;
  for (const character of seed) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  for (let index = next.length - 1; index > 0; index -= 1) {
    hash = (hash * 1664525 + 1013904223) >>> 0;
    const target = hash % (index + 1);
    const currentItem = next[index];
    const targetItem = next[target];
    if (currentItem === undefined || targetItem === undefined) continue;
    next[index] = targetItem;
    next[target] = currentItem;
  }
  return next;
}

function reorderAround(order: string[], itemId: string, targetId: string, after: boolean): string[] {
  const next = order.filter((id) => id !== itemId);
  const targetIndex = next.indexOf(targetId);
  if (targetIndex < 0) return order;
  next.splice(targetIndex + (after ? 1 : 0), 0, itemId);
  return next;
}

function CifrasReveal({
  view,
  canAdvance,
  pending,
  onAction,
}: {
  view: CifrasPlayerView;
  canAdvance: boolean;
  pending: boolean;
  onAction?: RoadmapActionSender;
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
            {view.cifras.source ?? 'Referencia editorial'} ·{' '}
            {view.cifras.updatedAt ?? 'actualizado'}
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {view.players.map((player) => {
            const result = view.cifras.estimates?.[player.playerId];
            return (
              <div
                key={player.playerId}
                className="rounded-2xl border border-linea bg-mesa/75 px-4 py-3"
              >
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
        <RevealNextAction canAdvance={canAdvance} pending={pending} onAction={onAction} />
      </section>
    );
  }

  if (view.cifras.kind === 'compare') {
    const result = view.cifras.choices?.[view.me.playerId] ?? Object.values(view.cifras.choices ?? {})[0];
    const correctOptionId = result?.correctOptionId;
    const correctLabel = view.cifras.items.find((item) => item.id === correctOptionId)?.label ?? '—';
    return (
      <section className="flex flex-col gap-4">
        <div className="rounded-3xl border border-oro/60 bg-oro/10 px-5 py-4 text-center">
          <p className="eyebrow">La respuesta era</p>
          <p className="mt-1 font-display text-28 text-oro">{correctLabel}</p>
          <p className="mt-1 text-13 text-humo">Cada acierto suma 1 punto.</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {view.cifras.items.map((item) => (
            <div
              key={item.id}
              className={`rounded-2xl border px-3 py-3 text-center ${item.id === correctOptionId ? 'border-equipo-turquesa bg-equipo-turquesa/15' : 'border-linea bg-mesa/75'}`}
            >
              <p className="text-13 font-semibold text-hueso">{item.label}</p>
              <p className="mt-1 font-mono text-13 text-oro">
                {formatNumber(view.cifras.itemValues?.[item.id])} {view.cifras.unit}
              </p>
            </div>
          ))}
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {view.players.map((player) => {
            const playerResult = view.cifras.choices?.[player.playerId];
            const selectedLabel = view.cifras.items.find(
              (item) => item.id === playerResult?.selectedOptionId,
            )?.label;
            return (
              <div
                key={player.playerId}
                className="rounded-2xl border border-linea bg-mesa/75 px-4 py-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="truncate text-14 font-semibold text-hueso">{player.nick}</span>
                  <span className="font-mono text-20 text-oro">+{playerResult?.points ?? 0}</span>
                </div>
                <p className="mt-1 text-12 text-humo">
                  {selectedLabel ? `Eligió ${selectedLabel}` : 'Sin respuesta'}
                </p>
              </div>
            );
          })}
        </div>
        <RevealNextAction canAdvance={canAdvance} pending={pending} onAction={onAction} />
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
          {correctOrder
            .map((id) => view.cifras.items.find((item) => item.id === id)?.label ?? id)
            .join(' → ')}
        </p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {view.cifras.items.map((item) => (
          <div
            key={item.id}
            className="rounded-2xl border border-linea bg-mesa/75 px-4 py-3 text-left"
          >
            <p className="text-14 font-semibold text-hueso">{item.label}</p>
            <p className="font-mono text-14 text-oro">
              {formatNumber(values?.[item.id])} {view.cifras.unit}
            </p>
          </div>
        ))}
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {view.players.map((player) => {
          const result = view.cifras.orders?.[player.playerId];
          return (
            <div
              key={player.playerId}
              className="rounded-2xl border border-linea bg-mesa/75 px-4 py-3"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="truncate text-14 font-semibold text-hueso">{player.nick}</span>
                <span className="font-mono text-20 text-oro">+{result?.points ?? 0}</span>
              </div>
              <p className="mt-1 text-12 text-humo">
                {result
                  ? `${result.correctPositions}/${view.cifras.items.length} posiciones correctas`
                  : 'Sin respuesta'}
              </p>
            </div>
          );
        })}
      </div>
      <RevealNextAction canAdvance={canAdvance} pending={pending} onAction={onAction} />
    </section>
  );
}

function QuienLoHariaScreen({ view, onAction }: { view: QuienLoHariaPlayerView; onAction?: RoadmapActionSender }) {
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
                    sendRoadmapAction(onAction, {
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
          <WhoReveal view={view} canAdvance={canAdvance} pending={pendingAction} onAction={onAction} />
        )}
        {canFinish ? (
          <Button
            variant="ghost"
            onClick={() => sendRoadmapAction(onAction, { type: 'finishWho' })}
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
  onAction,
}: {
  view: QuienLoHariaPlayerView;
  canAdvance: boolean;
  pending: boolean;
  onAction?: RoadmapActionSender;
}) {
  return (
    <section className="flex flex-col gap-4">
      {view.who.resultsVisible ? (
        <div className="grid gap-2 sm:grid-cols-2">
          {view.players.map((player) => (
            <div
              key={player.playerId}
              className="flex items-center justify-between rounded-2xl border border-linea bg-mesa/75 px-4 py-3"
            >
              <span className="truncate text-14 font-semibold text-hueso">{player.nick}</span>
              <span className="font-mono text-22 text-oro">
                {view.who.voteCounts?.[player.playerId] ?? 0}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-oro/50 bg-oro/10 px-4 py-4 text-center text-14 text-hueso">
          Los votos quedan guardados hasta la clasificación final.
        </div>
      )}
      <RevealNextAction canAdvance={canAdvance} pending={pending} onAction={onAction} />
    </section>
  );
}

function CompletaLaFraseScreen({ view, onAction }: { view: CompletaLaFrasePlayerView; onAction?: RoadmapActionSender }) {
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
    sendRoadmapAction(onAction, { type: 'submitSentence', answer: answer.trim() });
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
          <p className="eyebrow">{sentenceCategoryLabel(view.sentence.category)}</p>
          <h1 className="mt-2 font-display text-32 leading-tight text-hueso">
            {view.sentence.prompt}
          </h1>
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
                onClick={() =>
                  sendRoadmapAction(onAction, { type: 'useSentenceHint' })
                }
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
          <SentenceReveal view={view} canAdvance={canAdvance} pending={pendingAction} onAction={onAction} />
        )}
        {canFinish ? (
          <Button
            variant="ghost"
            onClick={() => sendRoadmapAction(onAction, { type: 'finishSentence' })}
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
  onAction,
}: {
  view: CompletaLaFrasePlayerView;
  canAdvance: boolean;
  pending: boolean;
  onAction?: RoadmapActionSender;
}) {
  return (
    <section className="flex flex-col gap-4">
      <div className="rounded-3xl border border-oro/60 bg-oro/10 px-5 py-5 text-center">
        <p className="eyebrow">Respuesta esperada</p>
        <p className="mt-1 font-display text-36 text-hueso">
          {view.sentence.canonicalAnswer ?? '—'}
        </p>
        {view.sentence.hint ? (
          <p className="mt-1 text-13 text-humo">Pista: {view.sentence.hint}</p>
        ) : null}
        {view.sentence.author || view.sentence.source ? (
          <p className="mt-3 text-12 text-humo">
            {view.sentence.author ?? 'Frase popular'}
            {view.sentence.source ? ` · ${view.sentence.source}` : ''}
          </p>
        ) : null}
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {view.players.map((player) => {
          const result = view.sentence.answers?.[player.playerId];
          return (
            <div
              key={player.playerId}
              className="rounded-2xl border border-linea bg-mesa/75 px-4 py-3"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="truncate text-14 font-semibold text-hueso">{player.nick}</span>
                <span className="font-mono text-20 text-oro">+{result?.points ?? 0}</span>
              </div>
              <p className="mt-1 text-12 text-humo">
                {result?.answer ?? 'Sin respuesta'}
                {result?.hintUsed ? ' · con pista' : ''}
              </p>
            </div>
          );
        })}
      </div>
      <RevealNextAction canAdvance={canAdvance} pending={pending} onAction={onAction} />
    </section>
  );
}

function RevealNextAction({
  canAdvance,
  pending,
  onAction,
}: {
  canAdvance: boolean;
  pending: boolean;
  onAction?: RoadmapActionSender;
}) {
  return canAdvance ? (
    <Button
      onClick={() => sendRoadmapAction(onAction, { type: 'nextRound' })}
      loading={pending}
    >
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
  timerVariant,
  players,
  myPlayerId,
  submittedPlayerIds,
  mainClassName = 'gap-5 overflow-y-auto px-4 py-5',
  children,
}: {
  title: string;
  deadlineAt: number | null;
  durationSeconds: number;
  timerVariant?: 'default' | 'countdown';
  players: RoadmapPlayerView['players'];
  myPlayerId: string;
  submittedPlayerIds: string[];
  mainClassName?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="game-shell flex min-h-0 flex-1 flex-col overflow-hidden">
      <ColorCountdownHeader
        left={title}
        deadlineAt={deadlineAt}
        durationSeconds={durationSeconds}
        timerVariant={timerVariant}
      />
      <PlayerStrip
        players={players}
        turnPlayerId={null}
        myPlayerId={myPlayerId}
        renderInfo={(player) => (
          <span
            className="inline-flex items-center gap-1 whitespace-nowrap"
            title={
              submittedPlayerIds.includes(player.playerId) ? 'Respuesta bloqueada' : 'Pensando'
            }
          >
            <span>{player.score} pt</span>
            <span aria-hidden="true">
              {submittedPlayerIds.includes(player.playerId) ? '✅' : '🤔'}
            </span>
            <span className="sr-only">
              {submittedPlayerIds.includes(player.playerId) ? 'respuesta bloqueada' : 'pensando'}
            </span>
          </span>
        )}
      />
      <main className={`flex min-h-0 flex-1 flex-col items-center ${mainClassName}`}>
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

function sentenceCategoryLabel(category: string): string {
  switch (category) {
    case 'refran':
      return 'Refrán';
    case 'expresion':
      return 'Expresión';
    case 'cita':
      return 'Cita célebre';
    case 'historica':
      return 'Frase histórica';
    case 'humor':
      return 'Humor';
    case 'meme':
      return 'Meme / cultura popular';
    default:
      return category;
  }
}

function formatPercent(value: number | null | undefined): string {
  return value === null || value === undefined
    ? '—'
    : `${value.toLocaleString('es-ES', { maximumFractionDigits: 1 })} %`;
}
