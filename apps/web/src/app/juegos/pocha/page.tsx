// Ficha de Pocha. Mismo patrón que /juegos/chinchon (contrato P13 / §7).
import Link from 'next/link';
import { BackToGames } from '@/components/ui/BackToGames';

const HOW_TO_PLAY = [
  'Se reparten cartas siguiendo una pirámide: 1, 2, 3... hasta un máximo, y vuelta a bajar.',
  'Se revela una carta para fijar el triunfo de la ronda.',
  'Antes de jugar, cada uno canta cuántas bazas cree que va a ganar.',
  'Jugáis las bazas por turnos: si tienes cartas del palo que sale, tienes que jugar una.',
  'Si aciertas tu cante ganas 10 + tus bazas; si fallas, no ganas puntos esa ronda.',
];

export default function PochaPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-8 px-6 py-10">
      <BackToGames />
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-40 leading-display text-hueso">Pocha</h1>
        <p className="text-16 text-humo">3–6 jugadores · 20–45 min</p>
      </header>

      <section className="flex flex-col gap-3">
        <h2 className="text-20 font-semibold text-hueso">Cómo se juega</h2>
        <ul className="flex flex-col gap-2">
          {HOW_TO_PLAY.map((line, i) => (
            <li key={i} className="flex gap-3 text-16 text-hueso">
              <span className="font-mono text-humo">{i + 1}</span>
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-auto flex flex-col gap-3">
        <Link
          href="/crear/pocha"
          className="flex min-h-14 items-center justify-center rounded-lg bg-brasa px-6 text-16 font-semibold text-hueso"
        >
          Crear partida
        </Link>
        <Link href="/reglas/pocha" className="text-center text-14 text-brasa underline">
          Ver las reglas completas
        </Link>
      </div>
    </main>
  );
}
