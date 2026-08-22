'use client';

import Image from 'next/image';
import { useState, type FormEvent } from 'react';
import type { PrecioJustoPlayerView, PublicPlayer } from '@ronda/protocol';
import { useRondaStore } from '@/lib/store';
import { Button } from '@/components/ui/Button';
import { Pill } from '@/components/ui/Pill';
import { PlayerStrip } from './PlayerStrip';
import { ColorCountdownHeader } from './ColorCountdownHeader';

export interface PrecioJustoGameScreenProps {
  view: PrecioJustoPlayerView;
}

const CATEGORY_LABELS: Record<string, string> = {
  hogar: 'Hogar y cocina',
  tecnologia: 'Tecnología',
  ocio: 'Ocio y juegos',
  deporte: 'Deporte',
  accesorios: 'Accesorios',
  curiosos: 'Curioso',
  baratos: 'Producto barato',
  'precio-medio': 'Precio medio',
};

const EURO = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });
const DECIMAL = new Intl.NumberFormat('es-ES', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

export function PrecioJustoGameScreen({ view }: PrecioJustoGameScreenProps) {
  const pendingAction = useRondaStore((state) => state.pendingAction);
  const lastError = useRondaStore((state) => state.lastError);
  const [input, setInput] = useState('');
  const [inputError, setInputError] = useState<string | null>(null);
  const canSubmit = view.me.availableActions.includes('submitPrice');
  const canFinish = view.me.availableActions.includes('finishPrice');

  function submitPrice(event: FormEvent) {
    event.preventDefault();
    const parsed = parsePrice(input);
    if (parsed === null) {
      setInputError('Escribe un precio válido, por ejemplo 24,99.');
      return;
    }
    setInputError(null);
    void useRondaStore.getState().sendAction({ type: 'submitPrice', priceCents: parsed });
  }

  function nextRound() {
    void useRondaStore.getState().sendAction({ type: 'nextRound' });
  }

  return (
    <div className="game-shell flex min-h-0 flex-1 flex-col overflow-hidden">
      <ColorCountdownHeader
        left={`Precio justo · ronda ${view.round}/${view.config.rounds}`}
        deadlineAt={view.phase === 'input' ? view.price.deadlineAt : null}
        durationSeconds={view.config.answerTimeSeconds || 1}
      />
      <PlayerStrip
        players={view.players}
        turnPlayerId={null}
        myPlayerId={view.me.playerId}
        renderInfo={(player) =>
          `${player.score} puntos · ${view.price.submittedPlayerIds.includes(player.playerId) ? 'listo' : 'pensando'}`
        }
      />

      <main className="flex min-h-0 flex-1 flex-col items-center gap-5 overflow-y-auto px-4 py-5">
        <section className="surface-panel w-full max-w-md overflow-hidden p-0">
          <div className="relative aspect-[4/2.8] w-full bg-mesa">
            <Image
              src={view.price.product.image}
              alt={view.price.product.title}
              fill
              sizes="(max-width: 640px) 100vw, 448px"
              className="object-cover"
              unoptimized
              priority
            />
          </div>
          <div className="flex flex-col gap-2 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <Pill>{CATEGORY_LABELS[view.price.product.category] ?? view.price.product.category}</Pill>
              {view.price.product.brandModel ? (
                <span className="text-12 text-humo">{view.price.product.brandModel}</span>
              ) : null}
            </div>
            <h1 className="text-24 font-semibold leading-tight text-hueso">
              {view.price.product.title}
            </h1>
            <p className="text-14 text-humo">{view.price.product.variant}</p>
            <p className="text-12 leading-relaxed text-humo">{view.price.product.conditions}</p>
            {view.price.product.detailPageUrl ? (
              <a
                href={view.price.product.detailPageUrl}
                target="_blank"
                rel="noreferrer"
                className="text-13 font-semibold text-equipo-turquesa underline-offset-2 hover:underline"
              >
                {view.price.product.asin ? 'Ver producto en Amazon.es ↗' : 'Ver ficha del producto ↗'}
              </a>
            ) : null}
            {view.price.product.asin ? (
              <p className="text-11 text-humo">
                Precio y disponibilidad consultados en Amazon.es · ASIN {view.price.product.asin}
              </p>
            ) : null}
          </div>
        </section>

        {view.phase === 'input' ? (
          <section className="flex w-full max-w-md flex-col gap-4 text-center">
            <div>
              <p className="eyebrow">¿Cuánto cuesta?</p>
              <p className="mt-1 text-14 text-humo">
                {view.price.submittedPlayerIds.length}/{view.players.length} respuestas bloqueadas
              </p>
            </div>
            {canSubmit ? (
              <form className="flex flex-col gap-3" onSubmit={submitPrice}>
                <label htmlFor="precio-justo" className="sr-only">
                  Precio estimado en euros
                </label>
                <div className="relative">
                  <input
                    id="precio-justo"
                    type="number"
                    min="0.01"
                    max="1000000"
                    step="0.01"
                    inputMode="decimal"
                    autoComplete="off"
                    value={input}
                    onChange={(event) => {
                      setInput(event.target.value);
                      if (inputError) setInputError(null);
                    }}
                    placeholder="0,00"
                    className="form-control h-16 px-5 pr-14 text-center font-mono text-28"
                    aria-describedby={inputError ? 'precio-justo-error' : undefined}
                    aria-invalid={Boolean(inputError)}
                    autoFocus
                  />
                  <span className="pointer-events-none absolute inset-y-0 right-5 flex items-center font-mono text-20 text-humo">
                    €
                  </span>
                </div>
                {inputError ? (
                  <p id="precio-justo-error" className="text-13 text-brasa">
                    {inputError}
                  </p>
                ) : null}
                <Button type="submit" loading={pendingAction}>
                  Bloquear mi precio
                </Button>
              </form>
            ) : (
              <div className="rounded-2xl border border-equipo-turquesa/50 bg-equipo-turquesa/10 px-4 py-4 text-16 font-semibold text-hueso">
                Tu precio está bloqueado. Esperando al resto…
              </div>
            )}
            {canFinish ? (
              <Button
                variant="ghost"
                onClick={() =>
                  void useRondaStore.getState().sendAction({ type: 'finishPrice' })
                }
                loading={pendingAction}
              >
                Revelar ahora
              </Button>
            ) : null}
            {view.config.answerTimeSeconds === 0 ? (
              <p className="text-12 text-humo">Sin límite de tiempo · el anfitrión revelará cuando estéis listos.</p>
            ) : null}
            {lastError ? <p className="text-13 text-brasa">{lastError}</p> : null}
          </section>
        ) : (
          <RevealPanel view={view} onNextRound={nextRound} pending={pendingAction} />
        )}
      </main>
    </div>
  );
}

function RevealPanel({
  view,
  onNextRound,
  pending,
}: {
  view: PrecioJustoPlayerView;
  onNextRound: () => void;
  pending: boolean;
}) {
  const reference = view.price.referencePriceCents;
  const hostCanAdvance = view.me.availableActions.includes('nextRound');
  return (
    <section className="flex w-full max-w-2xl flex-col gap-4">
      <div className="rounded-2xl border border-oro/50 bg-oro/10 px-5 py-4 text-center">
        <p className="eyebrow">Precio de referencia</p>
        <p className="mt-1 font-display text-40 text-hueso">
          {reference === null ? '—' : formatCents(reference)}
        </p>
      </div>
      {view.price.product.asin ? (
        <p className="text-center text-11 text-humo">
          Como asociado de Amazon, Ronda obtiene ingresos por compras que cumplan los requisitos.
        </p>
      ) : null}
      <div className="grid gap-2 sm:grid-cols-2">
        {view.players
          .slice()
          .sort((left, right) => right.score - left.score || left.seat - right.seat)
          .map((player) => (
            <GuessRow key={player.playerId} player={player} view={view} />
          ))}
      </div>
      {view.status === 'playing' && hostCanAdvance ? (
        <Button onClick={onNextRound} loading={pending}>
          Siguiente producto
        </Button>
      ) : view.status === 'playing' ? (
        <p className="text-center text-14 text-humo">El anfitrión prepara el siguiente producto.</p>
      ) : null}
    </section>
  );
}

function GuessRow({ player, view }: { player: PublicPlayer; view: PrecioJustoPlayerView }) {
  const guess = view.price.guesses?.[player.playerId];
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-linea bg-mesa/75 px-4 py-3">
      <span className="min-w-0 flex-1">
        <span className="block truncate text-15 font-semibold text-hueso">{player.nick}</span>
        <span className="block text-12 text-humo">
          {guess?.priceCents === null || guess?.priceCents === undefined
            ? 'Sin respuesta'
            : `${formatCents(guess.priceCents)} · error ${formatPercent(guess.relativeErrorPercent)}`}
        </span>
      </span>
      <span className="text-right">
        <span className="block font-mono text-20 font-semibold text-oro">
          +{guess?.points ?? 0}
        </span>
        <span className="block text-11 text-humo">{guess?.differenceCents === null || guess?.differenceCents === undefined ? '—' : `±${formatCents(guess.differenceCents)}`}</span>
      </span>
    </div>
  );
}

function parsePrice(value: string): number | null {
  const amount = Number(value.trim().replace(',', '.'));
  if (!Number.isFinite(amount) || amount <= 0 || amount > 1_000_000) return null;
  const cents = Math.round(amount * 100);
  return cents > 0 && cents <= 100_000_000 ? cents : null;
}

function formatCents(cents: number): string {
  return EURO.format(cents / 100);
}

function formatPercent(percent: number | null | undefined): string {
  return percent === null || percent === undefined ? '—' : `${DECIMAL.format(percent)} %`;
}
