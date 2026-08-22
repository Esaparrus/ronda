'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { BackToGames } from '@/components/ui/BackToGames';
import { Button } from '@/components/ui/Button';
import { MatizChallengeSelector } from './MatizChallengeSelector';
import {
  allMatizChallengeIds,
  readMatizEnabledChallengeIds,
  writeMatizEnabledChallengeIds,
} from '@/lib/matiz-catalog';

export function MatizCatalogManager() {
  const [selectedIds, setSelectedIds] = useState<string[]>(() => allMatizChallengeIds());
  const [loaded, setLoaded] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSelectedIds(readMatizEnabledChallengeIds());
    setLoaded(true);
    setSaved(true);
  }, []);

  function changeSelection(ids: string[]) {
    setSelectedIds(ids);
    setSaved(false);
  }

  function saveSelection() {
    writeMatizEnabledChallengeIds(selectedIds);
    setSaved(true);
  }

  return (
    <main className="app-page safe-page mx-auto flex min-h-dvh max-w-md flex-col gap-6 px-5">
      <BackToGames />
      <header className="flex flex-col gap-2">
        <span className="eyebrow">Configuración de Matiz</span>
        <h1 className="font-display text-40 leading-display text-hueso">Elegir imágenes</h1>
        <p className="text-15 leading-relaxed text-humo">
          Revisa el catálogo, desactiva los dibujos que no te parezcan fieles y guarda tu selección.
          Se aplicará a tus partidas individuales en este navegador.
        </p>
      </header>

      <div className="rounded-2xl border border-oro/30 bg-oro/10 p-4 text-13 leading-relaxed text-humo">
        <p className="font-semibold text-hueso">Cómo saber de dónde sale cada imagen</p>
        <p className="mt-1">
          Cada tarjeta tiene un enlace «Ver origen». Las imágenes se descargaron, se limpiaron y se
          guardaron localmente; el juego no depende de Google ni carga imágenes externas durante una
          partida.
        </p>
      </div>

      <MatizChallengeSelector selectedIds={selectedIds} onChange={changeSelection} />

      <div className="sticky bottom-4 z-10 flex flex-col gap-2 rounded-2xl border border-linea bg-mesa/95 p-3 shadow-xl backdrop-blur">
        <Button type="button" onClick={saveSelection} disabled={!loaded || saved}>
          {saved ? 'Selección guardada' : 'Guardar selección'}
        </Button>
        <p className="text-center text-12 text-humo">
          {saved
            ? 'Tus partidas individuales usarán solo las imágenes activas.'
            : 'Guarda los cambios para aplicarlos a la próxima partida individual.'}
        </p>
      </div>

      <div className="flex flex-col gap-2 pb-4">
        <Link href="/crear/matiz" className="glass-button min-h-12 justify-center px-4 text-14 font-semibold text-oro">
          Crear partida en grupo
        </Link>
        <Link href="/juegos/matiz/preparar" className="text-center text-13 text-humo underline underline-offset-2">
          Preparar una imagen propia
        </Link>
      </div>
    </main>
  );
}
