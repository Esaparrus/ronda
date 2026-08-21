import Link from 'next/link';
import type { ClassicGameCopy } from '@/lib/classic-games';
import { Icon } from './Icon';

export function ClassicRules({ game }: { game: ClassicGameCopy }) {
  return (
    <main className="app-page rules-page mx-auto flex min-h-dvh max-w-lg flex-col gap-6 px-5">
      <header className="flex flex-col gap-2">
        <Link href={`/juegos/${game.slug}`} className="glass-button mb-3 w-fit px-3.5 text-14 font-semibold">
          <Icon name="arrow-left" size={17} /> {game.title}
        </Link>
        <span className="eyebrow">Guía completa</span>
        <h1 className="font-display text-40 leading-display text-hueso">Reglas de {game.title}</h1>
        <p className="text-16 text-humo">{game.players} · {game.duration}</p>
      </header>
      <div className="flex flex-col gap-3">
        {game.sections.map((section, index) => (
          <section key={section.title} className="rules-section flex flex-col gap-2">
            <span className="text-11 font-bold uppercase tracking-wider text-oro">
              {String(index + 1).padStart(2, '0')}
            </span>
            <h2 className="text-20 font-semibold text-hueso">{section.title}</h2>
            <p className="text-15 leading-relaxed text-hueso">{section.body}</p>
          </section>
        ))}
      </div>
      <Link href={`/crear/${game.slug}`} className="primary-action mt-auto flex min-h-14 items-center justify-center gap-2 rounded-[18px] px-6 text-16 font-semibold text-white">
        <Icon name="plus" size={18} /> Crear partida
      </Link>
    </main>
  );
}
