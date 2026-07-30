// Cuatro casillas para escribir un código de sala. Contrato P13: "cuatro
// casillas para el código, teclado en mayúsculas". Visualmente a juego con
// RoomCode (P11), pero interactivo: cada casilla es un <input> real, con
// avance/retroceso automático entre casillas y filtrado al alfabeto sin
// ambigüedades del contrato (§2.1 / ROOM_CODE_ALPHABET, sin I/O/0/1).
'use client';

import { useRef, type ClipboardEvent, type KeyboardEvent } from 'react';
import { ROOM_CODE_ALPHABET, ROOM_CODE_LENGTH } from '@ronda/protocol';

export interface RoomCodeInputProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

const ALPHABET_SET = new Set(ROOM_CODE_ALPHABET.split(''));

function sanitizeChar(raw: string): string {
  const upper = raw.toUpperCase();
  return ALPHABET_SET.has(upper) ? upper : '';
}

export function RoomCodeInput({ value, onChange, className = '' }: RoomCodeInputProps) {
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const chars = Array.from({ length: ROOM_CODE_LENGTH }, (_, i) => value[i] ?? '');

  function setChar(index: number, char: string) {
    const next = [...chars];
    next[index] = char;
    onChange(next.join('').slice(0, ROOM_CODE_LENGTH));
  }

  function handleChange(index: number, raw: string) {
    // Puede llegar más de un carácter (pegar, autocompletar): se coge el
    // último tecleado y se avanza una casilla.
    const clean = sanitizeChar(raw.slice(-1));
    setChar(index, clean);
    if (clean && index < ROOM_CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !chars[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
      setChar(index - 1, '');
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < ROOM_CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handlePaste(index: number, e: ClipboardEvent<HTMLInputElement>) {
    const pasted = e.clipboardData.getData('text');
    if (!pasted) return;
    e.preventDefault();
    const clean = pasted
      .toUpperCase()
      .split('')
      .filter((c) => ALPHABET_SET.has(c))
      .slice(0, ROOM_CODE_LENGTH - index)
      .join('');
    if (!clean) return;
    const next = [...chars];
    for (let i = 0; i < clean.length; i++) {
      next[index + i] = clean[i] ?? '';
    }
    onChange(next.join('').slice(0, ROOM_CODE_LENGTH));
    const lastFilled = Math.min(index + clean.length, ROOM_CODE_LENGTH - 1);
    inputRefs.current[lastFilled]?.focus();
  }

  return (
    <div className={`flex gap-2 ${className}`} role="group" aria-label="Código de sala">
      {chars.map((char, i) => (
        <input
          key={i}
          ref={(el) => {
            inputRefs.current[i] = el;
          }}
          value={char}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={(e) => handlePaste(i, e)}
          inputMode="text"
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          maxLength={1}
          aria-label={`Carácter ${i + 1} de ${ROOM_CODE_LENGTH}`}
          className="h-14 w-11 rounded-lg border border-linea bg-mesa text-center font-mono text-28 font-medium uppercase text-hueso focus-visible:border-brasa"
        />
      ))}
    </div>
  );
}
