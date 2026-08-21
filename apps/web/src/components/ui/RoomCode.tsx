// Código de sala en 4 casillas grandes monoespaciadas. Contrato P11.
// RoomCode siempre tiene 4 caracteres (contrato §2.1 / ROOM_CODE_LENGTH).
export interface RoomCodeProps {
  code: string;
  className?: string;
}

export function RoomCode({ code, className = '' }: RoomCodeProps) {
  const chars = code.split('');

  return (
    <div
      className={`flex gap-2 ${className}`}
      aria-label={`Código de sala ${code.split('').join(' ')}`}
    >
      {chars.map((char, i) => (
        <div
          key={i}
          aria-hidden="true"
          className="flex h-14 w-12 items-center justify-center rounded-2xl border border-oro/15 bg-oro/8 font-mono text-28 font-semibold text-hueso shadow-sm"
        >
          {char}
        </div>
      ))}
    </div>
  );
}
