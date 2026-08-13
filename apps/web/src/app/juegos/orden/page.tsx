import Link from 'next/link';
import { BackToGames } from '@/components/ui/BackToGames';

const HOW_TO_PLAY = [
  'Cada persona recibe una o varias cartas numeradas en secreto.',
  'Habláis si queréis y jugáis las cartas al centro cuando creáis que toca.',
  'Las cartas deben aparecer de menor a mayor.',
  'Si os equivocáis, la carta se descarta y seguís jugando sin vidas.',
];

export default function OrdenPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-8 px-6 py-10">
      <BackToGames />
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-40 leading-display text-hueso">Orden</h1>
        <p className="text-16 text-humo">2-7 jugadores · cooperativo · 10-20 min</p>
      </header>
      <section className="flex flex-col gap-3">
        <h2 className="text-20 font-semibold text-hueso">Como se juega</h2>
        <ul className="flex flex-col gap-2">
          {HOW_TO_PLAY.map((line, index) => (
            <li key={line} className="flex gap-3 text-16 text-hueso">
              <span className="font-mono text-humo">{index + 1}</span>
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </section>
      <Link href="/crear/orden" className="mt-auto flex min-h-14 items-center justify-center rounded-lg bg-brasa px-6 text-16 font-semibold text-hueso">
        Crear partida
      </Link>
    </main>
  );
}
