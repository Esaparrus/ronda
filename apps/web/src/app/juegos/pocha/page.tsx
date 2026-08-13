// Ficha de Pocha. Mismo patrón que /juegos/chinchon (contrato P13 / §7).
import { GameIntro } from '@/components/ui/GameIntro';

const HOW_TO_PLAY = [
  'Se reparten cartas siguiendo una pirámide: 1, 2, 3... hasta un máximo, y vuelta a bajar.',
  'Se revela una carta para fijar el triunfo de la ronda.',
  'Antes de jugar, cada uno canta cuántas bazas cree que va a ganar.',
  'Jugáis las bazas por turnos: si tienes cartas del palo que sale, tienes que jugar una.',
  'Si aciertas tu cante ganas 10 + tus bazas; si fallas, no ganas puntos esa ronda.',
];

export default function PochaPage() {
  return (
    <GameIntro
      slug="pocha"
      title="Pocha"
      kind="Bazas y apuestas"
      players="2–6 jugadores"
      duration="20–45 min"
      summary="Predice cuántas bazas vas a ganar y cumple tu palabra. Aquí puntúa tanto la lectura de la mesa como la carta que juegas."
      steps={HOW_TO_PLAY}
      rulesHref="/reglas/pocha"
      mark="♠"
    />
  );
}
