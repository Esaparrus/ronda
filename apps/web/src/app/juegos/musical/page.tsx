import Link from 'next/link';
import { BackToGames } from '@/components/ui/BackToGames';
import { GameGuide } from '@/components/ui/GameGuide';
import { GAME_GUIDES } from '@/lib/game-guides';

export default function MusicalPage() {
  const guide = GAME_GUIDES.musical;

  return (
    <main className="app-page safe-page mx-auto flex min-h-dvh max-w-md flex-col gap-7 px-5">
      <BackToGames />
      <header className="flex items-center gap-4">
        <span className="hero-mark h-[74px] w-[74px] shrink-0 text-32" aria-hidden="true">
          ♪
        </span>
        <span className="flex min-w-0 flex-col gap-1">
          <span className="eyebrow">Música y oído</span>
          <h1 className="font-display text-40 leading-display text-crema">Musical</h1>
          <span className="flex flex-wrap gap-2 pt-1 text-12 text-humo">
            <span className="rounded-full border border-linea bg-tinta/30 px-2.5 py-1">1–8 jugadores</span>
            <span className="rounded-full border border-linea bg-tinta/30 px-2.5 py-1">10–25 min</span>
          </span>
        </span>
      </header>

      <section className="surface-panel p-5">
        <p className="text-16 leading-relaxed text-hueso">
          Escucha un fragmento, reconoce artista y canción, y gana más puntos si lo sabes antes
          de que suenen los 20 segundos.
        </p>
      </section>

      <GameGuide guide={guide} />

      <section className="flex flex-col gap-3">
        <Link
          href="/juegos/musical/solo"
          className="interactive-surface flex min-h-20 flex-col justify-center gap-1 border-brasa bg-brasa/20 px-5"
        >
          <span className="text-16 font-semibold text-crema">Jugar solo</span>
          <span className="text-13 text-humo">Prepara canciones y juega a tu ritmo.</span>
        </Link>
        <Link
          href="/crear/musical"
          className="interactive-surface flex min-h-20 flex-col justify-center gap-1 px-5"
        >
          <span className="text-16 font-semibold text-hueso">Crear sala online</span>
          <span className="text-13 text-humo">El anfitrión elige la música y la mesa compite.</span>
        </Link>
      </section>

      <p className="rounded-2xl border border-linea bg-tinta/35 p-4 text-14 text-humo">
        Las previews se reproducen desde iTunes y llevan su enlace de tienda y atribución.
      </p>
    </main>
  );
}
