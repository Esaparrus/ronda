'use client';

import { useEffect, useState } from 'react';
import { COLOR_ANSWER_SECONDS } from '@ronda/protocol';
import { TableHeader } from './TableHeader';

export interface ColorCountdownHeaderProps {
  left: string;
  deadlineAt: number | null;
}

/** Mantiene el repintado del reloj aislado del selector y del marcador. */
export function ColorCountdownHeader({ left, deadlineAt }: ColorCountdownHeaderProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (deadlineAt === null) return;
    const interval = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(interval);
  }, [deadlineAt]);

  const secondsLeft =
    deadlineAt === null
      ? null
      : Math.min(
          COLOR_ANSWER_SECONDS,
          Math.max(0, Math.ceil((deadlineAt - now) / 1000)),
        );
  const timerLabel = secondsLeft === null ? null : `00:${String(secondsLeft).padStart(2, '0')}`;
  const timerProgress =
    deadlineAt === null
      ? null
      : Math.max(0, Math.min(1, (deadlineAt - now) / (COLOR_ANSWER_SECONDS * 1000)));

  return (
    <TableHeader
      left={left}
      turnNick={null}
      timerLabel={timerLabel}
      timerUrgent={secondsLeft !== null && secondsLeft <= 5}
      timerProgress={timerProgress}
    />
  );
}
