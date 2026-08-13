// Unirse por enlace/QR: el código llega bloqueado en la URL, solo pide
// apodo. Contrato P13 / §7. Server component solo para leer el `params`
// asíncrono de Next 15; toda la interacción real vive en <JoinForm>.
import { JoinForm } from '../_components/JoinForm';

export default async function UnirseCodePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const upperCode = code.toUpperCase();

  return (
    <main className="app-page safe-page mx-auto flex min-h-dvh max-w-md flex-col gap-6 px-5">
      <header className="flex flex-col gap-2">
        <span className="eyebrow">Te han invitado</span>
        <h1 className="font-display text-40 leading-display text-crema">Unirse a una partida</h1>
        <p className="text-14 text-humo">Elige cómo te verá el resto de la mesa.</p>
      </header>
      <JoinForm lockedCode={upperCode} />
    </main>
  );
}
