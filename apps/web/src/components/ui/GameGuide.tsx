import type { GameGuide as GameGuideCopy } from '@/lib/game-guides';

export interface GameGuideProps {
  guide: GameGuideCopy;
  heading?: string;
  showHeading?: boolean;
}

export function GameGuide({
  guide,
  heading = 'Cómo se juega',
  showHeading = true,
}: GameGuideProps) {
  return (
    <section
      className="flex flex-col gap-4"
      aria-labelledby={showHeading ? 'game-guide-title' : undefined}
    >
      {showHeading ? (
        <div className="flex items-end justify-between gap-3">
          <div>
            <span className="eyebrow">En menos de un minuto</span>
            <h2
              id="game-guide-title"
              className="mt-2 font-display text-28 leading-display text-crema"
            >
              {heading}
            </h2>
          </div>
          <span className="rounded-full border border-oro/40 bg-oro/10 px-3 py-1 font-mono text-12 text-oro">
            {guide.steps.length} pasos
          </span>
        </div>
      ) : null}

      <div className="surface-panel relative overflow-hidden p-5">
        <div
          className="absolute -right-5 -top-6 font-display text-64 text-oro/10"
          aria-hidden="true"
        >
          ◎
        </div>
        <div className="relative flex gap-4">
          <span
            className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-oro/50 bg-tinta/45 text-20 text-oro"
            aria-hidden="true"
          >
            ◎
          </span>
          <div>
            <p className="font-mono text-12 uppercase tracking-wider text-oro">El objetivo</p>
            <p className="mt-1 text-16 leading-relaxed text-hueso">{guide.objective}</p>
          </div>
        </div>
      </div>

      <ol className="flex flex-col gap-3">
        {guide.steps.map((step, index) => (
          <li key={step.title} className="interactive-surface relative flex gap-4 px-4 py-4">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-oro/55 bg-oro/10 font-display text-20 text-oro shadow-inner">
              {index + 1}
            </span>
            <div className="min-w-0 pt-0.5">
              <h3 className="text-16 font-semibold text-crema">{step.title}</h3>
              <p className="mt-1 text-14 leading-relaxed text-humo">{step.body}</p>
            </div>
          </li>
        ))}
      </ol>

      <div className="grid gap-3 min-[420px]:grid-cols-2">
        <div className="rounded-[20px] border border-verde/70 bg-verde/15 p-4">
          <p className="font-mono text-12 uppercase tracking-wider text-crema">✓ Cómo se gana</p>
          <p className="mt-2 text-14 leading-relaxed text-hueso">{guide.victory}</p>
        </div>
        <div className="rounded-[20px] border border-oro/45 bg-oro/10 p-4">
          <p className="font-mono text-12 uppercase tracking-wider text-oro">! Regla clave</p>
          <p className="mt-2 text-14 leading-relaxed text-hueso">{guide.keyRule}</p>
        </div>
      </div>
    </section>
  );
}
