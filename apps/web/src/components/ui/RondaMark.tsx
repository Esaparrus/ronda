export interface RondaMarkProps {
  className?: string;
  compact?: boolean;
}

export function RondaMark({ className = '', compact = false }: RondaMarkProps) {
  return (
    <span
      className={`ronda-app-icon ${compact ? 'ronda-app-icon--compact' : ''} ${className}`}
      aria-hidden="true"
    >
      <svg viewBox="0 0 88 88" fill="none">
        <rect x="25" y="16" width="37" height="52" rx="9" transform="rotate(-10 25 16)" />
        <rect x="31" y="18" width="37" height="52" rx="9" transform="rotate(8 31 18)" />
        <path d="M44 34c3.8-5.3 12.1-1.6 9.6 4.6-1.3 3.2-5.7 5.8-9.6 9.2-3.9-3.4-8.3-6-9.6-9.2C31.9 32.4 40.2 28.7 44 34Z" />
      </svg>
    </span>
  );
}
