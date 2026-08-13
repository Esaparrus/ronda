// Portada. Contrato P13 / §7: "Crear partida · Unirse · «Volver a la
// partida X» si hay token guardado". "Crear partida" pasa primero por el
// catálogo (/juegos): hoy solo hay Chinchón, pero esa ficha es la pantalla
// del contrato pensada para elegir juego, así que la portada no se la salta.
//
// Contrato P17 ("volver a abrir la app horas después... con la opción de
// descartarla"): cada tarjeta de partida guardada lleva un botón
// "Descartar" que borra el token sin necesidad de entrar en la sala (por
// ejemplo, una partida de hace días que ya no interesa retomar).
'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { clearToken, listSavedRooms } from '@/lib/token';

export default function Page() {
  const [savedRooms, setSavedRooms] = useState<string[]>([]);

  useEffect(() => {
    // localStorage solo existe en el navegador: se lee tras montar, para no
    // desincronizar el HTML del servidor con el del cliente.
    setSavedRooms(listSavedRooms());
  }, []);

  function handleDiscard(code: string) {
    clearToken(code);
    setSavedRooms((rooms) => rooms.filter((c) => c !== code));
  }

  return (
    <main className="app-page safe-page mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center gap-8 px-5 text-center">
      <header className="flex flex-col items-center gap-4">
        <div className="hero-mark" aria-hidden="true">R</div>
        <div className="flex flex-col gap-2">
          <span className="eyebrow">La baraja de siempre, en cada móvil</span>
          <h1 className="font-display text-40 leading-display text-crema">Ronda</h1>
          <p className="mx-auto max-w-xs text-16 text-humo">
            Montad la mesa en segundos y jugad mirándoos a la cara.
          </p>
        </div>
      </header>

      <div className="surface-panel flex w-full flex-col gap-3 p-3">
        <Link
          href="/juegos"
          className="flex min-h-14 items-center justify-center rounded-2xl border border-brasa bg-brasa px-6 text-16 font-semibold text-crema shadow-lg transition-[transform,filter] hover:brightness-110 active:translate-y-0.5"
        >
          Crear partida
        </Link>
        <Link
          href="/unirse"
          className="flex min-h-14 items-center justify-center rounded-2xl border border-linea bg-tinta/35 px-6 text-16 font-semibold text-hueso transition-[transform,border-color,background-color] hover:border-oro/60 hover:bg-mesa active:translate-y-0.5"
        >
          Unirse a una partida
        </Link>
      </div>

      {savedRooms.length > 0 ? (
        <div className="flex w-full flex-col gap-3">
          <span className="eyebrow text-left">Partidas guardadas</span>
          {savedRooms.map((code) => (
            <div key={code} className="interactive-surface flex items-center gap-2 p-2">
              <Link
                href={`/sala/${code}`}
                className="flex min-h-14 flex-1 items-center justify-start rounded-xl px-4 text-left text-16 font-semibold text-hueso"
              >
                Volver a la partida {code}
              </Link>
              <button
                type="button"
                onClick={() => handleDiscard(code)}
                aria-label={`Descartar la partida ${code}`}
                className="flex min-h-12 items-center justify-center rounded-xl border border-linea px-3 text-12 text-humo hover:border-brasa hover:text-hueso"
              >
                Descartar
              </button>
            </div>
          ))}
        </div>
      ) : null}

      <p className="font-mono text-12 uppercase tracking-wider text-humo">
        7 juegos · sin descargar · pensado para móvil
      </p>
    </main>
  );
}
