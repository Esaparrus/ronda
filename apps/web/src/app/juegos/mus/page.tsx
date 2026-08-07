// Ficha de Mus. Mismo patrón que /juegos/chinchon y /juegos/pocha
// (contrato P13 / §7). Lo que distingue a Mus en el catálogo es que es el
// primer juego POR PAREJAS (§12.2), así que se dice ya aquí.
import Link from 'next/link';
import { BackToGames } from '@/components/ui/BackToGames';

const HOW_TO_PLAY = [
  'Se juega siempre 4 contra 4, en dos parejas: los compañeros se sientan enfrentados.',
  'Cada uno recibe 4 cartas. Si los cuatro dicen «mus», se descarta y se reparte otra vez.',
  'En cuanto alguien corta, se juegan cuatro lances: grande, chica, pares y juego.',
  'En cada lance se pasa, se envida un número de piedras, o se lanza un órdago.',
  'Al final de la mano se descubren las cartas y se cuentan las piedras. 40 piedras ganan el juego.',
];

export default function MusPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-8 px-6 py-10">
      <BackToGames />
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-40 leading-display text-hueso">Mus</h1>
        <p className="text-16 text-humo">4 jugadores, por parejas · 30–60 min</p>
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

      <p className="rounded-md border border-linea bg-mesa p-3 text-14 text-humo">
        En Mus no hay jugadores robot: hacen falta cuatro personas. Las parejas las decide quien
        crea la sala, moviendo a la gente de asiento antes de empezar.
      </p>

      <div className="mt-auto flex flex-col gap-3">
        <Link
          href="/crear/mus"
          className="flex min-h-14 items-center justify-center rounded-lg bg-brasa px-6 text-16 font-semibold text-hueso"
        >
          Crear partida
        </Link>
        <Link href="/reglas/mus" className="text-center text-14 text-brasa underline">
          Ver las reglas completas
        </Link>
      </div>
    </main>
  );
}
