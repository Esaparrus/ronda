import type { GameGuide as GameGuideCopy } from '@/lib/game-guides';
import { Icon } from './Icon';

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
              className="mt-2 font-display text-28 leading-display text-hueso"
            >
              {heading}
            </h2>
          </div>
          <span className="meta-chip text-oro">
            {guide.steps.length} pasos
          </span>
        </div>
      ) : null}

      <div className="surface-panel relative overflow-hidden p-5">
        <div className="relative flex gap-4">
          <span className="icon-disc h-11 w-11 shrink-0">
            <Icon name="target" size={21} />
          </span>
          <div>
            <p className="text-11 font-bold uppercase tracking-wider text-oro">El objetivo</p>
            <p className="mt-1 text-16 leading-relaxed text-hueso">{guide.objective}</p>
          </div>
        </div>
      </div>

      <ol className="flex flex-col gap-3">
        {guide.steps.map((step, index) => (
          <li key={step.title} className="interactive-surface relative flex gap-4 px-4 py-4">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-madera-clara text-15 font-bold text-oro">
              {index + 1}
            </span>
            <div className="min-w-0 pt-0.5">
              <h3 className="text-16 font-semibold text-hueso">{step.title}</h3>
              <p className="mt-1 text-14 leading-relaxed text-humo">{step.body}</p>
            </div>
          </li>
        ))}
      </ol>

      <div className="grid gap-3 min-[420px]:grid-cols-2">
        <div className="rounded-[20px] border border-verde/20 bg-verde/10 p-4">
          <p className="flex items-center gap-2 text-11 font-bold uppercase tracking-wider text-hueso">
            <Icon name="trophy" size={16} className="text-verde" /> Cómo se gana
          </p>
          <p className="mt-2 text-14 leading-relaxed text-hueso">{guide.victory}</p>
        </div>
        <div className="rounded-[20px] border border-oro/15 bg-oro/8 p-4">
          <p className="flex items-center gap-2 text-11 font-bold uppercase tracking-wider text-oro">
            <Icon name="lightbulb" size={16} /> Regla clave
          </p>
          <p className="mt-2 text-14 leading-relaxed text-hueso">{guide.keyRule}</p>
        </div>
      </div>
    </section>
  );
}
