// Pantalla central sin código en la ruta: lo pide y navega a /mesa/[code].
// Contrato P15 ("Al entrar, pide el código si no viene en la ruta"). Sin
// apodo, sin token: una pantalla no es un jugador.
'use client';

import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';
import { ROOM_CODE_LENGTH } from '@ronda/protocol';
import { Button } from '@/components/ui/Button';
import { RoomCodeInput } from '@/components/ui/RoomCodeInput';

export default function MesaPage() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (code.length < ROOM_CODE_LENGTH) {
      setError('Escribe un código de 4 caracteres.');
      return;
    }
    router.push(`/mesa/${code}`);
  }

  return (
    <main className="app-page safe-page mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-7 px-5 text-center">
      <div className="hero-mark" aria-hidden="true">M</div>
      <header className="flex flex-col gap-2">
        <span className="eyebrow">Modo tablero</span>
        <h1 className="font-display text-40 leading-display text-crema">Pantalla central</h1>
        <p className="text-16 text-humo">Convierte una tablet o tele en la mesa compartida.</p>
      </header>
      <form className="surface-panel flex w-full flex-col items-center gap-4 p-5" onSubmit={handleSubmit}>
        <p className="text-14 text-humo">Escribe el código de la sala</p>
        <RoomCodeInput value={code} onChange={setCode} />
        {error ? <p className="text-14 text-brasa">{error}</p> : null}
        <Button type="submit" className="w-full">Mostrar sala</Button>
      </form>
    </main>
  );
}
