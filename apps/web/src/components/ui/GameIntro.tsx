import Link from 'next/link';
import type { GameId } from '@ronda/protocol';
import { GAME_GUIDES } from '@/lib/game-guides';
import { BackToGames } from './BackToGames';
import { GameGuide } from './GameGuide';

export interface GameIntroProps {
  slug: GameId;
  title: string;
  kind: string;
  players: string;
  duration: string;
  summary: string;
  steps?: readonly string[];
  note?: string;
  rulesHref?: string;
  mark?: string;
}

export function GameIntro({
  slug,
  title,
  kind,
  players,
  duration,
  summary,
  note,
  rulesHref,
  mark = title.slice(0, 1),
}: GameIntroProps) {
  const guide = GAME_GUIDES[slug];

  return (
    <main className="app-page safe-page mx-auto flex min-h-dvh max-w-md flex-col gap-7 px-5">
      <BackToGames />
      <header className="flex items-center gap-4">
        <span className="hero-mark h-[74px] w-[74px] shrink-0 text-32" aria-hidden="true">
          {mark}
        </span>
        <span className="flex min-w-0 flex-col gap-1">
          <span className="eyebrow">{kind}</span>
          <h1 className="font-display text-40 leading-display text-crema">{title}</h1>
          <span className="flex flex-wrap gap-2 pt-1 text-12 text-humo">
            <span className="rounded-full border border-linea bg-tinta/30 px-2.5 py-1">
              {players}
            </span>
            <span className="rounded-full border border-linea bg-tinta/30 px-2.5 py-1">
              {duration}
            </span>
          </span>
        </span>
      </header>

      <section className="surface-panel p-5">
        <p className="text-16 leading-relaxed text-hueso">{summary}</p>
      </section>

      <GameGuide guide={guide} />

      {note ? (
        <p className="rounded-2xl border border-linea bg-tinta/35 p-4 text-14 text-humo">{note}</p>
      ) : null}

      <div className="mt-auto flex flex-col gap-3 pt-2">
        <Link
          href={`/crear/${slug}`}
          className="flex min-h-14 items-center justify-center rounded-2xl border border-brasa bg-brasa px-6 text-16 font-semibold text-crema shadow-lg transition-[transform,filter] hover:brightness-110 active:translate-y-0.5"
        >
          Crear partida
        </Link>
        {rulesHref ? (
          <Link
            href={rulesHref}
            className="min-h-12 py-3 text-center text-14 text-oro underline decoration-oro/50 underline-offset-4"
          >
            Ver las reglas completas
          </Link>
        ) : null}
      </div>
    </main>
  );
}
