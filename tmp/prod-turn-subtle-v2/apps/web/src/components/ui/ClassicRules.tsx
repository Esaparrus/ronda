import Link from 'next/link';
import type { ClassicGameCopy } from '@/lib/classic-games';

export function ClassicRules({ game }: { game: ClassicGameCopy }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col gap-8 px-6 py-10">
      <header className="flex flex-col gap-2">
        <Link href={`/juegos/${game.slug}`} className="text-14 text-humo">← Volver</Link>
        <h1 className="font-display text-40 leading-display text-hueso">Reglas de {game.title}</h1>
        <p className="text-16 text-humo">{game.players} · {game.duration}</p>
      </header>
      <div className="flex flex-col gap-6">
        {game.sections.map((section) => (
          <section key={section.title} className="flex flex-col gap-2">
            <h2 className="text-20 font-semibold text-hueso">{section.title}</h2>
            <p className="text-16 text-hueso">{section.body}</p>
          </section>
        ))}
      </div>
      <Link href={`/crear/${game.slug}`} className="mt-auto flex min-h-14 items-center justify-center rounded-lg bg-brasa px-6 text-16 font-semibold text-hueso">
        Crear partida
      </Link>
    </main>
  );
}
