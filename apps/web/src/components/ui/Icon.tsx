import type { SVGProps } from 'react';

export type IconName =
  | 'arrow-left'
  | 'arrow-right'
  | 'book'
  | 'cards'
  | 'check'
  | 'clock'
  | 'info'
  | 'lightbulb'
  | 'person'
  | 'play'
  | 'plus'
  | 'screen'
  | 'share'
  | 'sparkles'
  | 'target'
  | 'trash'
  | 'trophy'
  | 'users'
  | 'xmark';

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  name: IconName;
  size?: number;
}

function IconPaths({ name }: { name: IconName }) {
  switch (name) {
    case 'arrow-left':
      return (
        <>
          <path d="m10 6-6 6 6 6" />
          <path d="M5 12h15" />
        </>
      );
    case 'arrow-right':
      return (
        <>
          <path d="m14 6 6 6-6 6" />
          <path d="M4 12h15" />
        </>
      );
    case 'book':
      return (
        <>
          <path d="M4 5.8A2.8 2.8 0 0 1 6.8 3H11v16H6.8A2.8 2.8 0 0 0 4 21.8Z" />
          <path d="M20 5.8A2.8 2.8 0 0 0 17.2 3H13v16h4.2a2.8 2.8 0 0 1 2.8 2.8Z" />
        </>
      );
    case 'cards':
      return (
        <>
          <rect x="7" y="3" width="11" height="16" rx="2.5" transform="rotate(7 12.5 11)" />
          <path d="M7.4 5.4 4.7 6a2.5 2.5 0 0 0-1.9 3l2.2 9.2a2.5 2.5 0 0 0 3 1.9l5.1-1.2" />
          <path d="m12.4 9.1 1.6 1.6 1.6-1.6" />
        </>
      );
    case 'check':
      return <path d="m5 12.5 4.2 4.2L19.5 6.5" />;
    case 'clock':
      return (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3.5 2" />
        </>
      );
    case 'info':
      return (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 11v6" />
          <path d="M12 7.2v.1" />
        </>
      );
    case 'lightbulb':
      return (
        <>
          <path d="M8.2 15.2A7 7 0 1 1 15.8 15c-1.1.8-1.3 1.6-1.3 2.5h-5c0-.9-.2-1.6-1.3-2.3Z" />
          <path d="M9.5 21h5" />
        </>
      );
    case 'person':
      return (
        <>
          <circle cx="12" cy="8" r="3.5" />
          <path d="M5.5 21a6.5 6.5 0 0 1 13 0" />
        </>
      );
    case 'play':
      return <path d="m9 6 9 6-9 6Z" />;
    case 'plus':
      return (
        <>
          <path d="M12 5v14" />
          <path d="M5 12h14" />
        </>
      );
    case 'screen':
      return (
        <>
          <rect x="3" y="4" width="18" height="13" rx="2.5" />
          <path d="M9 21h6" />
          <path d="M12 17v4" />
        </>
      );
    case 'share':
      return (
        <>
          <path d="M12 15V3" />
          <path d="m8 7 4-4 4 4" />
          <path d="M6 10H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2h-1" />
        </>
      );
    case 'sparkles':
      return (
        <>
          <path d="M12 2.8c.6 4 2.3 5.7 6.2 6.2-3.9.6-5.6 2.3-6.2 6.2-.6-3.9-2.3-5.6-6.2-6.2 3.9-.5 5.6-2.2 6.2-6.2Z" />
          <path d="M19 15.2c.3 2 1.2 2.9 3.2 3.2-2 .3-2.9 1.2-3.2 3.2-.3-2-1.2-2.9-3.2-3.2 2-.3 2.9-1.2 3.2-3.2Z" />
        </>
      );
    case 'target':
      return (
        <>
          <circle cx="12" cy="12" r="8.5" />
          <circle cx="12" cy="12" r="3" />
          <path d="m14.2 9.8 6.3-6.3" />
        </>
      );
    case 'trash':
      return (
        <>
          <path d="M4 7h16" />
          <path d="M9 3h6l1 4H8Z" />
          <path d="m6.5 7 1 14h9l1-14" />
          <path d="M10 11v6M14 11v6" />
        </>
      );
    case 'trophy':
      return (
        <>
          <path d="M7 4h10v4.5a5 5 0 0 1-10 0Z" />
          <path d="M7 6H3v1.5A4.5 4.5 0 0 0 7.5 12M17 6h4v1.5a4.5 4.5 0 0 1-4.5 4.5" />
          <path d="M12 13.5V18M8 21h8M9 18h6" />
        </>
      );
    case 'users':
      return (
        <>
          <circle cx="9" cy="8" r="3" />
          <circle cx="17" cy="9" r="2.4" />
          <path d="M3 20a6 6 0 0 1 12 0M14.2 15a5 5 0 0 1 6.8 4.7" />
        </>
      );
    case 'xmark':
      return (
        <>
          <path d="m6 6 12 12" />
          <path d="M18 6 6 18" />
        </>
      );
  }
}

export function Icon({ name, size = 20, className = '', ...props }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <IconPaths name={name} />
    </svg>
  );
}
