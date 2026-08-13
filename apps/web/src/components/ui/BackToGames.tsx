import Link from 'next/link';

export function BackToGames() {
  return (
    <Link
      href="/juegos"
      className="inline-flex min-h-12 w-fit items-center rounded-xl border border-linea bg-tinta/25 px-4 text-14 font-semibold text-humo transition-[border-color,color,background-color] hover:border-oro/60 hover:bg-mesa hover:text-hueso"
    >
      ← Volver al menú
    </Link>
  );
}
