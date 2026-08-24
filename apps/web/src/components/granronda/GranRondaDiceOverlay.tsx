import type { GranRondaMovementPublic } from '@ronda/protocol';

const PIPS: Record<number, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

export function GranRondaDie({ value, compact = false }: { value: number; compact?: boolean }) {
  const pipIndexes = PIPS[value] ?? [];
  return (
    <span
      className={`gran-ronda-die grid shrink-0 grid-cols-3 place-items-center rounded-[20%] border-2 border-white/80 bg-hueso shadow-[0_10px_24px_rgba(0,0,0,0.3)] ${compact ? 'size-12 p-1.5' : 'size-16 p-2 sm:size-[4.5rem]'}`}
      aria-label={`Dado mostrando ${value}`}
    >
      {Array.from({ length: 9 }, (_, index) => (
        <span
          key={index}
          className={`aspect-square w-[52%] rounded-full ${pipIndexes.includes(index) ? 'bg-tinta' : 'opacity-0'}`}
          aria-hidden="true"
        />
      ))}
    </span>
  );
}

export function GranRondaDiceOverlay({
  movement,
  playerName,
}: {
  movement: GranRondaMovementPublic;
  playerName: string;
}) {
  const dice = movement.dice.length > 0 ? movement.dice : [Math.min(movement.roll, 6)];
  return (
    <div
      key={`${movement.playerId}-${movement.roll}`}
      className="pointer-events-none absolute inset-0 z-40 grid place-items-center p-3"
      role="status"
      aria-live="polite"
    >
      <div className="gran-ronda-dice-roll flex min-w-[min(86%,18rem)] flex-col items-center gap-2 rounded-[26px] border border-white/25 bg-tinta/90 px-5 py-4 text-center shadow-[0_18px_50px_rgba(0,0,0,0.4)] backdrop-blur-md">
        <p className="font-mono text-10 uppercase tracking-[0.18em] text-oro">Tirada de {playerName}</p>
        <div className="flex items-center justify-center gap-2.5" aria-hidden="true">
          {dice.map((die, index) => (
            <div key={`${die}-${index}`} className="gran-ronda-die-roll">
              <GranRondaDie value={die} />
            </div>
          ))}
          {dice.length > 1 ? <span className="font-display text-24 text-hueso">=</span> : null}
        </div>
        <strong className="font-display text-24 leading-none text-hueso">Ha salido {movement.roll}</strong>
      </div>
    </div>
  );
}
