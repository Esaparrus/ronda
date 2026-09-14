// Ruta sin coincidencia del App Router (404). Contrato P17: "Añade
// error.tsx y not-found.tsx en el App Router." No es un componente
// cliente: no necesita estado ni manejadores, así que se queda de servidor
// como el resto de páginas estáticas del catálogo.
import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-6 text-center">
      <h1 className="font-display text-28 leading-display text-hueso">Página no encontrada</h1>
      <p className="text-16 text-humo">No hay nada en esta dirección.</p>
      <Link
        href="/"
        className="flex min-h-14 items-center justify-center rounded-lg bg-brasa px-6 text-16 font-semibold text-hueso"
      >
        Ir a la portada
      </Link>
    </main>
  );
}
