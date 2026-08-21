'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
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
      className="liquid-glass liquid-glass--strong fixed inset-x-4 bottom-4 z-50 mx-auto flex max-w-md items-center gap-3 rounded-[24px] p-3"
      aria-label="Instalar Ronda"
    >
      <p className="min-w-0 flex-1 text-14 font-medium text-hueso">Instala Ronda como app.</p>
      <Button onClick={() => void handleInstall()} className="!min-h-11 shrink-0 !rounded-[15px] px-4">
        Instalar
      </Button>
      <button
        type="button"
        onClick={() => setInstallEvent(null)}
        aria-label="Ahora no"
        className="grid size-11 shrink-0 place-items-center rounded-full text-humo transition-colors hover:bg-tinta hover:text-hueso"
      >
        <Icon name="xmark" size={18} />
      </button>
    </aside>
  );
}
