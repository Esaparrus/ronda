'use client';

// Registra public/sw.js tras la carga. Sin librerías de PWA (contrato P10).
// Falla en silencio si el navegador no soporta service workers: la app
// funciona igual, solo se pierde el precache offline del shell.
import { useEffect } from 'react';

export function RegisterServiceWorker(): null {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const register = (): void => {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // Silencioso a propósito: ver comentario de arriba.
      });
    };

    window.addEventListener('load', register);
    return () => window.removeEventListener('load', register);
  }, []);

  return null;
}
