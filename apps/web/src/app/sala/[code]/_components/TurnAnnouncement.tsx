'use client';

import { useEffect, useRef, useState } from 'react';
import type { PlayerId } from '@ronda/protocol';
import { useHaptics } from '@/lib/useHaptics';

const ANNOUNCEMENT_DURATION_MS = 1_000;

export interface TurnAnnouncementProps {
  active: boolean;
  myPlayerId: PlayerId;
  turnPlayerId: PlayerId | null;
}

/**
 * Aviso global que solo aparece cuando el turno pasa de otra persona al
 * jugador local. Conserva el último propietario no nulo para no perder la
 * transición si el servidor publica un breve estado de resolución entre ambos.
 */
export function TurnAnnouncement({
  active,
  myPlayerId,
  turnPlayerId,
}: TurnAnnouncementProps) {
  const previousTurnPlayerId = useRef<PlayerId | null>(turnPlayerId);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [visible, setVisible] = useState(false);
  const [sequence, setSequence] = useState(0);
  const { vibrateOnTurn } = useHaptics();

  useEffect(() => {
    const previousPlayerId = previousTurnPlayerId.current;

    if (turnPlayerId !== null) {
      previousTurnPlayerId.current = turnPlayerId;
    }

    const anotherPlayerPassedToMe =
      active &&
      turnPlayerId === myPlayerId &&
      previousPlayerId !== null &&
      previousPlayerId !== myPlayerId;

    if (!anotherPlayerPassedToMe) return;

    if (hideTimer.current !== null) {
      clearTimeout(hideTimer.current);
    }

    setSequence((current) => current + 1);
    setVisible(true);
    vibrateOnTurn();

    hideTimer.current = setTimeout(() => {
      setVisible(false);
      hideTimer.current = null;
    }, ANNOUNCEMENT_DURATION_MS);
  }, [active, myPlayerId, turnPlayerId, vibrateOnTurn]);

  useEffect(
    () => () => {
      if (hideTimer.current !== null) clearTimeout(hideTimer.current);
    },
    [],
  );

  if (!visible) return null;

  return (
    <div
      key={sequence}
      className="turn-announcement"
      role="status"
      aria-live="assertive"
      aria-atomic="true"
    >
      <p className="turn-announcement__word">TU TURNO</p>
    </div>
  );
}
