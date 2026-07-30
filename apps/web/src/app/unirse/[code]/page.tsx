// Unirse por enlace/QR: el código llega bloqueado en la URL, solo pide
// apodo. Contrato P13 / §7. Server component solo para leer el `params`
// asíncrono de Next 15; toda la interacción real vive en <JoinForm>.
import { JoinForm } from '../_components/JoinForm';

export default async function UnirseCodePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const upperCode = code.toUpperCase();

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-6 px-6 py-10">
      <h1 className="font-display text-40 leading-display text-hueso">Unirse a una partida</h1>
      <JoinForm lockedCode={upperCode} />
    </main>
  );
}
