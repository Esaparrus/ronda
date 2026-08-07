import Link from 'next/link';

export function BackToGames() {
  return (
    <Link
      href="/juegos"
      className="inline-flex min-h-12 w-fit items-center rounded-lg border border-linea px-4 text-14 font-semibold text-hueso transition-opacity hover:opacity-80"
    >
      ← Volver al menú
    </Link>
  );
}
