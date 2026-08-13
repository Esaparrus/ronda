import Link from 'next/link';
import { BackToGames } from '@/components/ui/BackToGames';

export default function EscalaPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-8 px-6 py-10">
      <BackToGames />
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-40 leading-display text-hueso">Escala</h1>
        <p className="text-16 text-humo">3-7 jugadores · pistas · 15-25 min</p>
      </header>
      <p className="text-16 text-hueso">
        Una persona conoce un punto secreto entre dos extremos y da una pista. El resto intenta leerle la mente.
      </p>
      <Link href="/crear/escala" className="mt-auto flex min-h-14 items-center justify-center rounded-lg bg-brasa px-6 text-16 font-semibold text-hueso">
        Crear partida
      </Link>
    </main>
  );
}
