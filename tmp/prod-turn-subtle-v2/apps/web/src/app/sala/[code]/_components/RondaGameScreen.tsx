'use client';

import { useMemo, useState } from 'react';
import type { RondaBillMode, RondaCardView, RondaPlayerView, RondaTapaType } from '@ronda/protocol';
import { Button } from '@/components/ui/Button';
import { RondaCard } from '@/components/ronda/RondaCard';
import { RondaTableOverview } from '@/components/ronda/RondaTableOverview';
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

export function RondaGameScreen({ view }: { view: RondaPlayerView }) {
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

  function send(action: Parameters<ReturnType<typeof useRondaStore.getState>['sendAction']>[0]) {
    void useRondaStore.getState().sendAction(action);
  }

  function playSelected() {
    if (!selected || !legalSet.has(selected.id)) return;
    const chosenTarget = selected.kind === 'bloqueo'
      ? targetType ?? view.me.legalTargetTypes[0]
      : undefined;
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
      send({ type: 'chooseRondaBillMode', mode, cardId: halfCard.id, targetPlayerId: halfTargetId });
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
    setDiscardIds((current) => current.includes(cardId) ? current.filter((id) => id !== cardId) : [...current, cardId]);
  }

  return (
    <main className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col gap-3 overflow-hidden px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
      <header className="flex shrink-0 items-center justify-between gap-3">
        <div>
          <p className="eyebrow">Ronda {view.round}</p>
          <h1 className="font-display text-24 text-hueso">La Ronda</h1>
        </div>
        <p className="text-right text-13 text-humo">
          {myTurn ? <span className="font-semibold text-oro">Te toca</span> : turnNick ? `Turno de ${turnNick}` : 'Resolviendo la cuenta'}
          <br />
          {view.direction === 1 ? 'Sentido horario' : 'Sentido inverso'}
        </p>
      </header>

      <section className="min-h-0 flex-1 overflow-y-auto rounded-[22px] border border-linea bg-tinta/35 p-3">
        <RondaTableOverview view={view} />
      </section>

      <section className="shrink-0 rounded-[22px] border border-linea bg-mesa/95 p-3 shadow-2xl">
        {view.phase === 'ordering' ? (
          <>
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-13 text-humo">{myTurn ? 'Elige una carta legal' : 'Tu mano'}</p>
              <div className="flex gap-2">
                {view.me.availableActions.includes('skipRondaTurn') ? (
                  <button type="button" onClick={() => send({ type: 'skipRondaTurn' })} className="text-12 text-humo underline">Pasar</button>
                ) : null}
                {view.me.availableActions.includes('askRondaBill') ? (
                  <button type="button" onClick={() => send({ type: 'askRondaBill' })} className="font-semibold text-13 text-oro underline">Pedir la cuenta</button>
                ) : null}
              </div>
            </div>
            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-3 pt-2">
              {view.me.hand.map((card) => (
                <RondaCard
                  key={card.id}
                  card={card}
                  selected={card.id === selectedId}
                  disabled={!myTurn || !legalSet.has(card.id)}
                  onClick={() => {
                    setSelectedId(card.id === selectedId ? null : card.id);
                    setPremiumId(null);
                    setTargetType(null);
                  }}
                />
              ))}
            </div>
            {selected ? (
              <div className="flex flex-col gap-2 border-t border-linea pt-3">
                <p className="text-13 text-humo"><span className="font-semibold text-hueso">{selected.name}.</span> {selected.description}</p>
                {selected.kind === 'bloqueo' && view.me.legalTargetTypes.length > 0 ? (
                  <div className="flex gap-2">
                    {view.me.legalTargetTypes.map((type) => (
                      <button key={type} type="button" onClick={() => setTargetType(type)} className={`min-h-10 flex-1 rounded-xl border px-2 text-13 ${targetType === type ? 'border-oro bg-oro/10 text-oro' : 'border-linea text-hueso'}`}>
                        {TYPE_LABEL[type]}
                      </button>
                    ))}
                  </div>
                ) : null}
                {selected.kind === 'tapa' && premium ? (
                  <label className="flex min-h-11 items-center gap-2 rounded-xl border border-linea px-3 text-13 text-hueso">
                    <input type="checkbox" checked={premiumId === premium.id} onChange={(event) => setPremiumId(event.target.checked ? premium.id : null)} />
                    Añadir Toque gourmet y duplicar el precio
                  </label>
                ) : null}
                <Button className="w-full" onClick={playSelected}>Jugar {selected.name}</Button>
              </div>
            ) : null}
          </>
        ) : null}

        {view.phase === 'billChoice' ? (
          view.me.availableActions.includes('chooseRondaBillMode') ? (
            <div className="flex flex-col gap-3">
              <div>
                <h2 className="text-18 font-semibold text-hueso">¿Cómo pagas?</h2>
                <p className="text-13 text-humo">Elige antes de que empiece la ronda de propinas.</p>
              </div>
              {view.me.availableBillModes.includes('half') ? (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {view.players.filter((player) => view.me.legalTargetPlayerIds.includes(player.playerId)).map((player) => (
                    <button key={player.playerId} type="button" onClick={() => setHalfTargetId(player.playerId)} className={`min-h-11 shrink-0 rounded-xl border px-3 text-13 ${halfTargetId === player.playerId ? 'border-oro bg-oro/10 text-oro' : 'border-linea text-hueso'}`}>{player.nick}</button>
                  ))}
                </div>
              ) : null}
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {view.me.availableBillModes.map((mode) => (
                  <Button key={mode} variant={mode === 'solo' ? 'primary' : 'ghost'} disabled={mode === 'half' && !halfTargetId} onClick={() => chooseBillMode(mode)}>{MODE_LABEL[mode]}</Button>
                ))}
              </div>
            </div>
          ) : <p className="py-3 text-center text-14 text-humo">Quien pidió la cuenta está eligiendo cómo pagar.</p>
        ) : null}

        {view.phase === 'tips' ? (
          view.me.availableActions.includes('passRondaBill') ? (
            <div className="flex flex-col gap-3">
              <h2 className="text-18 font-semibold text-hueso">Te toca responder a la cuenta</h2>
              {view.me.availableActions.includes('playRondaTip') ? (
                <div className="flex gap-2 overflow-x-auto py-1">
                  {serviceCards.map((card) => <RondaCard key={card.id} card={card} compact onClick={() => send({ type: 'playRondaTip', cardId: card.id })} />)}
                </div>
              ) : null}
              <Button variant="ghost" onClick={() => send({ type: 'passRondaBill' })}>No añado propina</Button>
            </div>
          ) : <p className="py-3 text-center text-14 text-humo">La cuenta va pasando por la mesa…</p>
        ) : null}

        {view.phase === 'discard' ? (
          view.me.availableActions.includes('confirmRondaDiscards') ? (
            <div className="flex flex-col gap-3">
              <div>
                <h2 className="text-18 font-semibold text-hueso">Descarta antes de seguir</h2>
                <p className="text-13 text-humo">Marca las cartas que no quieras conservar. Tu mano crece en la próxima ronda.</p>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-3 pt-2">
                {view.me.hand.map((card) => <RondaCard key={card.id} card={card} compact selected={discardIds.includes(card.id)} onClick={() => toggleDiscard(card.id)} />)}
              </div>
              <Button onClick={() => send({ type: 'confirmRondaDiscards', cardIds: discardIds })}>Confirmar descartes ({discardIds.length})</Button>
            </div>
          ) : <p className="py-3 text-center text-14 text-humo">Preparando la siguiente ronda…</p>
        ) : null}
      </section>
    </main>
  );
}
