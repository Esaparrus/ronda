// Avatar de jugador: inicial sobre el color de su asiento. Contrato P11 /
// §8.1 (colores de asiento: brasa, azul, verde, oro para colorIndex 0..3).
export type SeatColorIndex = 0 | 1 | 2 | 3;

export interface AvatarProps {
  /** Nombre del jugador; se muestra solo su primera letra, en mayúscula. */
  name: string;
  colorIndex: SeatColorIndex;
  size?: number;
  className?: string;
}

const SEAT_COLOR_VAR: Record<SeatColorIndex, string> = {
  0: 'var(--seat-0)',
  1: 'var(--seat-1)',
  2: 'var(--seat-2)',
  3: 'var(--seat-3)',
};

export function Avatar({ name, colorIndex, size = 40, className = '' }: AvatarProps) {
  const initial = name.trim().charAt(0).toUpperCase() || '?';

  return (
    <div
      role="img"
      aria-label={name}
      className={`flex shrink-0 items-center justify-center rounded-full font-display font-bold text-hueso ${className}`}
      style={{
        width: size,
        height: size,
        backgroundColor: SEAT_COLOR_VAR[colorIndex],
        fontSize: size * 0.4,
      }}
    >
      {initial}
    </div>
  );
}
