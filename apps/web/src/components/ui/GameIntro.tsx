import Link from 'next/link';
import { BackToGames } from './BackToGames';

export interface GameIntroProps {
  slug: string;
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
  steps = [],
  note,
  rulesHref,
  mark = title.slice(0, 1),
}: GameIntroProps) {
  return (
    <main className="app-page safe-page mx-auto flex min-h-dvh max-w-md flex-col gap-7 px-5">
      <BackToGames />
      <header className="flex items-center gap-4">
        <span className="grid h-16 w-16 shrink-0 place-items-center rounded-[22px] border border-oro/60 bg-mesa font-display text-28 text-oro shadow-lg" aria-hidden="true">
          {mark}
        </span>
        <span className="flex min-w-0 flex-col gap-1">
          <span className="eyebrow">{kind}</span>
          <h1 className="font-display text-40 leading-display text-crema">{title}</h1>
          <span className="text-14 text-humo">{players} · {duration}</span>
        </span>
      </header>

      <section className="surface-panel p-5">
        <p className="text-16 leading-relaxed text-hueso">{summary}</p>
      </section>

      {steps.length > 0 ? (
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-20 font-semibold text-hueso">Cómo se juega</h2>
            <span className="font-mono text-12 uppercase tracking-wider text-humo">En un minuto</span>
          </div>
          <ol className="flex flex-col gap-2.5">
            {steps.map((line, index) => (
              <li key={line} className="interactive-surface flex gap-3 px-4 py-3 text-14 text-hueso">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-oro font-mono text-12 font-semibold text-tinta">
                  {index + 1}
                </span>
                <span className="pt-0.5 leading-relaxed">{line}</span>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {note ? <p className="rounded-2xl border border-linea bg-tinta/35 p-4 text-14 text-humo">{note}</p> : null}

      <div className="mt-auto flex flex-col gap-3 pt-2">
        <Link
          href={`/crear/${slug}`}
          className="flex min-h-14 items-center justify-center rounded-2xl border border-brasa bg-brasa px-6 text-16 font-semibold text-crema shadow-lg transition-[transform,filter] hover:brightness-110 active:translate-y-0.5"
        >
          Crear partida
        </Link>
        {rulesHref ? (
          <Link href={rulesHref} className="min-h-12 py-3 text-center text-14 text-oro underline decoration-oro/50 underline-offset-4">
            Ver las reglas completas
          </Link>
        ) : null}
      </div>
    </main>
  );
}
