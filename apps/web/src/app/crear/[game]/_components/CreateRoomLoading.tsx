'use client';

import { useEffect, useState } from 'react';
import { createLoadingSnapshot } from './create-loading';

export interface CreateRoomLoadingProps {
  gameTitle: string;
}

export function CreateRoomLoading({ gameTitle }: CreateRoomLoadingProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const { message, remainingSeconds } = createLoadingSnapshot(elapsedSeconds);

  useEffect(() => {
    const startedAt = Date.now();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const refreshCountdown = () => {
      setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1_000));
    };
    const interval = window.setInterval(refreshCountdown, 250);

    return () => {
      window.clearInterval(interval);
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  return (
    <section
      className="create-loading-screen"
      aria-labelledby="create-loading-title"
      aria-describedby="create-loading-description"
      aria-busy="true"
    >
      <div className="create-loading-panel">
        <span className="eyebrow">La casa invita a esperar</span>
        <div className="create-loading-clock" aria-hidden="true">
          <span className="create-loading-clock__ring" />
          <span className="create-loading-clock__tick create-loading-clock__tick--top">●</span>
          <span className="create-loading-clock__tick create-loading-clock__tick--right">●</span>
          <span className="create-loading-clock__tick create-loading-clock__tick--bottom">●</span>
          <span className="create-loading-clock__tick create-loading-clock__tick--left">●</span>
          <span className="create-loading-clock__number">
            {remainingSeconds > 0 ? remainingSeconds : '…'}
          </span>
          <span className="create-loading-clock__unit">
            {remainingSeconds > 0 ? 'segundos' : 'ya casi'}
          </span>
        </div>

        <div className="flex flex-col items-center gap-2 text-center">
          <h1 id="create-loading-title" className="font-display text-28 leading-display text-hueso">
            Preparando la mesa
          </h1>
          <p id="create-loading-description" className="max-w-xs text-14 text-humo">
            Estamos abriendo tu partida de {gameTitle}. No cierres esta pantalla.
          </p>
        </div>

        <div className="create-loading-message" aria-live="polite" aria-atomic="true">
          <p key={message}>{message}</p>
        </div>

        <p className="max-w-xs text-center text-12 text-humo">
          Si el bar estaba cerrado, la primera ronda puede tardar cerca de un minuto.
        </p>
      </div>
    </section>
  );
}
