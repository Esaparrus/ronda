import Link from 'next/link';
import type { GameId } from '@ronda/protocol';
import { GAME_GUIDES } from '@/lib/game-guides';
import { BackToGames } from './BackToGames';
import { GameGlyph } from './GameGlyph';
import { GameGuide } from './GameGuide';
import { Icon } from './Icon';

export interface GameIntroAction {
  href: string;
  label: string;
  description?: string;
}

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
  primaryAction?: GameIntroAction;
  secondaryAction?: GameIntroAction;
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
  primaryAction,
  secondaryAction,
}: GameIntroProps) {
  const guide = GAME_GUIDES[slug];
  const mainAction = primaryAction ?? { href: `/crear/${slug}`, label: 'Crear partida' };

  return (
    <main className="app-page safe-page mx-auto flex min-h-dvh max-w-md flex-col gap-7 px-5">
      <BackToGames />
      <header className="flex items-center gap-4">
        <span
          className="game-glyph-tile size-[74px] shrink-0 rounded-[23px]"
          data-game={slug}
        >
          <GameGlyph game={slug} size={34} />
        </span>
        <span className="flex min-w-0 flex-col gap-1">
          <span className="eyebrow">{kind}</span>
          <h1 className="font-display text-40 leading-display text-hueso">{title}</h1>
          <span className="flex flex-wrap gap-1.5 pt-1 text-12 text-humo">
            <span className="meta-chip !min-h-7 !px-2.5">
              <Icon name="users" size={13} />
              {players}
            </span>
            <span className="meta-chip !min-h-7 !px-2.5">
              <Icon name="clock" size={13} />
              {duration}
            </span>
          </span>
        </span>
      </header>

      <section className="surface-panel flex gap-3 p-5">
        <span className="icon-disc size-10 shrink-0">
          <Icon name="info" size={18} />
        </span>
        <p className="pt-0.5 text-16 leading-relaxed text-hueso">{summary}</p>
      </section>

      <GameGuide guide={guide} />

      {note ? (
        <p className="rounded-[20px] border border-linea/70 bg-mesa/70 p-4 text-14 leading-relaxed text-humo">
          {note}
        </p>
      ) : null}

      <div className="mt-auto flex flex-col gap-3 pt-2">
        <Link
          href={mainAction.href}
          className="primary-action group flex min-h-[68px] items-center gap-3 rounded-[20px] px-5 transition-[transform,filter]"
        >
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-white/15">
            <Icon name={primaryAction ? 'play' : 'plus'} size={18} />
          </span>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="text-16 font-semibold text-white">{mainAction.label}</span>
            {mainAction.description ? (
              <span className="text-13 text-white/75">{mainAction.description}</span>
            ) : null}
          </span>
          <Icon name="arrow-right" size={18} className="transition-transform group-hover:translate-x-0.5" />
        </Link>
        {secondaryAction ? (
          <Link
            href={secondaryAction.href}
            className="interactive-surface group flex min-h-20 items-center gap-3 px-5"
          >
            <span className="icon-disc size-9 shrink-0">
              <Icon name="users" size={18} />
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="text-16 font-semibold text-hueso">{secondaryAction.label}</span>
              {secondaryAction.description ? (
                <span className="text-13 text-humo">{secondaryAction.description}</span>
              ) : null}
            </span>
            <Icon name="arrow-right" size={18} className="text-humo transition-transform group-hover:translate-x-0.5" />
          </Link>
        ) : null}
        {rulesHref ? (
          <Link
            href={rulesHref}
            className="glass-button min-h-12 px-4 text-14 font-semibold text-oro"
          >
            <Icon name="book" size={17} />
            Ver las reglas completas
          </Link>
        ) : null}
      </div>
    </main>
  );
}
