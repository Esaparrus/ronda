// Listado de juegos dentro de una categoría. Las fichas individuales siguen
// viviendo en /juegos/<slug>, así que esta ruta solo organiza el catálogo.
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { GameGlyph } from '@/components/ui/GameGlyph';
import { Icon } from '@/components/ui/Icon';
import { findGameCategory, GAME_CATEGORIES, getGamesForCategory } from '@/lib/game-catalog';

export function generateStaticParams() {
  return GAME_CATEGORIES.map(({ slug }) => ({ category: slug }));
}

export default async function CategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category: categorySlug } = await params;
  const category = findGameCategory(categorySlug);

  if (!category) notFound();

  const games = getGamesForCategory(category);

  return (
    <main className="app-page safe-page mx-auto flex min-h-dvh max-w-lg flex-col gap-6 px-5">
      <header className="flex flex-col gap-3">
        <Link href="/juegos" className="glass-button w-fit px-3.5 text-14 font-semibold">
          <Icon name="arrow-left" size={17} />
          Categorías
        </Link>
        <div className="mt-1 flex flex-col gap-2">
          <span className="eyebrow">{category.eyebrow}</span>
          <h1 className="font-display text-40 leading-display text-hueso">{category.title}</h1>
          <p className="max-w-sm text-15 leading-relaxed text-humo">{category.description}</p>
        </div>
      </header>

      <section className="flex flex-col gap-3" aria-labelledby="category-games-title">
        <div className="flex items-end justify-between gap-3 px-1">
          <h2 id="category-games-title" className="text-[21px] font-semibold text-hueso">
            Elige un juego
          </h2>
          <span className="text-12 font-medium text-humo">
            {games.length} {games.length === 1 ? 'juego' : 'juegos'}
          </span>
        </div>

        <ul className="grid grid-cols-2 gap-3">
          {games.map((game) => (
            <li key={game.slug}>
              <Link
                href={`/juegos/${game.slug}`}
                className="interactive-surface game-card group flex h-full min-h-[184px] flex-col items-start gap-3 p-3.5"
              >
                <span
                  className="game-glyph-tile size-13 shrink-0 rounded-[17px] transition-transform group-hover:-rotate-2 group-hover:scale-[1.04]"
                  data-game={game.slug}
                >
                  <GameGlyph game={game.slug} size={25} />
                </span>
                <span className="relative z-[1] flex min-w-0 flex-1 flex-col gap-1.5">
                  <span className="text-11 font-bold uppercase tracking-[0.08em] text-oro">
                    {game.kind}
                  </span>
                  <span className="text-[17px] font-semibold leading-tight text-hueso">
                    {game.name}
                  </span>
                  <span className="mt-auto flex items-start gap-1.5 text-11 leading-snug text-humo">
                    <Icon name="users" size={13} className="mt-0.5 shrink-0" />
                    {game.players}
                  </span>
                  <span className="flex items-center gap-1.5 text-11 text-humo">
                    <Icon name="clock" size={13} />
                    {game.duration}
                  </span>
                </span>
                <span className="absolute right-3 top-3 grid size-7 place-items-center rounded-full bg-tinta/70 text-oro transition-transform group-hover:translate-x-0.5">
                  <Icon name="arrow-right" size={14} />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
