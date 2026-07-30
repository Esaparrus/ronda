// Formulario de unirse, compartido por /unirse y /unirse/[code]. Contrato
// P13: cuatro casillas + apodo, o código bloqueado + apodo si llega por
// enlace/QR. Carpeta con `_` para que Next no la trate como ruta.
'use client';

import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';
import { messageFor, ROOM_CODE_LENGTH } from '@ronda/protocol';
import { useRondaStore } from '@/lib/store';
import { isValidNick, normalizeNick } from '@/lib/nick';
import { Button } from '@/components/ui/Button';
import { RoomCode } from '@/components/ui/RoomCode';
import { RoomCodeInput } from '@/components/ui/RoomCodeInput';
import { NickLegalNote } from '@/components/ui/NickLegalNote';

export interface JoinFormProps {
  /** Si llega (enlace/QR, /unirse/[code]), el código va bloqueado. */
  lockedCode?: string;
}

export function JoinForm({ lockedCode }: JoinFormProps) {
  const router = useRouter();
  const lastError = useRondaStore((s) => s.lastError);

  const [code, setCode] = useState('');
  const [nick, setNick] = useState('');
  const [codeError, setCodeError] = useState<string | null>(null);
  const [nickError, setNickError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const effectiveCode = lockedCode ?? code;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    let hasError = false;

    if (!lockedCode && effectiveCode.length < ROOM_CODE_LENGTH) {
      setCodeError('Escribe un código de 4 caracteres.');
      hasError = true;
    } else {
      setCodeError(null);
    }

    const normalized = normalizeNick(nick);
    if (!isValidNick(normalized)) {
      setNickError(messageFor('NICK_INVALID'));
      hasError = true;
    } else {
      setNickError(null);
    }

    if (hasError) return;

    setSubmitting(true);
    const joined = await useRondaStore.getState().joinRoom(effectiveCode, normalized);
    setSubmitting(false);
    if (joined) router.push(`/sala/${effectiveCode}`);
  }

  return (
    <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
      <div className="flex flex-col gap-2">
        <span className="text-16 font-semibold text-hueso">Código de la sala</span>
        {lockedCode ? (
          <RoomCode code={lockedCode} />
        ) : (
          <>
            <RoomCodeInput value={code} onChange={setCode} />
            {codeError ? <p className="text-14 text-brasa">{codeError}</p> : null}
          </>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="nick" className="text-16 font-semibold text-hueso">
          Tu apodo
        </label>
        <input
          id="nick"
          name="nick"
          value={nick}
          onChange={(e) => setNick(e.target.value)}
          maxLength={12}
          autoComplete="off"
          className="min-h-14 rounded-lg border border-linea bg-mesa px-4 text-16 text-hueso"
          placeholder="Cómo te van a ver los demás"
        />
        <NickLegalNote />
        {nickError ? <p className="text-14 text-brasa">{nickError}</p> : null}
      </div>

      {lastError ? <p className="text-14 text-brasa">{lastError}</p> : null}

      <Button type="submit" loading={submitting}>
        Unirse a la partida
      </Button>
    </form>
  );
}
