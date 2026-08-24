import type { GranRondaSpaceType } from '@ronda/protocol';

export interface GranRondaSpaceIconProps {
  type: GranRondaSpaceType;
  size?: number;
  className?: string;
}

function SpaceIconPaths({ type }: { type: GranRondaSpaceType }) {
  switch (type) {
    case 'start':
      return (
        <>
          <path d="M7 21V4" />
          <path d="M8 5h10l-2.2 3L18 11H8Z" />
        </>
      );
    case 'oros':
      return (
        <>
          <circle cx="12" cy="12" r="8" />
          <circle cx="12" cy="12" r="4.2" />
          <path d="M9.5 12h5" />
        </>
      );
    case 'perdida':
      return (
        <>
          <circle cx="12" cy="12" r="8" />
          <path d="M8 12h8" />
        </>
      );
    case 'sello':
      return (
        <>
          <path d="m12 3 2.2 2.2 3.1-.4.4 3.1L20 10l-1.5 2.8.9 3-2.9 1.1-.9 3-3-.8-2.6 1.7-1.8-2.5-3.1-.2.3-3.1-2-2.4 2-2.4-.3-3.1 3.1-.2L10 3.8Z" />
          <path d="m9 12 2 2 4-4" />
        </>
      );
    case 'evento':
      return (
        <>
          <path d="M9.3 9a3 3 0 1 1 4.5 2.6c-1.2.7-1.8 1.3-1.8 2.4" />
          <path d="M12 18v.1" />
        </>
      );
    case 'atajo':
      return (
        <>
          <path d="M5 18h4c2 0 3-1 3-3V9c0-2 1-3 3-3h4" />
          <path d="m16 3 3 3-3 3" />
        </>
      );
    case 'doble':
      return (
        <>
          <rect x="3" y="8" width="9" height="9" rx="2" />
          <rect x="12" y="4" width="9" height="9" rx="2" />
          <circle cx="7.5" cy="12.5" r=".7" fill="currentColor" stroke="none" />
          <circle cx="16.5" cy="8.5" r=".7" fill="currentColor" stroke="none" />
        </>
      );
    case 'penalizacion':
      return (
        <>
          <path d="M13.5 3 6 13h5l-.5 8L18 10h-5Z" />
          <path d="m5 5 14 14" />
        </>
      );
    case 'tienda':
      return (
        <>
          <path d="M5 9h14l-1 11H6Z" />
          <path d="M8 9V7a4 4 0 0 1 8 0v2" />
          <path d="M9 13h6" />
        </>
      );
    case 'trampa':
      return (
        <>
          <path d="M7 8 4 4c3 0 5 1 6 3M17 8l3-4c-3 0-5 1-6 3" />
          <path d="M5 13c0-5 3-8 7-8s7 3 7 8-3 8-7 8-7-3-7-8Z" />
          <path d="m8 12 3 1M16 12l-3 1" />
          <path d="M8.5 16c2.2 2 4.8 2 7 0" />
          <path d="m10 17 1 2 1-2 1 2 1-2" />
        </>
      );
  }
}

export function GranRondaSpaceIcon({ type, size = 20, className = '' }: GranRondaSpaceIconProps) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <SpaceIconPaths type={type} />
    </svg>
  );
}
