// Ruta sin coincidencia del App Router (404). Contrato P17: "Añade
// error.tsx y not-found.tsx en el App Router." No es un componente
// cliente: no necesita estado ni manejadores, así que se queda de servidor
// como el resto de páginas estáticas del catálogo.
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { RondaMark } from '@/components/ui/RondaMark';

export default function NotFound() {
  return (
    <main className="app-page flex min-h-dvh flex-col items-center justify-center gap-5 px-6 text-center">
      <RondaMark compact />
      <h1 className="font-display text-28 leading-display text-hueso">Página no encontrada</h1>
      <p className="text-16 text-humo">No hay nada en esta dirección.</p>
      <Link
        href="/"
        className="primary-action flex min-h-14 items-center justify-center gap-2 rounded-[18px] px-6 text-16 font-semibold text-white"
      >
        <Icon name="arrow-left" size={18} /> Ir al inicio
      </Link>
    </main>
  );
}
