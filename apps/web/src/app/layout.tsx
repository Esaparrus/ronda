// Layout raíz. Contrato P10 / §7 / §8.
//
// Las pilas tipográficas del sistema viven en globals.css. En iPhone/iPad
// resuelven a SF Pro; en el resto de plataformas usan el equivalente nativo.
import type { Metadata, Viewport } from 'next';
import { RegisterServiceWorker } from '@/components/RegisterServiceWorker';
import { InstallAppPrompt } from '@/components/InstallAppPrompt';
import { DiagnosticsProvider } from '@/components/DiagnosticsProvider';
import { ReportProblemButton } from '@/components/ReportProblemButton';
import { COLOR_TOKENS } from '@/lib/tokens';
import '../styles/globals.css';

export const metadata: Metadata = {
  title: { default: 'Ronda', template: '%s · Ronda' },
  description:
    'Web-app instalable para jugar a juegos de cartas en grupo. Cada móvil es tu mano privada; una tele o tablet opcional hace de tablero público.',
  applicationName: 'Ronda',
  formatDetection: { telephone: false },
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'Ronda',
    statusBarStyle: 'default',
  },
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: COLOR_TOKENS.tinta,
  colorScheme: 'light',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="bg-tinta font-sans text-hueso">
        <RegisterServiceWorker />
        <InstallAppPrompt />
        <DiagnosticsProvider />
        <ReportProblemButton />
        {children}
      </body>
    </html>
  );
}
