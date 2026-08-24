import type { CSSProperties } from 'react';

export interface GranRondaTrapEncounterProps {
  x: number;
  y: number;
  coinsDelta: number;
}

/** Encuentro puramente visual; el mensaje accesible vive en el panel de resolución. */
export function GranRondaTrapEncounter({ x, y, coinsDelta }: GranRondaTrapEncounterProps) {
  return (
    <div
      className="gran-ronda-trap-encounter"
      style={{ left: `${x}%`, top: `${y}%` } as CSSProperties}
      aria-hidden="true"
    >
      <span className="gran-ronda-trap-encounter__monster">
        <svg viewBox="0 0 96 96" role="presentation">
          <path
            className="monster-shadow"
            d="M18 78c5-10 17-15 32-15 17 0 29 6 33 16-15 8-51 8-65-1Z"
          />
          <path
            className="monster-horn"
            d="M28 26 18 10c13 1 21 6 24 14ZM66 25 79 11c-1 13-6 21-16 25Z"
          />
          <path
            className="monster-body"
            d="M24 49c0-20 11-31 27-31s27 13 27 33c0 23-11 33-29 33-17 0-25-12-25-35Z"
          />
          <path
            className="monster-belly"
            d="M37 57c8-7 22-5 28 4 5 9-1 18-15 18-13 0-19-12-13-22Z"
          />
          <path className="monster-brow" d="m34 40 11 4M66 40l-11 4" />
          <circle className="monster-eye" cx="40" cy="48" r="4" />
          <circle className="monster-eye" cx="60" cy="48" r="4" />
          <path className="monster-mouth" d="M39 61c7 6 15 6 22 0" />
          <path className="monster-tooth" d="m45 63 3 7 4-6 4 6 3-7" />
          <path className="monster-arm" d="M25 54 10 47M75 53l13-9" />
          <circle className="monster-fist" cx="10" cy="46" r="8" />
        </svg>
      </span>
      <span className="gran-ronda-trap-encounter__impact">¡PUM!</span>
      <span className="gran-ronda-trap-encounter__loss">
        {coinsDelta < 0 ? `${coinsDelta} Oros` : 'Sin Oros'}
      </span>
    </div>
  );
}
