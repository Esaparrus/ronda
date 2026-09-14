import { useSyncExternalStore } from 'react';

export const CARD_STYLE_OPTIONS = [
  {
    id: 'classic',
    label: 'Clásica',
    description: 'La baraja actual',
    folder: null,
  },
  {
    id: 'pixel-art-simple',
    label: 'Pixel art · última generación',
    description: 'La variante generada más recientemente',
    folder: 'pixel-art-simple',
  },
] as const;

export type CardStyle = (typeof CARD_STYLE_OPTIONS)[number]['id'];

const STORAGE_KEY = 'ronda-card-style';
const DEFAULT_CARD_STYLE: CardStyle = 'classic';
const listeners = new Set<() => void>();

let currentStyle: CardStyle = DEFAULT_CARD_STYLE;
let loadedFromStorage = false;

function isCardStyle(value: unknown): value is CardStyle {
  return CARD_STYLE_OPTIONS.some((option) => option.id === value);
}

function readStoredStyle(): CardStyle {
  if (typeof window === 'undefined') return DEFAULT_CARD_STYLE;

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return isCardStyle(stored) ? stored : DEFAULT_CARD_STYLE;
  } catch {
    return DEFAULT_CARD_STYLE;
  }
}

function getSnapshot(): CardStyle {
  if (!loadedFromStorage && typeof window !== 'undefined') {
    currentStyle = readStoredStyle();
    loadedFromStorage = true;
  }
  return currentStyle;
}

function getServerSnapshot(): CardStyle {
  return DEFAULT_CARD_STYLE;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setCardStyle(style: CardStyle): void {
  currentStyle = style;
  loadedFromStorage = true;

  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(STORAGE_KEY, style);
    } catch {
      // La preferencia sigue viva en memoria si el navegador bloquea storage.
    }
  }

  for (const listener of listeners) listener();
}

export function useCardStyle(): CardStyle {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function cardStyleFolder(style: CardStyle): string | null {
  return CARD_STYLE_OPTIONS.find((option) => option.id === style)?.folder ?? null;
}
