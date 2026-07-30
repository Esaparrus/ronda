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
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-8 px-6 text-center">
      <h1 className="font-display text-40 leading-display text-hueso">Pantalla central</h1>
      <p className="text-16 text-humo">Escribe el código de la sala para mostrarla aquí.</p>
      <form className="flex flex-col items-center gap-4" onSubmit={handleSubmit}>
        <RoomCodeInput value={code} onChange={setCode} />
        {error ? <p className="text-14 text-brasa">{error}</p> : null}
        <Button type="submit">Mostrar sala</Button>
      </form>
    </main>
  );
}
