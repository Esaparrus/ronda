// navigator.vibrate cuando empieza tu turno, si está disponible. Contrato P12.
'use client';

import { useCallback } from 'react';

export interface UseHapticsResult {
  /** Vibra brevemente. Llamarlo cuando `turnPlayerId` pasa a ser el tuyo. */
  vibrateOnTurn: () => void;
}

const TURN_VIBRATION_MS = 80;

export function useHaptics(): UseHapticsResult {
  const vibrateOnTurn = useCallback(() => {
    if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
    navigator.vibrate(TURN_VIBRATION_MS);
  }, []);

  return { vibrateOnTurn };
}
