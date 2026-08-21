// Unirse por enlace/QR: el código llega bloqueado en la URL, solo pide
// apodo. Contrato P13 / §7. Server component solo para leer el `params`
// asíncrono de Next 15; toda la interacción real vive en <JoinForm>.
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { JoinForm } from '../_components/JoinForm';

export default async function UnirseCodePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const upperCode = code.toUpperCase();

  return (
    <main className="app-page safe-page mx-auto flex min-h-dvh max-w-md flex-col gap-6 px-5">
      <Link href="/" className="glass-button w-fit px-3.5 text-14 font-semibold">
        <Icon name="arrow-left" size={17} /> Inicio
      </Link>
      <header className="flex flex-col gap-2">
        <span className="eyebrow">Te han invitado</span>
        <h1 className="font-display text-40 leading-display text-hueso">Unirse a una partida</h1>
        <p className="text-15 leading-relaxed text-humo">Elige cómo te verá el resto de la mesa.</p>
      </header>
      <JoinForm lockedCode={upperCode} />
    </main>
  );
}
