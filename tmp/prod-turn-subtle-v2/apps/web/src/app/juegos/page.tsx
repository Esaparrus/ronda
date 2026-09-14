// Catálogo. Contrato P13 / §7: cada juego tiene su propia ficha
// (/juegos/chinchon, /juegos/pocha) -- este es solo el listado para elegir.
import Link from 'next/link';

const GAMES = [
  { slug: 'laronda', name: 'La Ronda', players: '3–8 jugadores', duration: '10–20 min', mark: '€', kind: 'Cartas y pique' },
  { slug: 'chinchon', name: 'Chinchón', players: '2–4 jugadores', duration: '15–30 min', mark: '7', kind: 'Cartas' },
  { slug: 'pocha', name: 'Pocha', players: '2–6 jugadores', duration: '20–45 min', mark: '♠', kind: 'Bazas' },
  { slug: 'mus', name: 'Mus', players: '4 jugadores, por parejas', duration: '30–60 min', mark: 'M', kind: 'Parejas' },
  { slug: 'brisca', name: 'Brisca', players: '2–4 jugadores', duration: '10–25 min', mark: '3', kind: 'Bazas' },
  { slug: 'escoba', name: 'Escoba', players: '2–4 jugadores', duration: '15–25 min', mark: '15', kind: 'Capturas' },
  { slug: 'sieteymedia', name: 'Siete y media', players: '2–7 jugadores', duration: '10–20 min', mark: '7½', kind: 'Tentar la suerte' },
  { slug: 'tute', name: 'Tute', players: '2 jugadores', duration: '20–35 min', mark: 'T', kind: 'Bazas' },
  { slug: 'cinquillo', name: 'Cinquillo', players: '2–6 jugadores', duration: '10–20 min', mark: '5', kind: 'Descarte' },
  { slug: 'orden', name: 'Orden', players: '2–7 jugadores', duration: '10–20 min', mark: '↑', kind: 'Cooperativo' },
  { slug: 'colores', name: 'Colores', players: '2–7 jugadores', duration: '15–25 min', mark: '●', kind: 'Social' },
  { slug: 'mayoria', name: 'Mayoría', players: '2–7 jugadores', duration: '10–20 min', mark: '≋', kind: 'Social' },
  { slug: 'escala', name: 'Escala', players: '2–7 jugadores', duration: '15–25 min', mark: '↔', kind: 'Social' },
] as const;

export default function JuegosPage() {
  return (
    <main className="app-page safe-page mx-auto flex min-h-dvh max-w-md flex-col gap-7 px-5">
      <header className="flex flex-col gap-2">
        <Link href="/" className="mb-3 text-14 text-humo hover:text-hueso">← Portada</Link>
        <span className="eyebrow">¿A qué jugamos?</span>
        <h1 className="font-display text-40 leading-display text-crema">Elige un juego</h1>
        <p className="text-14 text-humo">Clásicos de cartas y juegos para animar la sobremesa.</p>
      </header>

      <ul className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2">
        {GAMES.map((g) => (
          <li key={g.slug}>
            <Link
              href={`/juegos/${g.slug}`}
              className="interactive-surface group flex min-h-[116px] items-center gap-4 px-4 py-4"
            >
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-oro/50 bg-tinta/45 font-display text-20 text-oro transition-transform group-hover:-rotate-3 group-hover:scale-105" aria-hidden="true">
                {g.mark}
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="font-mono text-12 uppercase tracking-wider text-humo">{g.kind}</span>
                <span className="text-20 font-semibold text-hueso">{g.name}</span>
                <span className="text-12 text-humo">{g.players} · {g.duration}</span>
              </span>
              <span className="text-20 text-oro/70 transition-transform group-hover:translate-x-1" aria-hidden="true">›</span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
