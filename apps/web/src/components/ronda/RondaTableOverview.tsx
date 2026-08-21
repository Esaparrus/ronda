import type { CSSProperties } from 'react';
import type { RondaCommonView } from '@ronda/protocol';
import { Avatar } from '@/components/ui/Avatar';
import { Pill } from '@/components/ui/Pill';
import { formatEuros } from '@/lib/ronda';

const TYPE_LABEL = { carne: 'Carne', pescado: 'Pescado', vegetal: 'Vegetal' } as const;

function nickFor(view: RondaCommonView, playerId: string | null): string {
  return view.players.find((player) => player.playerId === playerId)?.nick ?? '—';
}

function RondaCompactOverview({ view }: { view: RondaCommonView }) {
  const playerGridStyle = {
    gridTemplateColumns: `repeat(${Math.min(4, Math.max(1, view.players.length))}, minmax(0, 1fr))`,
  } satisfies CSSProperties;

  return (
    <div className="flex h-full min-h-0 flex-col justify-center gap-2">
      <div className="grid grid-cols-3 gap-1.5">
        {view.tapas.map((pile) => (
          <section
            key={pile.type}
            className={`min-w-0 rounded-xl border px-2 py-1.5 ${
              pile.blocked ? 'border-brasa/70 bg-brasa/10' : 'border-linea bg-mesa/70'
            }`}
          >
            <div className="flex min-w-0 items-center justify-between gap-1">
              <span className="truncate text-10 font-semibold uppercase tracking-wide text-hueso">
                {TYPE_LABEL[pile.type]}
              </span>
              {pile.blocked ? <span className="text-10 font-semibold text-brasa">×</span> : null}
            </div>
            <div className="mt-0.5 flex items-baseline justify-between gap-1">
              <span className="truncate font-mono text-14 text-oro">
                {pile.topPriceCents === null ? '—' : formatEuros(pile.topPriceCents)}
              </span>
              <span className="shrink-0 text-10 text-humo">{pile.cards.length} ped.</span>
            </div>
          </section>
        ))}
      </div>

      <div className="grid grid-cols-[1fr_1.15fr_1fr] gap-1.5 text-center">
        <div className="rounded-xl border border-linea bg-tinta/45 px-1.5 py-1">
          <p className="text-9 uppercase tracking-wider text-humo">Vino</p>
          <p className="truncate font-mono text-13 text-hueso">
            {view.wineCount} · {formatEuros(view.wineCostCents)}
          </p>
        </div>
        <div className="rounded-xl border border-oro/45 bg-oro/10 px-1.5 py-1">
          <p className="text-9 uppercase tracking-wider text-humo">Cuenta</p>
          <p className="truncate font-mono text-15 font-bold text-oro">
            {formatEuros(view.billPreviewCents)}
          </p>
        </div>
        <div className="rounded-xl border border-linea bg-tinta/45 px-1.5 py-1">
          <p className="text-9 uppercase tracking-wider text-humo">Mazo</p>
          <p className="font-mono text-13 text-hueso">{view.deckCount}</p>
        </div>
      </div>

      <ul className="grid gap-1.5" style={playerGridStyle}>
        {view.players.map((player) => {
          const active = player.playerId === view.turnPlayerId;
          const protectedPlayer = view.protectedPlayerIds.includes(player.playerId);
          return (
            <li
              key={player.playerId}
              className={`relative flex min-w-0 items-center gap-1 rounded-xl border px-1.5 py-1 ${
                active ? 'border-oro bg-oro/10' : 'border-linea bg-mesa/45'
              }`}
            >
              <Avatar name={player.nick} colorIndex={player.colorIndex} size={24} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-10 font-semibold text-hueso">
                  {player.nick}
                </span>
                <span className="flex items-center justify-between gap-1 font-mono text-10 text-oro">
                  <span>{formatEuros(player.score)}</span>
                  <span className="shrink-0 text-humo">{player.handCount}c</span>
                </span>
              </span>
              {protectedPlayer ? (
                <span
                  className="absolute right-1 top-0 text-9 text-oro"
                  title="A salvo"
                  aria-label="A salvo"
                >
                  ◉
                </span>
              ) : null}
            </li>
          );
        })}
      </ul>

      {view.billRequesterId ? (
        <p className="rounded-lg border border-oro/40 bg-oro/10 px-2 py-1 text-center text-11 text-hueso">
          {nickFor(view, view.billRequesterId)} ha pedido la cuenta
          {view.billResponderId ? ` · responde ${nickFor(view, view.billResponderId)}` : ''}
        </p>
      ) : null}
    </div>
  );
}

