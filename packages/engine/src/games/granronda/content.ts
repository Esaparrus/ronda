import type { GranRondaMiniGameOption } from '@ronda/protocol';

export interface GranRondaMiniGameQuestion {
  id: string;
  title: string;
  prompt: string;
  options: readonly GranRondaMiniGameOption[];
  correctOptionId: string;
}

/** Preguntas cortas y propias para el primer minijuego del tablero. */
export const GRAN_RONDA_MINIGAMES: readonly GranRondaMiniGameQuestion[] = [
  {
    id: 'suma-relampago',
    title: 'Pulso de cálculo',
    prompt: '¿Cuánto suman 7 + 8?',
    options: [
      { id: 'a', label: '13' },
      { id: 'b', label: '15' },
      { id: 'c', label: '16' },
      { id: 'd', label: '17' },
    ],
    correctOptionId: 'b',
  },
  {
    id: 'planeta-rojo',
    title: 'Pulso de planeta',
    prompt: '¿Qué planeta es conocido como el planeta rojo?',
    options: [
      { id: 'a', label: 'Venus' },
      { id: 'b', label: 'Marte' },
      { id: 'c', label: 'Júpiter' },
      { id: 'd', label: 'Saturno' },
    ],
    correctOptionId: 'b',
  },
  {
    id: 'lados-triangulo',
    title: 'Pulso de formas',
    prompt: '¿Cuántos lados tiene un triángulo?',
    options: [
      { id: 'a', label: '2' },
      { id: 'b', label: '3' },
      { id: 'c', label: '4' },
      { id: 'd', label: '5' },
    ],
    correctOptionId: 'b',
  },
  {
    id: 'animal-mamifero',
    title: 'Pulso de naturaleza',
    prompt: '¿Cuál de estos animales es un mamífero?',
    options: [
      { id: 'a', label: 'Delfín' },
      { id: 'b', label: 'Trucha' },
      { id: 'c', label: 'Lagarto' },
      { id: 'd', label: 'Águila' },
    ],
    correctOptionId: 'a',
  },
  {
    id: 'dias-semana',
    title: 'Pulso de calendario',
    prompt: '¿Cuántos días tiene una semana?',
    options: [
      { id: 'a', label: '5' },
      { id: 'b', label: '6' },
      { id: 'c', label: '7' },
      { id: 'd', label: '8' },
    ],
    correctOptionId: 'c',
  },
  {
    id: 'agua-hielo',
    title: 'Pulso de materia',
    prompt: '¿Qué ocurre con el agua al congelarse?',
    options: [
      { id: 'a', label: 'Se convierte en hielo' },
      { id: 'b', label: 'Se convierte en vapor' },
      { id: 'c', label: 'Desaparece' },
      { id: 'd', label: 'Se vuelve sal' },
    ],
    correctOptionId: 'a',
  },
  {
    id: 'continente-espana',
    title: 'Pulso de mapa',
    prompt: '¿En qué continente está España?',
    options: [
      { id: 'a', label: 'Asia' },
      { id: 'b', label: 'África' },
      { id: 'c', label: 'Europa' },
      { id: 'd', label: 'Oceanía' },
    ],
    correctOptionId: 'c',
  },
  {
    id: 'multiplicacion',
    title: 'Pulso de números',
    prompt: '¿Cuánto es 6 × 4?',
    options: [
      { id: 'a', label: '18' },
      { id: 'b', label: '20' },
      { id: 'c', label: '24' },
      { id: 'd', label: '28' },
    ],
    correctOptionId: 'c',
  },
  {
    id: 'color-mezcla',
    title: 'Pulso de color',
    prompt: '¿Qué color sale al mezclar azul y amarillo?',
    options: [
      { id: 'a', label: 'Verde' },
      { id: 'b', label: 'Morado' },
      { id: 'c', label: 'Naranja' },
      { id: 'd', label: 'Rosa' },
    ],
    correctOptionId: 'a',
  },
  {
    id: 'horas-dia',
    title: 'Pulso de tiempo',
    prompt: '¿Cuántas horas tiene un día?',
    options: [
      { id: 'a', label: '12' },
      { id: 'b', label: '18' },
      { id: 'c', label: '24' },
      { id: 'd', label: '36' },
    ],
    correctOptionId: 'c',
  },
  {
    id: 'figura-cuadrado',
    title: 'Pulso de geometría',
    prompt: '¿Cuántos lados iguales tiene un cuadrado?',
    options: [
      { id: 'a', label: '2' },
      { id: 'b', label: '3' },
      { id: 'c', label: '4' },
      { id: 'd', label: '5' },
    ],
    correctOptionId: 'c',
  },
];

export function granRondaMiniGameById(id: string): GranRondaMiniGameQuestion {
  const question = GRAN_RONDA_MINIGAMES.find((candidate) => candidate.id === id);
  if (question) return question;
  const firstQuestion = GRAN_RONDA_MINIGAMES[0];
  if (!firstQuestion) throw new Error('Falta contenido de La Gran Ronda');
  return firstQuestion;
}
