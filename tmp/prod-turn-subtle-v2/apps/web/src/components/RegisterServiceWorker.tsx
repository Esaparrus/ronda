'use client';

// Registra public/sw.js tras la carga. Sin librerías de PWA (contrato P10).
// Falla en silencio si el navegador no soporta service workers: la app
// funciona igual, solo se pierde el precache offline del shell.
import { useEffect } from 'react';

export function RegisterServiceWorker(): null {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    let disposed = false;

    const register = async (): Promise<void> => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          updateViaCache: 'none',
        });
        if (!disposed) await registration.update();
      } catch {
        // Silencioso a propósito: ver comentario de arriba.
      }
    };

    if (document.readyState === 'complete') void register();
    else window.addEventListener('load', register, { once: true });

    return () => {
      disposed = true;
      window.removeEventListener('load', register);
    };
  }, []);

  return null;
}
