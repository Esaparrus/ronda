// Límite de errores de React del App Router. Contrato P17: "nunca un error
// de React sin capturar" y "NO HAGAS: no muestres nunca INTERNAL ni trazas
// técnicas al jugador. Registra y enseña un texto humano." `error.tsx` se
// monta DENTRO del layout raíz (que sigue vivo: <html>/<body> ya están
// puestos), así que no repite fuentes ni fondo, solo el contenido.
'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { logClientError } from '@/lib/logger';

export default function ErrorScreen({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // El mensaje/traza real solo va a la consola (para depurar en playtest
    // con el móvil conectado); el jugador nunca ve `error.message` ni el
    // `digest`.
    logClientError('error de interfaz no capturado', error);
  }, [error]);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-6 text-center">
      <h1 className="font-display text-28 leading-display text-hueso">Algo ha fallado</h1>
      <p className="text-16 text-humo">Vuelve a intentarlo. Si sigue pasando, recarga la página.</p>
      <Button onClick={reset}>Reintentar</Button>
    </main>
  );
}
