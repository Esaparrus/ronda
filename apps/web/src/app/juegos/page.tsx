// Catálogo. Contrato P13 / §7: "Solo Chinchón. Ficha: jugadores, duración,
// cómo se juega". De momento un solo juego, pero la ficha vive en su propia
// pantalla (no se salta desde la portada) para cuando haya más de uno.
import Link from 'next/link';

const HOW_TO_PLAY = [
  'Cada jugador recibe siete cartas en mano.',
  'En tu turno robas una carta y descartas otra.',
  'Junta escaleras del mismo palo o grupos del mismo número.',
  'Cierra la ronda cuando te queden pocos puntos sueltos.',
  'Gana quien menos puntos acumule, o quien haga chinchón.',
];

export default function JuegosPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-8 px-6 py-10">
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-40 leading-display text-hueso">Chinchón</h1>
        <p className="text-16 text-humo">2–4 jugadores · 15–30 min</p>
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
          href="/crear"
          className="flex min-h-14 items-center justify-center rounded-lg bg-brasa px-6 text-16 font-semibold text-hueso"
        >
          Crear partida
        </Link>
        <Link href="/reglas" className="text-center text-14 text-brasa underline">
          Ver las reglas completas
        </Link>
      </div>
    </main>
  );
}
