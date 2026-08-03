// Catálogo. Contrato P13 / §7: cada juego tiene su propia ficha
// (/juegos/chinchon, /juegos/pocha) -- este es solo el listado para elegir.
import Link from 'next/link';

const GAMES = [
  { slug: 'chinchon', name: 'Chinchón', players: '2–4 jugadores', duration: '15–30 min' },
  { slug: 'pocha', name: 'Pocha', players: '3–6 jugadores', duration: '20–45 min' },
] as const;

export default function JuegosPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-8 px-6 py-10">
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-40 leading-display text-hueso">Elige un juego</h1>
      </header>

      <ul className="flex flex-col gap-4">
        {GAMES.map((g) => (
          <li key={g.slug}>
            <Link
              href={`/juegos/${g.slug}`}
              className="flex flex-col gap-1 rounded-lg border border-linea bg-mesa px-5 py-4"
            >
              <span className="text-20 font-semibold text-hueso">{g.name}</span>
              <span className="text-14 text-humo">
                {g.players} · {g.duration}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
