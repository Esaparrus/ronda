// Catálogo. Contrato P13 / §7: cada juego tiene su propia ficha
// (/juegos/chinchon, /juegos/pocha) -- este es solo el listado para elegir.
import Link from 'next/link';
import { GameGlyph } from '@/components/ui/GameGlyph';
import { Icon } from '@/components/ui/Icon';

const GAMES = [
  { slug: 'laronda', name: 'La Ronda', players: '3–8 jugadores', duration: '10–20 min', kind: 'Cartas y pique' },
  { slug: 'chinchon', name: 'Chinchón', players: '2–4 jugadores', duration: '15–30 min', kind: 'Cartas' },
  { slug: 'pocha', name: 'Pocha', players: '2–6 jugadores', duration: '20–45 min', kind: 'Bazas' },
  { slug: 'mus', name: 'Mus', players: '4 jugadores, por parejas', duration: '30–60 min', kind: 'Parejas' },
  { slug: 'brisca', name: 'Brisca', players: '2–4 jugadores', duration: '10–25 min', kind: 'Bazas' },
  { slug: 'escoba', name: 'Escoba', players: '2–4 jugadores', duration: '15–25 min', kind: 'Capturas' },
  { slug: 'sieteymedia', name: 'Siete y media', players: '2–7 jugadores', duration: '10–20 min', kind: 'Tentar la suerte' },
  { slug: 'tute', name: 'Tute', players: '2 jugadores', duration: '20–35 min', kind: 'Bazas' },
  { slug: 'cinquillo', name: 'Cinquillo', players: '2–6 jugadores', duration: '10–20 min', kind: 'Descarte' },
  { slug: 'orden', name: 'Orden', players: '2–7 jugadores', duration: '10–20 min', kind: 'Cooperativo' },
  { slug: 'colores', name: 'Colores', players: '2–7 jugadores', duration: '15–25 min', kind: 'Social' },
  { slug: 'mayoria', name: 'Mayoría', players: '2–7 jugadores', duration: '10–20 min', kind: 'Social' },
  { slug: 'escala', name: 'Escala', players: '2–7 jugadores', duration: '15–25 min', kind: 'Social' },
  { slug: 'musical', name: 'Musical', players: '1–8 jugadores', duration: '10–25 min', kind: 'Música' },
  { slug: 'matiz', name: 'Matiz', players: '1–7 jugadores', duration: '5–15 min', kind: 'Color y precisión' },
  { slug: 'preciojusto', name: 'Precio justo', players: '2–7 jugadores', duration: '10–25 min', kind: 'Estimación' },
] as const;

export default function JuegosPage() {
  return (
    <main className="app-page safe-page mx-auto flex min-h-dvh max-w-lg flex-col gap-6 px-5">
      <header className="flex flex-col gap-3">
        <Link href="/" className="glass-button w-fit px-3.5 text-14 font-semibold">
          <Icon name="arrow-left" size={17} />
          Inicio
        </Link>
        <div className="mt-1 flex flex-col gap-2">
          <span className="eyebrow">Tu próxima partida</span>
          <h1 className="font-display text-40 leading-display text-hueso">¿A qué jugamos?</h1>
          <p className="max-w-sm text-15 leading-relaxed text-humo">
            Clásicos de cartas y juegos rápidos para compartir la sobremesa.
          </p>
        </div>
      </header>

      <ul className="grid grid-cols-2 gap-3">
        {GAMES.map((g) => (
          <li key={g.slug}>
            <Link
              href={`/juegos/${g.slug}`}
              className="interactive-surface game-card group flex h-full min-h-[184px] flex-col items-start gap-3 p-3.5"
            >
              <span
                className="game-glyph-tile size-13 shrink-0 rounded-[17px] transition-transform group-hover:-rotate-2 group-hover:scale-[1.04]"
                data-game={g.slug}
              >
                <GameGlyph game={g.slug} size={25} />
              </span>
              <span className="relative z-[1] flex min-w-0 flex-1 flex-col gap-1.5">
                <span className="text-11 font-bold uppercase tracking-[0.08em] text-oro">
                  {g.kind}
                </span>
                <span className="text-[17px] font-semibold leading-tight text-hueso">{g.name}</span>
                <span className="mt-auto flex items-start gap-1.5 text-11 leading-snug text-humo">
                  <Icon name="users" size={13} className="mt-0.5 shrink-0" />
                  {g.players}
                </span>
                <span className="flex items-center gap-1.5 text-11 text-humo">
                  <Icon name="clock" size={13} />
                  {g.duration}
                </span>
              </span>
              <span className="absolute right-3 top-3 grid size-7 place-items-center rounded-full bg-tinta/70 text-oro transition-transform group-hover:translate-x-0.5">
                <Icon name="arrow-right" size={14} />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
