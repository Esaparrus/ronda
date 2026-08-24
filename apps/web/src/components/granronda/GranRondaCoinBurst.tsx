import type { CSSProperties } from 'react';

export interface GranRondaCoinBurstProps {
  x: number;
  y: number;
  amount: number;
}

/** Recompensa visual; el contador y los paneles conservan el anuncio accesible. */
export function GranRondaCoinBurst({ x, y, amount }: GranRondaCoinBurstProps) {
  const coinCount = Math.min(6, Math.max(3, amount + 2));

  return (
    <span
      className="gran-ronda-coin-burst"
      style={{ left: `${x}%`, top: `${y}%` }}
      aria-hidden="true"
    >
      {Array.from({ length: coinCount }, (_, index) => (
        <i
          key={index}
          className="gran-ronda-coin-burst__coin"
          style={{ '--coin-index': index } as CSSProperties}
        >
          ◉
        </i>
      ))}
      <strong>+{amount}</strong>
      <small>Oros</small>
    </span>
  );
}
