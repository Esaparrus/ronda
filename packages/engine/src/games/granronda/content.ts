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
];

export function granRondaMiniGameById(id: string): GranRondaMiniGameDefinition {
  const game = GRAN_RONDA_MINIGAMES.find((candidate) => candidate.id === id);
  if (game) return game;
  const firstGame = GRAN_RONDA_MINIGAMES[0];
  if (!firstGame) throw new Error('Falta contenido de La Gran Ronda');
  return firstGame;
}
