import type { GranRondaMiniGameId, GranRondaMiniGameOption } from '@ronda/protocol';

export interface GranRondaMiniGameDefinition {
  id: GranRondaMiniGameId;
  title: string;
  prompt: string;
  instructions: string;
  options: readonly GranRondaMiniGameOption[];
}

/**
 * Variantes cortas para el tablero. No son preguntas de cultura general: cada
 * entrada tiene una acción competitiva propia y el motor resuelve una
 * clasificación que luego se convierte en Oros.
 */
export const GRAN_RONDA_MINIGAMES: readonly GranRondaMiniGameDefinition[] = [
  {
    id: 'chinchon',
    title: 'Chinchón exprés',
    prompt: 'Roba, descarta y cierra la mano antes que los demás.',
    instructions: 'Una mano rápida del Chinchón original. La primera persona que cierra fija la clasificación.',
    options: [],
  },
  {
    id: 'pocha',
    title: 'Pocha exprés',
    prompt: 'Canta tus bazas y juega una mano corta.',
    instructions: 'Una ronda del juego original: canta y juega tus cartas hasta resolver la baza.',
    options: [],
  },
  {
    id: 'brisca',
    title: 'Brisca exprés',
    prompt: 'Juega tus cartas y gana las bazas decisivas.',
    instructions: 'Una partida corta de Brisca con la interfaz original y clasificación por tantos.',
    options: [],
  },
  {
    id: 'escoba',
    title: 'Escoba exprés',
    prompt: 'Captura cartas y consigue la mejor escoba.',
    instructions: 'Una partida corta de Escoba del 15 con las reglas del juego original.',
    options: [],
  },
  {
    id: 'sieteymedia',
    title: 'Siete y media express',
    prompt: 'Pide cartas o plántate antes de pasarte.',
    instructions: 'Empiezas con una carta privada. Acércate a 7,5 y no te pases.',
    options: [
      { id: 'draw', label: 'Pedir carta' },
      { id: 'stand', label: 'Plantarse' },
    ],
  },
  {
    id: 'musical',
    title: 'Musical: tres pulsos',
    prompt: 'Sé la primera persona en completar tres pulsos.',
    instructions: 'Pulsa el botón tres veces; la clasificación premia a quien termina antes.',
    options: [{ id: 'pulse', label: 'Marcar pulso' }],
  },
  {
    id: 'tute',
    title: 'Tute exprés',
    prompt: 'Gana bazas y suma tantos con tus cartas.',
    instructions: 'Una mano corta de Tute utilizando el tablero original.',
    options: [],
  },
  {
    id: 'cinquillo',
    title: 'Cinquillo express',
    prompt: 'Elige el palo con el que abrirías la mesa.',
    instructions: 'Una salida rápida, una decisión y una clasificación para toda la mesa.',
    options: [
      { id: 'oros', label: 'Oros' },
      { id: 'copas', label: 'Copas' },
      { id: 'espadas', label: 'Espadas' },
      { id: 'bastos', label: 'Bastos' },
    ],
  },
  {
    id: 'orden',
    title: 'Orden exprés',
    prompt: 'Juega tus números en orden sin romper la secuencia.',
    instructions: 'Una ronda cooperativa del juego original: coloca el número más bajo que tengas.',
    options: [],
  },
  {
    id: 'colores',
    title: 'Colores exprés',
    prompt: 'Acierta una pregunta de colores y gana Oros.',
    instructions: 'Una sola pregunta del juego original. Elige los colores correctos antes que el resto.',
    options: [],
  },
  {
    id: 'preciojusto',
    title: 'Precio justo exprés',
    prompt: 'Acércate al precio real del producto.',
    instructions: 'Una estimación del juego original y reparto inmediato según la distancia.',
    options: [],
  },
  {
    id: 'banderas',
    title: 'Banderas exprés',
    prompt: 'Sé la primera persona en identificar la bandera.',
    instructions: 'Una bandera, una respuesta por jugador y clasificación inmediata.',
    options: [],
  },
  {
    id: 'cifras',
    title: 'Cifras exprés',
    prompt: 'Estima, ordena o compara una cifra.',
    instructions: 'Una prueba rápida del juego original; gana quien más se acerque o acierte.',
    options: [],
  },
  {
    id: 'quienloharia',
    title: 'Quién lo haría exprés',
    prompt: 'Vota a la persona que más encaja con la situación.',
    instructions: 'Una votación competitiva y corta, con el resultado del juego original.',
    options: [],
  },
  {
    id: 'completalafrase',
    title: 'Completa la frase exprés',
    prompt: 'Completa la frase antes que el resto.',
    instructions: 'Una respuesta rápida del juego original y reparto de Oros.',
    options: [],
  },
  {
    id: 'laronda',
    title: 'La Ronda exprés',
    prompt: 'Juega una cuenta corta de La Ronda.',
    instructions: 'Una mano breve del juego original; el resultado se convierte en clasificación de Oros.',
    options: [],
  },
  {
    id: 'mayoria',
    title: 'Mayoría exprés',
    prompt: 'Escribe una respuesta y trata de coincidir con la mayoría.',
    instructions: 'Una sola pregunta del juego original. Las respuestas se agrupan y la mayoría puntúa.',
    options: [],
  },
  {
    id: 'escala',
    title: 'Escala exprés',
    prompt: 'Da una pista y coloca tu estimación en la escala.',
    instructions: 'Una sola pista, una estimación y un resultado inmediato.',
    options: [],
  },
  {
    id: 'matiz',
    title: 'Matiz exprés',
    prompt: 'Ajusta un color y acércate al objetivo oculto.',
    instructions: 'Un solo reto visual del juego original y reparto inmediato de Oros.',
    options: [],
  },
];

export function granRondaMiniGameById(id: string): GranRondaMiniGameDefinition {
  const game = GRAN_RONDA_MINIGAMES.find((candidate) => candidate.id === id);
  if (game) return game;
  const firstGame = GRAN_RONDA_MINIGAMES[0];
  if (!firstGame) throw new Error('Falta contenido de La Gran Ronda');
  return firstGame;
}

/** Chinchón necesita una baraja completa para repartir siete cartas por persona. */
export function granRondaMiniGamesForPlayerCount(
  playerCount: number,
): GranRondaMiniGameDefinition[] {
  return GRAN_RONDA_MINIGAMES.filter(
    (game) => game.id !== 'chinchon' || playerCount <= 4,
  );
}
