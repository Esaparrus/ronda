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
    <main className="flex min-h-dvh flex-col items-center justify-center gap-10 px-6 text-center">
      <h1 className="font-display text-40 leading-display text-hueso">Ronda</h1>

      <div className="flex w-full max-w-xs flex-col gap-3">
        <Link
          href="/juegos"
          className="flex min-h-14 items-center justify-center rounded-lg bg-brasa px-6 text-16 font-semibold text-hueso"
        >
          Crear partida
        </Link>
        <Link
          href="/unirse"
          className="flex min-h-14 items-center justify-center rounded-lg border border-linea px-6 text-16 font-semibold text-hueso"
        >
          Unirse a una partida
        </Link>
      </div>

      {savedRooms.length > 0 ? (
        <div className="flex w-full max-w-xs flex-col gap-3">
          {savedRooms.map((code) => (
            <div key={code} className="flex items-center gap-2">
              <Link
                href={`/sala/${code}`}
                className="flex min-h-14 flex-1 items-center justify-center rounded-lg border border-linea bg-mesa px-6 text-16 font-semibold text-hueso"
              >
                Volver a la partida {code}
              </Link>
              <button
                type="button"
                onClick={() => handleDiscard(code)}
                aria-label={`Descartar la partida ${code}`}
                className="flex min-h-14 min-w-14 items-center justify-center rounded-lg border border-linea text-14 text-humo"
              >
                Descartar
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </main>
  );
}
