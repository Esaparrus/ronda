import Image from 'next/image';
import type { PrecioJustoTableView, PublicPlayer } from '@ronda/protocol';
import { ColorCountdownHeader } from '@/app/sala/[code]/_components/ColorCountdownHeader';

export interface PrecioJustoMesaGameBoardProps {
  view: PrecioJustoTableView;
}

const EURO = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });

export function PrecioJustoMesaGameBoard({ view }: PrecioJustoMesaGameBoardProps) {
  const revealed = view.phase === 'reveal';
  const reference = view.price.referencePriceCents;
  return (
    <main className="flex min-h-dvh flex-1 flex-col">
      <ColorCountdownHeader
        left={`Precio justo · ronda ${view.round}/${view.config.rounds}`}
        deadlineAt={view.phase === 'input' ? view.price.deadlineAt : null}
        durationSeconds={view.config.answerTimeSeconds || 1}
      />
      <div className="flex flex-1 flex-col items-center gap-7 overflow-y-auto px-8 py-8 text-center">
        <section className="grid w-full max-w-5xl gap-8 lg:grid-cols-[minmax(280px,420px)_1fr] lg:items-center lg:text-left">
          <div className="relative aspect-[4/2.8] overflow-hidden rounded-3xl border border-linea bg-mesa shadow-lg">
            <Image
              src={view.price.product.image}
              alt={view.price.product.title}
              fill
              sizes="(max-width: 1024px) 90vw, 420px"
              className="object-contain p-10"
              unoptimized
              priority
            />
          </div>
          <div className="flex flex-col gap-3">
            <p className="text-14 font-semibold uppercase tracking-[0.16em] text-humo">Producto</p>
            <p className="text-14 font-semibold uppercase tracking-[0.16em] text-oro">
              {view.price.product.category}
            </p>
            {view.price.product.brandModel ? (
              <p className="text-16 text-humo">{view.price.product.brandModel}</p>
            ) : null}
            <h1 className="text-[clamp(2rem,5vw,4.4rem)] font-semibold leading-tight text-hueso">
              {view.price.product.title}
            </h1>
            <p className="text-20 text-humo">{view.price.product.variant}</p>
            <p className="text-14 text-humo">{view.price.product.conditions}</p>
            {view.price.product.detailPageUrl ? (
              <a
                href={view.price.product.detailPageUrl}
                target="_blank"
                rel="noreferrer"
                className="text-14 font-semibold text-equipo-turquesa underline-offset-2 hover:underline"
              >
                {view.price.product.asin ? 'Ver producto en Amazon.es ↗' : 'Ver ficha del producto ↗'}
              </a>
            ) : null}
            {view.price.product.asin ? (
              <p className="text-12 text-humo">
                Precio consultado en Amazon.es · ASIN {view.price.product.asin}
              </p>
            ) : null}
          </div>
        </section>

        {revealed ? (
          <section className="flex w-full max-w-5xl flex-col gap-5">
            <div className="rounded-3xl border border-oro/60 bg-oro/10 px-6 py-5">
              <p className="text-14 uppercase tracking-[0.16em] text-humo">
                {view.status === 'gameEnd' ? 'Último precio revelado' : 'Precio de referencia'}
              </p>
              <p className="mt-1 font-display text-[clamp(2.4rem,6vw,5rem)] text-oro">
                {reference === null ? '—' : formatCents(reference)}
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {view.players
                .slice()
                .sort((left, right) => right.score - left.score || left.seat - right.seat)
                .map((player) => (
                  <MesaGuessRow key={player.playerId} player={player} view={view} />
                ))}
            </div>
          </section>
        ) : (
          <p className="text-24 text-humo">
            {view.price.submittedPlayerIds.length}/{view.players.length} precios bloqueados
          </p>
        )}
      </div>
    </main>
  );
}

function MesaGuessRow({
  player,
  view,
}: {
  player: PublicPlayer;
  view: PrecioJustoTableView;
}) {
  const guess = view.price.guesses?.[player.playerId];
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-linea bg-mesa/80 px-5 py-4 text-left">
      <span className="min-w-0 flex-1">
        <span className="block truncate text-20 font-semibold text-hueso">{player.nick}</span>
        <span className="block text-14 text-humo">
          {guess?.priceCents === null || guess?.priceCents === undefined
            ? 'Sin respuesta'
            : `${formatCents(guess.priceCents)} · error ${formatPercent(guess.relativeErrorPercent)}`}
        </span>
      </span>
      <span className="text-right">
        <span className="block font-mono text-28 font-semibold text-oro">+{guess?.points ?? 0}</span>
        <span className="block text-12 text-humo">
          {guess?.differenceCents === null || guess?.differenceCents === undefined
            ? '—'
            : `±${formatCents(guess.differenceCents)}`}
        </span>
      </span>
    </div>
  );
}

function formatCents(cents: number): string {
  return EURO.format(cents / 100);
}

function formatPercent(percent: number | null | undefined): string {
  return percent === null || percent === undefined
    ? '—'
    : `${percent.toLocaleString('es-ES', { maximumFractionDigits: 1 })} %`;
}
