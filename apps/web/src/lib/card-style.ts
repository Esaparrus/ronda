import { useSyncExternalStore } from 'react';

export const CARD_STYLE_OPTIONS = [
  {
    id: 'classic',
    label: 'Clásica',
    description: 'La baraja española original',
    folder: null,
    extension: 'webp',
    renderMode: 'image',
  },
  {
    id: 'moderna',
    label: 'Minimal ilustrada',
    description: 'Figuras limpias con detalle suave',
    folder: 'moderna',
    extension: 'webp',
    renderMode: 'image',
  },
  {
    id: 'minimal-iconica',
    label: 'Minimal icónica',
    description: 'Símbolos geométricos y muy legibles',
    folder: null,
    extension: 'png',
    renderMode: 'minimal',
  },
  {
    id: 'pixel-art-moderno',
    label: 'Pixel moderno',
    description: 'Píxel grueso pensado para cartas pequeñas',
    folder: null,
    extension: 'png',
    renderMode: 'pixel',
  },
] as const;

export type CardStyle = (typeof CARD_STYLE_OPTIONS)[number]['id'];
export type CardRenderMode = (typeof CARD_STYLE_OPTIONS)[number]['renderMode'];

const STORAGE_KEY = 'ronda-card-style';
const DEFAULT_CARD_STYLE: CardStyle = 'classic';
const LEGACY_CARD_STYLE_MIGRATIONS: Readonly<Record<string, CardStyle>> = {
  'pixel-art': 'pixel-art-moderno',
  'pixel-art-final': 'pixel-art-moderno',
  'pixel-art-simple': 'pixel-art-moderno',
  'pixel-art-uniforme': 'pixel-art-moderno',
};
const listeners = new Set<() => void>();

let currentStyle: CardStyle = DEFAULT_CARD_STYLE;
let loadedFromStorage = false;

export function isCardStyle(value: unknown): value is CardStyle {
  return CARD_STYLE_OPTIONS.some((option) => option.id === value);
}

export function resolveCardStylePreference(value: unknown): CardStyle {
  if (isCardStyle(value)) return value;
  if (typeof value === 'string') {
    return LEGACY_CARD_STYLE_MIGRATIONS[value] ?? DEFAULT_CARD_STYLE;
  }
  return DEFAULT_CARD_STYLE;
}

function readStoredStyle(): CardStyle {
  if (typeof window === 'undefined') return DEFAULT_CARD_STYLE;

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return resolveCardStylePreference(stored);
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

export function cardStyleExtension(style: CardStyle): 'png' | 'webp' {
  return CARD_STYLE_OPTIONS.find((option) => option.id === style)?.extension ?? 'webp';
}

export function cardStyleRenderMode(style: CardStyle): CardRenderMode {
  return CARD_STYLE_OPTIONS.find((option) => option.id === style)?.renderMode ?? 'image';
}
