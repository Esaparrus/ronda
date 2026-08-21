import type { GameId } from '@ronda/protocol';

export interface GameGlyphProps {
  game: GameId;
  size?: number;
  className?: string;
}

function GlyphPaths({ game }: { game: GameId }) {
  switch (game) {
    case 'laronda':
      return (
        <>
          <path d="M7 3h10v18l-2.5-1.5L12 21l-2.5-1.5L7 21Z" />
          <path d="M9.5 8h5M9.5 12h3" />
          <path d="M15.8 14.2a2.4 2.4 0 1 0 0 4" />
        </>
      );
    case 'chinchon':
      return (
        <>
          <rect x="7" y="3" width="11" height="16" rx="2.5" transform="rotate(8 12.5 11)" />
          <path d="M7.4 5.2 4.7 6a2.5 2.5 0 0 0-1.8 3l2.3 9a2.5 2.5 0 0 0 3 1.8l4.8-1.3" />
          <path d="m12.5 9.2 1.6 1.7 1.6-1.7" />
        </>
      );
    case 'pocha':
    case 'brisca':
    case 'tute':
      return (
        <>
          <path d="M12 3c-1.8 3.3-6 5.2-6 9a3.5 3.5 0 0 0 6 2.4A3.5 3.5 0 0 0 18 12c0-3.8-4.2-5.7-6-9Z" />
          <path d="M12 14v7M9 21h6" />
        </>
      );
    case 'mus':
      return (
        <>
          <circle cx="8" cy="8" r="3" />
          <circle cx="16" cy="8" r="3" />
          <path d="M2.5 20a5.5 5.5 0 0 1 11 0M10.5 20a5.5 5.5 0 0 1 11 0" />
        </>
      );
    case 'escoba':
      return (
        <>
          <path d="m17.5 3-8 10" />
          <path d="m8.5 11 5 4-4.2 6H3l2.2-8.2Z" />
          <path d="m5 16 4 3M7 14l4 3" />
        </>
      );
    case 'sieteymedia':
      return (
        <>
          <path d="M12 3c.7 4.3 2.7 6.3 7 7-4.3.7-6.3 2.7-7 7-.7-4.3-2.7-6.3-7-7 4.3-.7 6.3-2.7 7-7Z" />
          <path d="M19 16c.3 1.7 1.1 2.5 2.8 2.8-1.7.3-2.5 1.1-2.8 2.8-.3-1.7-1.1-2.5-2.8-2.8 1.7-.3 2.5-1.1 2.8-2.8Z" />
        </>
      );
    case 'cinquillo':
      return (
        <>
          <rect x="3" y="4" width="7" height="7" rx="2" />
          <rect x="14" y="4" width="7" height="7" rx="2" />
          <rect x="3" y="15" width="7" height="6" rx="2" />
          <rect x="14" y="15" width="7" height="6" rx="2" />
        </>
      );
    case 'orden':
      return (
        <>
          <path d="M5 18 19 6" />
          <path d="M11 6h8v8" />
          <circle cx="6" cy="18" r="2" />
        </>
      );
    case 'colores':
      return (
        <>
          <circle cx="8" cy="8" r="4" />
          <circle cx="16" cy="8" r="4" />
          <circle cx="8" cy="16" r="4" />
          <circle cx="16" cy="16" r="4" />
        </>
      );
    case 'mayoria':
      return (
        <>
          <path d="M4 20v-6h4v6M10 20V8h4v12M16 20V3h4v17" />
          <path d="M3 20h18" />
        </>
      );
    case 'escala':
      return (
        <>
          <path d="M4 7h16M4 17h16" />
          <circle cx="9" cy="7" r="2.5" />
          <circle cx="16" cy="17" r="2.5" />
        </>
      );
    case 'musical':
      return (
        <>
          <path d="M9 18V6l10-2v11" />
          <ellipse cx="6" cy="18" rx="3" ry="2.5" />
          <ellipse cx="16" cy="15" rx="3" ry="2.5" />
        </>
      );
  }
}

export function GameGlyph({ game, size = 24, className = '' }: GameGlyphProps) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <GlyphPaths game={game} />
    </svg>
  );
}
