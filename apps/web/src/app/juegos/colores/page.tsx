import Link from 'next/link';
import { BackToGames } from '@/components/ui/BackToGames';

export default function ColoresPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-8 px-6 py-10">
      <BackToGames />
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-40 leading-display text-hueso">Colores</h1>
        <p className="text-16 text-humo">3-7 jugadores · preguntas · 10-20 min</p>
      </header>
      <p className="text-16 text-hueso">
        Elegid uno o varios colores en secreto, hablad en la mesa y descubrid quien ha acertado.
      </p>
      <Link href="/crear/colores" className="mt-auto flex min-h-14 items-center justify-center rounded-lg bg-brasa px-6 text-16 font-semibold text-hueso">
        Crear partida
      </Link>
    </main>
  );
}
