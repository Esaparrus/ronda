// Pantalla de error a pantalla completa cuando el socket lleva caído más
// del umbral (30s, serverDown.ts). Contrato P17: "pantalla de error con
// botón de reintento, nunca un error de React sin capturar". "Reintentar"
// recarga la página entera a propósito: es el reintento más simple y
// fiable -- vuelve a montar el socket desde cero y, si hay token guardado,
// SalaClient/MesaClient retoman la sesión solos (contrato P12), en vez de
// intentar remendar un socket que ya lleva medio minuto sin responder.
'use client';

import Link from 'next/link';
import { Button } from './Button';
import { RondaMark } from './RondaMark';

export function ConnectionLostScreen() {
  return (
    <main className="app-page flex min-h-dvh flex-col items-center justify-center gap-5 px-6 text-center">
      <RondaMark compact />
      <h1 className="font-display text-28 leading-display text-hueso">
        Sin conexión con el servidor
      </h1>
      <p className="text-16 text-humo">
        Llevamos un rato sin poder conectar. Comprueba tu conexión e inténtalo de nuevo.
      </p>
      <Button onClick={() => window.location.reload()}>Reintentar</Button>
      <Link href="/" className="text-14 text-humo underline">
        Volver al inicio
      </Link>
    </main>
  );
}
