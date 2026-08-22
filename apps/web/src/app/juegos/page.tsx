// Catálogo. Contrato P13 / §7: cada juego tiene su propia ficha
// (/juegos/chinchon, /juegos/pocha). La portada del catálogo agrupa los juegos
// por tipo para que siga siendo fácil encontrar uno cuando la colección crece.
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { GAME_CATEGORIES } from '@/lib/game-catalog';

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
            Elige una categoría y encuentra el juego perfecto para compartir la sobremesa.
          </p>
        </div>
      </header>

      <section className="flex flex-col gap-3" aria-labelledby="catalog-categories-title">
        <div className="flex items-end justify-between gap-3 px-1">
          <div className="flex flex-col gap-1">
            <span className="eyebrow">Elige cómo jugar</span>
            <h2 id="catalog-categories-title" className="text-[21px] font-semibold text-hueso">
              Explora por tipo
            </h2>
          </div>
          <span className="text-12 font-medium text-humo">{GAME_CATEGORIES.length} categorías</span>
        </div>

        <ul className="grid grid-cols-1 gap-3">
          {GAME_CATEGORIES.map((category) => (
            <li key={category.slug}>
              <Link
                href={`/juegos/categoria/${category.slug}`}
                className="interactive-surface catalog-category-card group flex min-h-[144px] items-center gap-4 p-4"
              >
                <span
                  className="game-glyph-tile size-16 shrink-0 rounded-[20px] transition-transform group-hover:-rotate-2 group-hover:scale-[1.04]"
                  data-category={category.slug}
                >
                  <Icon name={category.icon} size={29} />
                </span>
                <span className="relative z-[1] flex min-w-0 flex-1 flex-col gap-1.5">
                  <span className="text-11 font-bold uppercase tracking-[0.08em] text-oro">
                    {category.eyebrow}
                  </span>
                  <span className="text-[20px] font-semibold leading-tight text-hueso">
                    {category.title}
                  </span>
                  <span className="max-w-sm text-13 leading-snug text-humo">
                    {category.description}
                  </span>
                  <span className="mt-1 text-12 font-semibold text-oro">
                    {category.gameSlugs.length} juegos
                  </span>
                </span>
                <span className="relative z-[1] grid size-8 shrink-0 place-items-center rounded-full bg-tinta/70 text-oro transition-transform group-hover:translate-x-0.5">
                  <Icon name="arrow-right" size={15} />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
