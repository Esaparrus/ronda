'use client';

import { useMemo, useState } from 'react';
import type { GameAction, RondaBillMode, RondaCardView, RondaPlayerView, RondaTapaType } from '@ronda/protocol';
import { RondaCardFan } from '@/components/ronda/RondaCardFan';
import { RondaTableOverview } from '@/components/ronda/RondaTableOverview';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { useRondaStore } from '@/lib/store';

const TYPE_LABEL: Record<RondaTapaType, string> = {
  carne: 'Carne',
  pescado: 'Pescado',
  vegetal: 'Vegetal',
};

const MODE_LABEL: Record<RondaBillMode, string> = {
  solo: 'Pago yo',
  half: 'A medias',
  group: 'Entre todos',
};

function firstCard(hand: RondaCardView[], kind: RondaCardView['kind']): RondaCardView | undefined {
  return hand.find((card) => card.kind === kind);
}

export interface RondaGameScreenProps {
  view: RondaPlayerView;
  onRequestLeave: () => void;
  onAction?: (action: GameAction) => void;
  embedded?: boolean;
}

export function RondaGameScreen({ view, onRequestLeave, onAction, embedded = false }: RondaGameScreenProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [targetType, setTargetType] = useState<RondaTapaType | null>(null);
  const [premiumId, setPremiumId] = useState<string | null>(null);
  const [halfTargetId, setHalfTargetId] = useState<string | null>(null);
  const [discardIds, setDiscardIds] = useState<string[]>([]);

  const selected = view.me.hand.find((card) => card.id === selectedId) ?? null;
  const premium = firstCard(view.me.hand, 'premium');
  const halfCard = firstCard(view.me.hand, 'mitad');
  const groupCard = firstCard(view.me.hand, 'grupo');
  const serviceCards = view.me.hand.filter((card) => card.kind === 'servicio');
  const myTurn = view.turnPlayerId === view.me.playerId;
  const turnNick = view.players.find((player) => player.playerId === view.turnPlayerId)?.nick;
  const legalSet = useMemo(() => new Set(view.me.legalCardIds), [view.me.legalCardIds]);
  const selectedSet = useMemo(() => new Set(selectedId ? [selectedId] : []), [selectedId]);
  const discardSet = useMemo(() => new Set(discardIds), [discardIds]);
  const disabledSet = useMemo(() => {
    if (!myTurn) return new Set(view.me.hand.map((card) => card.id));
    return new Set(view.me.hand.filter((card) => !legalSet.has(card.id)).map((card) => card.id));
  }, [legalSet, myTurn, view.me.hand]);
  const resolvedTargetType = targetType ?? view.me.legalTargetTypes[0] ?? null;

  function send(action: Parameters<ReturnType<typeof useRondaStore.getState>['sendAction']>[0]) {
    if (onAction) {
      onAction(action);
      return;
    }
    void useRondaStore.getState().sendAction(action);
  }

  function selectCard(card: RondaCardView) {
    setSelectedId((current) => (current === card.id ? null : card.id));
    setPremiumId(null);
    setTargetType(null);
  }

  function playSelected() {
    if (!selected || !legalSet.has(selected.id)) return;
    const chosenTarget = selected.kind === 'bloqueo' ? resolvedTargetType : undefined;
    send({
      type: 'playRondaCard',
      cardId: selected.id,
      ...(chosenTarget ? { targetType: chosenTarget } : {}),
      ...(premiumId ? { premiumCardId: premiumId } : {}),
    });
    setSelectedId(null);
    setPremiumId(null);
    setTargetType(null);
  }

  function chooseBillMode(mode: RondaBillMode) {
    if (mode === 'half') {
      if (!halfCard || !halfTargetId) return;
      send({
        type: 'chooseRondaBillMode',
        mode,
        cardId: halfCard.id,
        targetPlayerId: halfTargetId,
      });
      return;
    }
    if (mode === 'group') {
      if (!groupCard) return;
      send({ type: 'chooseRondaBillMode', mode, cardId: groupCard.id });
      return;
    }
    send({ type: 'chooseRondaBillMode', mode });
  }

  function toggleDiscard(cardId: string) {
    setDiscardIds((current) =>
      current.includes(cardId) ? current.filter((id) => id !== cardId) : [...current, cardId],
    );
  }

  return (
    <main className="mx-auto grid h-full min-h-0 w-full max-w-3xl flex-1 grid-rows-[auto_minmax(0,1fr)_auto] gap-2 overflow-hidden px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2">
      <header className="grid min-h-10 shrink-0 grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-center gap-2">
        <h1 className="min-w-0 truncate font-display text-18 text-hueso">
          La Ronda <span className="font-sans text-11 text-oro">R{view.round}</span>
        </h1>
        <p className="min-w-0 text-center text-11 leading-tight text-humo">
          <span className={myTurn ? 'font-semibold text-oro' : 'block truncate'}>
            {myTurn ? 'Te toca' : turnNick ? `Turno de ${turnNick}` : 'Resolviendo'}
          </span>
          <span className="block truncate">
            {view.direction === 1 ? 'Sentido horario' : 'Sentido inverso'}
          </span>
        </p>
        {!embedded ? <button
          type="button"
          onClick={onRequestLeave}
          className="glass-button !min-h-10 px-2.5 text-12 font-semibold text-humo"
        >
          <Icon name="arrow-left" size={16} />
          Salir
        </button> : <span aria-hidden="true" />}
      </header>

      <section className="min-h-0 overflow-hidden rounded-[20px] border border-linea bg-tinta/35 p-2">
        <RondaTableOverview view={view} />
      </section>

      <section className="shrink-0 rounded-[20px] border border-linea bg-mesa/95 px-2 pb-1 pt-2 shadow-2xl">
        {view.phase === 'ordering' ? (
          <>
            <div className="flex min-h-7 items-center justify-between gap-2">
              <p className="text-12 text-humo">{myTurn ? 'Elige una carta legal' : 'Tu mano'}</p>
              <div className="flex items-center gap-3">
                {view.me.availableActions.includes('skipRondaTurn') ? (
                  <button
                    type="button"
                    onClick={() => send({ type: 'skipRondaTurn' })}
                    className="min-h-7 text-11 text-humo underline"
                  >
                    Pasar
                  </button>
                ) : null}
                {view.me.availableActions.includes('askRondaBill') ? (
                  <button
                    type="button"
                    onClick={() => send({ type: 'askRondaBill' })}
                    className="min-h-7 font-semibold text-11 text-oro underline"
                  >
                    Pedir la cuenta
                  </button>
                ) : null}
              </div>
            </div>

            {selected ? (
              <div className="mb-1 flex min-h-12 items-center gap-2 rounded-xl border border-oro/35 bg-tinta/35 px-2 py-1.5">
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-11 leading-tight text-humo">
                    <span className="font-semibold text-hueso">{selected.name}.</span>{' '}
                    {selected.description}
                  </p>
                  {selected.kind === 'bloqueo' && view.me.legalTargetTypes.length > 0 ? (
                    <div className="mt-1 flex gap-1">
                      {view.me.legalTargetTypes.map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setTargetType(type)}
                          className={`min-h-7 rounded-lg border px-2 text-10 ${
                            resolvedTargetType === type
                              ? 'border-oro bg-oro/10 text-oro'
                              : 'border-linea text-hueso'
                          }`}
                        >
                          {TYPE_LABEL[type]}
                        </button>
                      ))}
                    </div>
                  ) : null}
                  {selected.kind === 'tapa' && premium ? (
                    <label className="mt-1 flex min-h-7 w-fit items-center gap-1.5 rounded-lg border border-linea px-2 text-10 text-hueso">
                      <input
                        type="checkbox"
                        checked={premiumId === premium.id}
                        onChange={(event) => setPremiumId(event.target.checked ? premium.id : null)}
                      />
                      Toque gourmet ×2
                    </label>
                  ) : null}
                </div>
                <Button
                  className="!min-h-10 shrink-0 !rounded-xl px-3 text-12"
                  onClick={playSelected}
                >
                  Jugar
                </Button>
              </div>
            ) : null}

            <RondaCardFan
              cards={view.me.hand}
              selectedIds={selectedSet}
              disabledIds={disabledSet}
              onCardClick={selectCard}
            />
          </>
        ) : null}

        {view.phase === 'billChoice' ? (
          view.me.availableActions.includes('chooseRondaBillMode') ? (
            <div className="flex flex-col gap-2 pb-2">
              <div>
                <h2 className="text-16 font-semibold text-hueso">¿Cómo pagas?</h2>
                <p className="text-11 text-humo">
                  Elige antes de que empiece la ronda de propinas.
                </p>
              </div>
              {view.me.availableBillModes.includes('half') ? (
                <div className="flex flex-wrap gap-1.5">
                  {view.players
                    .filter((player) => view.me.legalTargetPlayerIds.includes(player.playerId))
                    .map((player) => (
                      <button
                        key={player.playerId}
                        type="button"
                        onClick={() => setHalfTargetId(player.playerId)}
                        className={`min-h-9 rounded-xl border px-2.5 text-11 ${
                          halfTargetId === player.playerId
                            ? 'border-oro bg-oro/10 text-oro'
                            : 'border-linea text-hueso'
                        }`}
                      >
                        {player.nick}
                      </button>
                    ))}
                </div>
              ) : null}
              <div className="grid grid-cols-3 gap-1.5">
                {view.me.availableBillModes.map((mode) => (
                  <Button
                    key={mode}
                    variant={mode === 'solo' ? 'primary' : 'ghost'}
                    disabled={mode === 'half' && !halfTargetId}
                    onClick={() => chooseBillMode(mode)}
                    className="!min-h-11 !rounded-xl px-1.5 text-12"
                  >
                    {MODE_LABEL[mode]}
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            <p className="py-3 text-center text-13 text-humo">
              Quien pidió la cuenta está eligiendo cómo pagar.
            </p>
          )
        ) : null}

        {view.phase === 'tips' ? (
          view.me.availableActions.includes('passRondaBill') ? (
            <div className="flex flex-col gap-1">
              <div className="flex min-h-8 items-center justify-between gap-2">
                <h2 className="text-13 font-semibold text-hueso">Responde a la cuenta</h2>
                <Button
                  variant="ghost"
                  onClick={() => send({ type: 'passRondaBill' })}
                  className="!min-h-9 !rounded-xl px-3 text-11"
                >
                  Sin propina
                </Button>
              </div>
              {view.me.availableActions.includes('playRondaTip') ? (
                <RondaCardFan
                  cards={serviceCards}
                  onCardClick={(card) => send({ type: 'playRondaTip', cardId: card.id })}
                  emptyLabel="No tienes cartas de servicio"
                />
              ) : null}
            </div>
          ) : (
            <p className="py-3 text-center text-13 text-humo">La cuenta va pasando por la mesa…</p>
          )
        ) : null}

        {view.phase === 'discard' ? (
          view.me.availableActions.includes('confirmRondaDiscards') ? (
            <div className="flex flex-col gap-1">
              <div className="flex min-h-8 items-center justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="truncate text-13 font-semibold text-hueso">
                    Descarta antes de seguir
                  </h2>
                  <p className="truncate text-10 text-humo">Marca lo que no quieras conservar.</p>
                </div>
                <Button
                  onClick={() => send({ type: 'confirmRondaDiscards', cardIds: discardIds })}
                  className="!min-h-10 shrink-0 !rounded-xl px-3 text-11"
                >
                  Confirmar ({discardIds.length})
                </Button>
              </div>
              <RondaCardFan
                cards={view.me.hand}
                selectedIds={discardSet}
                onCardClick={(card) => toggleDiscard(card.id)}
              />
            </div>
          ) : (
            <p className="py-3 text-center text-13 text-humo">Preparando la siguiente ronda…</p>
          )
        ) : null}
      </section>
    </main>
  );
}
