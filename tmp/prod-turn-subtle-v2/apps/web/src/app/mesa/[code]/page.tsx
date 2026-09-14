// Pantalla central: tele o tablet, horizontal, sin interacción salvo entrar.
// Contrato P15 / §2.5 (TableView), §8.4. Server component solo para
// desenvolver el `params` asíncrono de Next 15; toda la interacción real
// vive en <MesaClient>.
import { MesaClient } from './_components/MesaClient';

export default async function MesaCodePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <MesaClient code={code.toUpperCase()} />;
}
