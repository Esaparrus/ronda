// Sala: lobby y partida. Contrato P14 / §2.5, §5.3, §8.4, §8.5. Server
// component solo para desenvolver el `params` asíncrono de Next 15; toda la
// interacción real vive en <SalaClient>.
import { SalaClient } from './_components/SalaClient';

export default async function SalaPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <SalaClient code={code.toUpperCase()} />;
}
