// Portada. Contrato P13 / §7: "Crear partida · Unirse · «Volver a la
// partida X» si hay token guardado". "Crear partida" pasa primero por el
// catálogo (/juegos), para que la portada siga siendo una entrada tranquila
// aunque el catálogo ya reúna muchos juegos.
//
// Contrato P17 ("volver a abrir la app horas después... con la opción de
// descartarla"): cada tarjeta de partida guardada lleva un botón
// "Descartar" que borra el token sin necesidad de entrar en la sala (por
// ejemplo, una partida de hace días que ya no interesa retomar).
'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { RondaMark } from '@/components/ui/RondaMark';
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
    <main className="app-page safe-page mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center gap-7 px-5 text-center">
      <header className="flex flex-col items-center gap-5">
        <RondaMark />
        <div className="flex flex-col gap-2.5">
          <span className="eyebrow">Juega · comparte · disfruta</span>
          <h1 className="font-display text-[52px] leading-none text-hueso">Ronda</h1>
          <p className="mx-auto max-w-sm text-[17px] leading-relaxed text-humo">
            La mesa de siempre, ahora en cada móvil. Sin cuentas, sin anuncios y sin distraeros de
            la partida.
          </p>
        </div>
      </header>

      <div className="surface-panel flex w-full flex-col gap-2 p-2">
        <Link
          href="/juegos"
          className="primary-action group flex min-h-[72px] items-center gap-3 rounded-[20px] px-4 text-left transition-[transform,filter]"
        >
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-white/15">
            <Icon name="plus" size={22} />
          </span>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="text-[17px] font-semibold">Crear partida</span>
            <span className="text-13 text-white/75">Elige un juego y monta la sala</span>
          </span>
          <Icon
            name="arrow-right"
            size={20}
            className="transition-transform group-hover:translate-x-0.5"
          />
        </Link>
        <Link
          href="/unirse"
          className="group flex min-h-[66px] items-center gap-3 rounded-[18px] px-4 text-left text-hueso transition-[background-color,transform] hover:bg-madera-clara active:scale-[0.99]"
        >
          <span className="icon-disc size-11 shrink-0">
            <Icon name="users" size={21} />
          </span>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="text-[16px] font-semibold">Unirse a una partida</span>
            <span className="text-13 text-humo">Entra con el código de la sala</span>
          </span>
          <Icon
            name="arrow-right"
            size={20}
            className="text-humo transition-transform group-hover:translate-x-0.5"
          />
        </Link>
      </div>

      {savedRooms.length > 0 ? (
        <div className="flex w-full flex-col gap-3">
          <span className="eyebrow text-left">Partidas guardadas</span>
          {savedRooms.map((code) => (
            <div key={code} className="interactive-surface flex items-center gap-2 p-2.5">
              <Link
                href={`/sala/${code}`}
                className="flex min-h-14 flex-1 items-center gap-3 rounded-2xl px-2 text-left text-16 font-semibold text-hueso"
              >
                <span className="icon-disc size-10 shrink-0">
                  <Icon name="play" size={18} />
                </span>
                <span>
                  <span className="block text-12 font-medium text-humo">Continuar partida</span>
                  <span className="font-mono tracking-wider">{code}</span>
                </span>
              </Link>
              <button
                type="button"
                onClick={() => handleDiscard(code)}
                aria-label={`Descartar la partida ${code}`}
                className="grid size-11 shrink-0 place-items-center rounded-full text-humo transition-colors hover:bg-brasa/10 hover:text-brasa"
              >
                <Icon name="trash" size={18} />
              </button>
            </div>
          ))}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-center gap-2" aria-label="Características">
        <span className="meta-chip">
          <Icon name="cards" size={14} /> 14 juegos
        </span>
        <span className="meta-chip">
          <Icon name="person" size={14} /> Sin registro
        </span>
        <span className="meta-chip">
          <Icon name="sparkles" size={14} /> Pensado para móvil
        </span>
      </div>
    </main>
  );
}
