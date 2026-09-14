'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { logClientError } from '@/lib/logger';
import { useIncidentReport } from '@/lib/useIncidentReport';
import { emptyDiagnosticContext } from '@/lib/diagnostics';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const incidentId = useIncidentReport(error, emptyDiagnosticContext);

  useEffect(() => {
    logClientError('error global no capturado', error);
  }, [error]);

  return (
    <html lang="es">
      <body className="bg-tinta font-sans text-hueso">
        <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-6 text-center">
          <h1 className="font-display text-28 leading-display text-hueso">Algo ha fallado</h1>
          <p className="text-16 text-humo">La incidencia se ha guardado. Prueba a continuar.</p>
          {incidentId ? <p className="font-mono text-14 text-oro">Código {incidentId}</p> : null}
          <Button onClick={reset}>Reintentar</Button>
        </main>
      </body>
    </html>
  );
}
