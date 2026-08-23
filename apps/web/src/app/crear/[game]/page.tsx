// Crear sala. Contrato P13: apodo + configuración con controles grandes.
// Ruta dinámica (antes /crear a secas, solo Chinchón): un juego u otro
// eligen su propio formulario de variantes en <CrearForm>. Server component
// solo para desenvolver el `params` asíncrono de Next 15.
import { notFound } from 'next/navigation';
import { CrearForm } from './_components/CrearForm';

const GAME_IDS = [
  'laronda',
  'chinchon',
  'pocha',
  'mus',
  'brisca',
  'escoba',
  'sieteymedia',
  'tute',
  'cinquillo',
  'orden',
  'colores',
  'mayoria',
  'escala',
  'musical',
  'matiz',
  'preciojusto',
  'banderas',
  'cifras',
  'quienloharia',
  'completalafrase',
  'granronda',
] as const;
type SupportedGameId = (typeof GAME_IDS)[number];

function isSupportedGame(g: string): g is SupportedGameId {
  return (GAME_IDS as readonly string[]).includes(g);
}

export default async function CrearGamePage({ params }: { params: Promise<{ game: string }> }) {
  const { game } = await params;
  if (!isSupportedGame(game)) notFound();
  return <CrearForm gameId={game} />;
}
