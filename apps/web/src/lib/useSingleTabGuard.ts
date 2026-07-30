// Hook fino sobre tabGuard.ts: expone si ESTA pestaña ha quedado inactiva
// porque se abrió la misma sala en otra más nueva. Contrato P17. Lógica de
// coordinación real y sus tests viven en tabGuard.ts/tabGuard.test.ts (sin
// React); esto solo la conecta al ciclo de vida del componente.
'use client';

import { useEffect, useState } from 'react';
import { startTabGuard } from './tabGuard.ts';

/** `roomCode` null desactiva la vigilancia (aún no hay sala que vigilar). */
export function useSingleTabGuard(roomCode: string | null): boolean {
  const [inactive, setInactive] = useState(false);

  useEffect(() => {
    if (!roomCode) return;
    setInactive(false);
    const guard = startTabGuard(roomCode, () => setInactive(true));
    return () => guard.dispose();
  }, [roomCode]);

  return inactive;
}
