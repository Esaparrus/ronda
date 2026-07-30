// Layout raíz. Contrato P10 / §7 / §8.
//
// Fuentes vía next/font/google (self-hosted, sin llamada externa en runtime):
// Familjen Grotesk 700 (display), IBM Plex Sans 400/600 (cuerpo), IBM Plex
// Mono 500 (datos y puntuación). Cada una expone su variable CSS, que
// globals.css mapea a --font-display / --font-sans / --font-mono.
import type { Metadata, Viewport } from 'next';
import { Familjen_Grotesk, IBM_Plex_Mono, IBM_Plex_Sans } from 'next/font/google';
import { RegisterServiceWorker } from '@/components/RegisterServiceWorker';
import { COLOR_TOKENS } from '@/lib/tokens';
import '../styles/globals.css';

const familjenGrotesk = Familjen_Grotesk({
  subsets: ['latin'],
  weight: '700',
  variable: '--font-familjen-grotesk',
  display: 'swap',
});

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '600'],
  variable: '--font-ibm-plex-sans',
  display: 'swap',
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: '500',
  variable: '--font-ibm-plex-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Ronda',
  description:
    'Web-app instalable para jugar a juegos de cartas en grupo. Cada móvil es tu mano privada; una tele o tablet opcional hace de tablero público.',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: COLOR_TOKENS.tinta,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="es"
      className={`${familjenGrotesk.variable} ${ibmPlexSans.variable} ${ibmPlexMono.variable}`}
    >
      <body className="bg-tinta font-sans text-hueso">
        <RegisterServiceWorker />
        {children}
      </body>
    </html>
  );
}
