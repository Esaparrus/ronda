/**
 * Capacidades comunes entre navegador, PWA instalada y futuras builds
 * nativas. La web funciona sin Capacitor: cuando exista un bridge nativo,
 * estas funciones lo usarán y mantendrán el mismo contrato para la UI.
 */

export type AppPlatform = 'web' | 'android' | 'ios';

export interface ShareContent {
  title?: string;
  text?: string;
  url?: string;
}

export type ShareResult = 'shared' | 'cancelled' | 'unavailable';

interface CapacitorSharePlugin {
  share(content: ShareContent): Promise<unknown>;
}

interface CapacitorBridge {
  isNativePlatform?: () => boolean;
  getPlatform?: () => string;
  Plugins?: {
    Share?: CapacitorSharePlugin;
  };
}

interface NavigatorWithStandalone extends Navigator {
  standalone?: boolean;
}

interface WindowWithCapacitor extends Window {
  Capacitor?: CapacitorBridge;
}

function getCapacitor(): CapacitorBridge | undefined {
  if (typeof window === 'undefined') return undefined;
  return (window as WindowWithCapacitor).Capacitor;
}

/** Indica si la web se está ejecutando como aplicación instalada. */
export function isInstalledApp(): boolean {
  if (typeof window === 'undefined') return false;

  const standaloneMedia = window.matchMedia?.('(display-mode: standalone)').matches ?? false;
  const iosStandalone = (navigator as NavigatorWithStandalone).standalone === true;
  const nativePlatform = getCapacitor()?.isNativePlatform?.() ?? false;

  return standaloneMedia || iosStandalone || nativePlatform;
}

/** Devuelve la plataforma sin exigir que exista un runtime nativo. */
export function getAppPlatform(): AppPlatform {
  const nativePlatform = getCapacitor()?.getPlatform?.();
  const platform = nativePlatform?.toLowerCase();
  if (platform === 'android') return 'android';
  if (platform === 'ios') return 'ios';

  if (typeof navigator !== 'undefined') {
    const userAgent = navigator.userAgent.toLowerCase();
    if (/android/.test(userAgent)) return 'android';
    if (/iphone|ipad|ipod/.test(userAgent)) return 'ios';
  }

  return 'web';
}

/**
 * Comparte un enlace usando primero el bridge nativo futuro y después la
 * Web Share API. En navegadores sin ninguna de las dos devuelve unavailable.
 */
export async function shareContent(content: ShareContent): Promise<ShareResult> {
  const nativeShare = getCapacitor()?.Plugins?.Share;
  if (nativeShare) {
    try {
      await nativeShare.share(content);
      return 'shared';
    } catch {
      return 'cancelled';
    }
  }

  if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') {
    return 'unavailable';
  }

  try {
    await navigator.share(content);
    return 'shared';
  } catch {
    return 'cancelled';
  }
}
