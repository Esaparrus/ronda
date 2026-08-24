'use client';

import { useEffect, useState } from 'react';
import type { GranRondaMovementPublic } from '@ronda/protocol';

const PIPS: Record<number, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

export function GranRondaDie({
  value,
  compact = false,
}: {
  value: number | null;
  compact?: boolean;
}) {
  const pipIndexes = value === null ? [] : (PIPS[value] ?? []);
  return (
    <span
      role="img"
      className={`gran-ronda-die grid shrink-0 place-items-center rounded-[20%] border-2 shadow-[0_10px_24px_rgba(0,0,0,0.3)] ${value === null ? '' : 'grid-cols-3'} ${compact ? 'size-12 p-1.5' : 'size-16 p-2 sm:size-[4.5rem]'}`}
      aria-label={value === null ? 'Dado listo para tirar' : `Dado mostrando ${value}`}
    >
      {value === null ? (
        <strong className="font-display text-32 leading-none" aria-hidden="true">
          ?
        </strong>
      ) : (
        Array.from({ length: 9 }, (_, index) => (
          <span
            key={index}
            className={`aspect-square w-[52%] rounded-full ${pipIndexes.includes(index) ? '' : 'opacity-0'}`}
            aria-hidden="true"
          />
        ))
      )}
    </span>
  );
}

function AnimatedDiceResult({
  dice,
  total,
  playerName,
}: {
  dice: number[];
  total: number;
  playerName: string;
}) {
  const [frame, setFrame] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const diceCount = dice.length;

  useEffect(() => {
    const interval = window.setInterval(() => {
      setFrame((current) => current + 1);
    }, 90);
    const revealTimer = window.setTimeout(() => {
      window.clearInterval(interval);
      setRevealed(true);
    }, 810);
    return () => {
      window.clearInterval(interval);
      window.clearTimeout(revealTimer);
    };
  }, [diceCount]);

  const visibleDice = revealed
    ? dice
    : Array.from({ length: diceCount }, (_, index) => ((frame + index * 2) % 6) + 1);

  return (
    <div
      className="gran-ronda-dice-roll flex min-w-[min(86%,18rem)] flex-col items-center gap-2 rounded-[26px] border border-white/25 bg-tinta/90 px-5 py-4 text-center shadow-[0_18px_50px_rgba(0,0,0,0.4)] backdrop-blur-md"
      role="status"
      aria-live="polite"
    >
      <p className="font-mono text-10 uppercase tracking-[0.18em] text-oro">
        Tirada de {playerName}
      </p>
      <div className="flex items-center justify-center gap-2.5" aria-hidden="true">
        {visibleDice.map((die, index) => (
          <div
            key={index}
            className={`gran-ronda-die-roll ${revealed ? 'gran-ronda-die-roll--settled' : 'gran-ronda-die-roll--spinning'}`}
            style={{ animationDelay: `${index * -90}ms` }}
          >
            <GranRondaDie value={die} />
          </div>
        ))}
        {diceCount > 1 && revealed ? (
          <span className="font-display text-24 text-hueso">=</span>
        ) : null}
      </div>
      <strong className="font-display text-24 leading-none text-hueso">
        {revealed ? `Ha salido ${total}` : 'Girando…'}
      </strong>
    </div>
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
    <div className="pointer-events-none absolute inset-0 z-40 grid place-items-center p-3">
      <AnimatedDiceResult
        key={`${movement.playerId}-${movement.roll}-${dice.join('-')}`}
        dice={dice}
        total={movement.roll}
        playerName={playerName}
      />
    </div>
  );
}
