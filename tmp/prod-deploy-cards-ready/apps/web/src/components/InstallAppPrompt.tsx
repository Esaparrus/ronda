'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { isInstalledApp } from '@/lib/app-platform';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

/**
 * Ofrece la instalación de la PWA cuando el navegador la considera apta.
 * En una futura build nativa este aviso no aparece porque la app ya está
 * instalada y el mismo código de UI sigue siendo válido.
 */
export function InstallAppPrompt(): React.ReactNode {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (isInstalledApp()) return;

    const handleBeforeInstallPrompt = (event: Event): void => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    };

    const handleInstalled = (): void => setInstallEvent(null);

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  if (!installEvent) return null;

  async function handleInstall(): Promise<void> {
    const currentEvent = installEvent;
    if (!currentEvent) return;
    setInstallEvent(null);
    await currentEvent.prompt();
    await currentEvent.userChoice;
  }

  return (
    <aside
      className="fixed inset-x-4 bottom-4 z-50 mx-auto flex max-w-md items-center gap-3 rounded-lg border border-linea bg-mesa p-3 shadow-lg"
      aria-label="Instalar Ronda"
    >
      <p className="flex-1 text-14 text-hueso">Instala Ronda para abrirla como una aplicación.</p>
      <Button onClick={() => void handleInstall()} className="shrink-0 px-4">
        Instalar
      </Button>
      <button
        type="button"
        onClick={() => setInstallEvent(null)}
        className="min-h-14 shrink-0 px-2 text-14 text-humo underline"
      >
        Ahora no
      </button>
    </aside>
  );
}
