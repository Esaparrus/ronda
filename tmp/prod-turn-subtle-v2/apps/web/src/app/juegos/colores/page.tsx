import { GameIntro } from '@/components/ui/GameIntro';

const HOW_TO_PLAY = [
  'Cada pregunta indica cuántos colores exactos tienes que elegir en secreto.',
  'Cuando la primera persona bloquea su respuesta, las demás tienen 15 segundos.',
  'Se revelan todas a la vez. Una combinación incompleta o con un color de más cuenta como fallo.',
  'Quien acierta gana 1 punto por cada rival que falla. Si todos aciertan, se acumula un punto de bote para la siguiente pregunta.',
];

export default function ColoresPage() {
  return (
    <GameIntro
      slug="colores"
      title="Colores"
      kind="Social"
      players="2–7 jugadores"
      duration="15–25 min"
      summary="Todas las respuestas están delante de ti: once colores. El reto es recordar cuál o cuáles describen exactamente cada personaje, bandera, logotipo u objeto."
      steps={HOW_TO_PLAY}
      note="Gana quien llegue primero al objetivo de puntos. Si nadie acierta una pregunta, nadie puntúa y cualquier bote acumulado se pierde."
      mark="●"
    />
  );
}
