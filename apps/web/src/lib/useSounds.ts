// Sonidos generados con AudioContext, sin ficheros de audio. Contrato P12.
//
// Tres avisos: tu turno, carta descartada, fin de ronda. Con interruptor
// (el hook expone `enabled`/`setEnabled`) y respetando
// `prefers-reduced-motion`: si el usuario lo pide, tampoco suena nada — el
// contrato (§8.4) trata el movimiento y el sonido como el mismo tipo de
// estímulo añadido, y ambos se apagan juntos.
'use client';

import { useCallback, useRef, useState } from 'react';

interface WindowWithWebkitAudio {
  webkitAudioContext?: typeof AudioContext;
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function resolveAudioContextCtor(): typeof AudioContext | undefined {
  if (typeof window === 'undefined') return undefined;
  return window.AudioContext ?? (window as unknown as WindowWithWebkitAudio).webkitAudioContext;
}

export interface UseSoundsResult {
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
  /** Empieza tu turno. */
  playTurn: () => void;
  /** Alguien ha descartado una carta. */
  playDiscard: () => void;
  /** Ha terminado la ronda. */
  playRoundEnd: () => void;
}

/** Hook de sonidos de interfaz: tres avisos cortos generados por síntesis. */
export function useSounds(): UseSoundsResult {
  const [enabled, setEnabled] = useState(true);
  const ctxRef = useRef<AudioContext | null>(null);

  const ensureContext = useCallback((): AudioContext | null => {
    if (ctxRef.current) return ctxRef.current;
    const Ctor = resolveAudioContextCtor();
    if (!Ctor) return null;
    ctxRef.current = new Ctor();
    return ctxRef.current;
  }, []);

  const tone = useCallback(
    (frequency: number, durationMs: number, delayMs = 0) => {
      if (!enabled || prefersReducedMotion()) return;
      const ctx = ensureContext();
      if (!ctx) return;
      const startAt = ctx.currentTime + delayMs / 1000;
      const stopAt = startAt + durationMs / 1000;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = frequency;
      osc.connect(gain);
      gain.connect(ctx.destination);
      gain.gain.setValueAtTime(0.15, startAt);
      gain.gain.exponentialRampToValueAtTime(0.0001, stopAt);
      osc.start(startAt);
      osc.stop(stopAt);
    },
    [enabled, ensureContext],
  );

  const playTurn = useCallback(() => tone(660, 150), [tone]);
  const playDiscard = useCallback(() => tone(220, 90), [tone]);
  const playRoundEnd = useCallback(() => {
    tone(440, 120, 0);
    tone(550, 150, 130);
    tone(660, 200, 260);
  }, [tone]);

  return { enabled, setEnabled, playTurn, playDiscard, playRoundEnd };
}