function RondaLargeOverview({ view }: { view: RondaCommonView }) {
  return (
    <div className="flex min-h-0 w-full max-w-5xl flex-col gap-3">
      <div className="grid grid-cols-3 gap-2">
        {view.tapas.map((pile) => (
          <section
            key={pile.type}
            className={`relative overflow-hidden rounded-2xl border p-3 ${
              pile.blocked ? 'border-brasa/70 bg-brasa/10' : 'border-linea bg-mesa/70'
            }`}
          >
            <div className="flex items-center justify-between gap-1">
              <span className="text-20 font-semibold text-hueso">{TYPE_LABEL[pile.type]}</span>
              {pile.blocked ? <Pill>Cerrada</Pill> : null}
            </div>
            <p className="mt-2 font-mono text-28 text-oro">
              {pile.topPriceCents === null ? '—' : formatEuros(pile.topPriceCents)}
            </p>
            <p className="mt-1 text-11 text-humo">
              {pile.cards.length} pedido{pile.cards.length === 1 ? '' : 's'}
            </p>
          </section>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl border border-linea bg-tinta/45 p-2">
          <p className="text-11 uppercase tracking-wider text-humo">Vino</p>
          <p className="font-mono text-16 text-hueso">
            {view.wineCount} · {formatEuros(view.wineCostCents)}
          </p>
        </div>
        <div className="rounded-xl border border-linea bg-tinta/45 p-2">
          <p className="text-11 uppercase tracking-wider text-humo">Cuenta</p>
          <p className="font-mono text-16 text-oro">{formatEuros(view.billPreviewCents)}</p>
        </div>
        <div className="rounded-xl border border-linea bg-tinta/45 p-2">
          <p className="text-11 uppercase tracking-wider text-humo">Mazo</p>
          <p className="font-mono text-16 text-hueso">{view.deckCount}</p>
        </div>
      </div>

      <ul className="grid grid-cols-4 gap-2">
        {view.players.map((player) => {
          const active = player.playerId === view.turnPlayerId;
          const protectedPlayer = view.protectedPlayerIds.includes(player.playerId);
          return (
            <li
              key={player.playerId}
              className={`flex min-w-0 items-center gap-2 rounded-xl border px-2 py-2 ${
                active ? 'border-oro bg-oro/10' : 'border-linea bg-mesa/45'
              }`}
            >
              <Avatar name={player.nick} colorIndex={player.colorIndex} size={40} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-13 text-hueso">{player.nick}</span>
                <span className="block font-mono text-12 text-oro">
                  {formatEuros(player.score)}
                </span>
              </span>
              <span className="text-11 text-humo">{player.handCount} 🂠</span>
              {protectedPlayer ? (
                <span title="A salvo" aria-label="A salvo">
                  ◉
                </span>
              ) : null}
            </li>
          );
        })}
      </ul>

      {view.billRequesterId ? (
        <p className="rounded-xl border border-oro/40 bg-oro/10 px-3 py-2 text-center text-13 text-hueso">
          {nickFor(view, view.billRequesterId)} ha pedido la cuenta
          {view.billResponderId ? ` · responde ${nickFor(view, view.billResponderId)}` : ''}
        </p>
      ) : null}
    </div>
  );
}

export function RondaTableOverview({
  view,
  large = false,
}: {
  view: RondaCommonView;
  large?: boolean;
}) {
  return large ? <RondaLargeOverview view={view} /> : <RondaCompactOverview view={view} />;
}
