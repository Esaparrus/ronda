// Límite de errores de React del App Router. Contrato P17: "nunca un error
// de React sin capturar" y "NO HAGAS: no muestres nunca INTERNAL ni trazas
// técnicas al jugador. Registra y enseña un texto humano." `error.tsx` se
// monta DENTRO del layout raíz (que sigue vivo: <html>/<body> ya están
// puestos), así que no repite fuentes ni fondo, solo el contenido.
'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { logClientError } from '@/lib/logger';
import { useIncidentReport } from '@/lib/useIncidentReport';
import { diagnosticContextFromState } from '@/lib/diagnostics';
import { useRondaStore } from '@/lib/store';
import { RondaMark } from '@/components/ui/RondaMark';

function currentContext() {
  return diagnosticContextFromState(useRondaStore.getState());
}

export default function ErrorScreen({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const incidentId = useIncidentReport(error, currentContext);

  useEffect(() => {
    // El mensaje/traza real solo va a la consola (para depurar en playtest
    // con el móvil conectado); el jugador nunca ve `error.message` ni el
    // `digest`.
    logClientError('error de interfaz no capturado', error);
  }, [error]);

  return (
    <main className="app-page flex min-h-dvh flex-col items-center justify-center gap-5 px-6 text-center">
      <RondaMark compact />
      <h1 className="font-display text-28 leading-display text-hueso">Algo ha fallado</h1>
      <p className="text-16 text-humo">Vuelve a intentarlo. Si sigue pasando, recarga la página.</p>
      {incidentId ? <p className="font-mono text-14 text-oro">Código {incidentId}</p> : null}
      <Button onClick={reset}>Reintentar</Button>
    </main>
  );
}
