import Link from 'next/link';
import { BackToGames } from '@/components/ui/BackToGames';

export default function MayoriaPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-8 px-6 py-10">
      <BackToGames />
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-40 leading-display text-hueso">Mayoria</h1>
        <p className="text-16 text-humo">3-7 jugadores · respuestas · 10-20 min</p>
      </header>
      <p className="text-16 text-hueso">
        Responded sin mirar a nadie. La respuesta que mas se repita gana el punto.
      </p>
      <Link href="/crear/mayoria" className="mt-auto flex min-h-14 items-center justify-center rounded-lg bg-brasa px-6 text-16 font-semibold text-hueso">
        Crear partida
      </Link>
    </main>
  );
}
