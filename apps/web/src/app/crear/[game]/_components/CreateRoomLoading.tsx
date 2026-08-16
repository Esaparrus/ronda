'use client';

import { useEffect, useState } from 'react';
import { LOADING_MESSAGE_INTERVAL_MS, createLoadingMessage } from './create-loading';

export interface CreateRoomLoadingProps {
  gameTitle: string;
}

export function CreateRoomLoading({ gameTitle }: CreateRoomLoadingProps) {
  const [messageNumber, setMessageNumber] = useState(0);
  const message = createLoadingMessage(messageNumber);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const interval = window.setInterval(
      () => setMessageNumber((current) => current + 1),
      LOADING_MESSAGE_INTERVAL_MS,
    );

    return () => {
      window.clearInterval(interval);
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  return (
    <section
      className="create-loading-screen"
      aria-label={`Preparando tu partida de ${gameTitle}`}
      aria-busy="true"
    >
      <div className="create-loading-content">
        <div className="create-loading-shuffle" aria-hidden="true">
          <span className="create-loading-card create-loading-card--left">
            <span>R</span>
          </span>
          <span className="create-loading-card create-loading-card--right">
            <span>R</span>
          </span>
          <span className="create-loading-card create-loading-card--center">
            <span>R</span>
          </span>
        </div>

        <p className="create-loading-message" aria-live="polite" aria-atomic="true">
          <span key={message}>{message}</span>
        </p>
      </div>
    </section>
  );
}
