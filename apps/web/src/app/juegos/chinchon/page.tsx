// Ficha de Chinchón. Contrato P13 / §7: "jugadores, duración, cómo se juega".
// Movida aquí (antes vivía en /juegos) cuando el catálogo pasó a listar más
// de un juego -- ver /juegos/page.tsx.
import { GameIntro } from '@/components/ui/GameIntro';

const HOW_TO_PLAY = [
  'Cada jugador recibe siete cartas en mano.',
  'En tu turno robas una carta y descartas otra.',
  'Junta escaleras del mismo palo o grupos del mismo número.',
  'Cierra la ronda cuando te queden pocos puntos sueltos.',
  'Gana quien menos puntos acumule, o quien haga chinchón.',
];

export default function ChinchonPage() {
  return (
    <GameIntro
      slug="chinchon"
      title="Chinchón"
      kind="Clásico de cartas"
      players="2–4 jugadores"
      duration="15–30 min"
      summary="Forma escaleras y grupos, roba con cabeza y elige el momento exacto para cerrar antes que nadie."
      steps={HOW_TO_PLAY}
      rulesHref="/reglas"
      mark="7"
    />
  );
}
