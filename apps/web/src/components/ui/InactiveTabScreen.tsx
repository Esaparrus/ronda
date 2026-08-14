// Pantalla a pantalla completa cuando esta pestaña ha quedado inactiva
// porque la misma sala se abrió en otra más nueva. Contrato P17: "la
// pestaña vieja se marca como inactiva y muestra «Estás jugando en otra
// pestaña». La sesión sigue viva en la otra pestaña, pero se permite volver
// al inicio para que esta pantalla nunca sea un callejón sin salida.
import Link from 'next/link';

export function InactiveTabScreen() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-16 text-hueso">Estás jugando en otra pestaña.</p>
      <p className="text-14 text-humo">
        Cierra esta pestaña o vuelve a la otra para seguir jugando.
      </p>
      <Link href="/" className="text-14 text-humo underline">
        Volver al inicio
      </Link>
    </main>
  );
}
