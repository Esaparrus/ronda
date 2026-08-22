import type {
  CifrasCategory,
  CifrasMode,
  FlagDifficulty,
  FlagRegion,
  SentencePack,
  WhoPack,
} from '@ronda/protocol';

/** SVGs propios y deliberadamente sencillos: no incluyen escudos ni marcas. */
function flagSvg(kind: string): string {
  const body =
    kind === 'espana'
      ? '<rect width="320" height="200" fill="#c60b1e"/><rect y="55" width="320" height="90" fill="#ffc400"/>'
      : kind === 'francia'
        ? '<rect width="107" height="200" fill="#0055a4"/><rect x="107" width="106" height="200" fill="#fff"/><rect x="213" width="107" height="200" fill="#ef4135"/>'
        : kind === 'italia'
          ? '<rect width="107" height="200" fill="#009246"/><rect x="107" width="106" height="200" fill="#fff"/><rect x="213" width="107" height="200" fill="#ce2b37"/>'
          : kind === 'alemania'
            ? '<rect width="320" height="67" fill="#111"/><rect y="67" width="320" height="66" fill="#d00"/><rect y="133" width="320" height="67" fill="#ffce00"/>'
            : kind === 'irlanda'
              ? '<rect width="107" height="200" fill="#169b62"/><rect x="107" width="106" height="200" fill="#fff"/><rect x="213" width="107" height="200" fill="#ff883e"/>'
              : kind === 'portugal'
                ? '<rect width="128" height="200" fill="#046a38"/><rect x="128" width="192" height="200" fill="#da291c"/><circle cx="128" cy="100" r="48" fill="#f8c300" stroke="#fff" stroke-width="5"/>'
                : kind === 'japon'
                  ? '<rect width="320" height="200" fill="#fff"/><circle cx="160" cy="100" r="55" fill="#bc002d"/>'
                  : kind === 'brasil'
                    ? '<rect width="320" height="200" fill="#009c3b"/><path d="M160 18 302 100 160 182 18 100Z" fill="#ffdf00"/><circle cx="160" cy="100" r="48" fill="#002776"/><path d="M119 82Q160 110 201 82" fill="none" stroke="#fff" stroke-width="8"/>'
                    : kind === 'suecia'
                      ? '<rect width="320" height="200" fill="#006aa7"/><path d="M96 0v200M0 78h320" stroke="#fecc00" stroke-width="34"/>'
                      : kind === 'noruega'
                        ? '<rect width="320" height="200" fill="#ba0c2f"/><path d="M92 0v200M0 78h320" stroke="#fff" stroke-width="42"/><path d="M92 0v200M0 78h320" stroke="#00205b" stroke-width="22"/>'
                        : kind === 'paises-bajos'
                          ? '<rect width="320" height="67" fill="#ae1c28"/><rect y="67" width="320" height="66" fill="#fff"/><rect y="133" width="320" height="67" fill="#21468b"/>'
                          : kind === 'galicia'
                            ? '<rect width="320" height="200" fill="#fff"/><path d="M-20 40 320 170" stroke="#75aadb" stroke-width="36"/>'
                            : kind === 'asturias'
                              ? '<rect width="320" height="200" fill="#0066a6"/><path d="M160 34v132M95 74h130M112 55l96 90M208 55l-96 90" stroke="#f5c400" stroke-width="13"/>'
                              : kind === 'cataluna'
                                ? '<rect width="320" height="200" fill="#f9d616"/><path d="M0 28h320M0 68h320M0 108h320M0 148h320" stroke="#c60b1e" stroke-width="17"/>'
                                : '<rect width="320" height="200" fill="#fff"/>';
  return `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 200">${body}</svg>`)}`;
}

export interface FlagOption {
  id: string;
  label: string;
}

export interface FlagQuestion {
  id: string;
  image: string;
  entityName: string;
  entityType: 'country' | 'community' | 'territory';
  region: FlagRegion;
  difficulty: FlagDifficulty;
  options: [FlagOption, FlagOption, FlagOption, FlagOption];
  correctOptionId: string;
  explanation?: string;
}

function flagQuestion(input: {
  id: string;
  name: string;
  svg: string;
  region: FlagRegion;
  difficulty?: FlagDifficulty;
  options: [string, string, string, string];
  correct: string;
  type?: 'country' | 'community' | 'territory';
  explanation?: string;
}): FlagQuestion {
  return {
    id: input.id,
    image: flagSvg(input.svg),
    entityName: input.name,
    entityType: input.type ?? 'country',
    region: input.region,
    difficulty: input.difficulty ?? 'normal',
    options: input.options.map((label) => ({ id: label.toLowerCase().replaceAll(' ', '-'), label })) as [
      FlagOption,
      FlagOption,
      FlagOption,
      FlagOption,
    ],
    correctOptionId: input.correct.toLowerCase().replaceAll(' ', '-'),
    explanation: input.explanation,
  };
}

export const FLAG_QUESTIONS: readonly FlagQuestion[] = [
  flagQuestion({ id: 'flag-es', name: 'España', svg: 'espana', region: 'europa', options: ['España', 'Portugal', 'Italia', 'Francia'], correct: 'España', explanation: 'La franja amarilla ocupa el centro y es el doble de ancha que las rojas.' }),
  flagQuestion({ id: 'flag-fr', name: 'Francia', svg: 'francia', region: 'europa', options: ['Francia', 'Italia', 'Rumanía', 'Irlanda'], correct: 'Francia' }),
  flagQuestion({ id: 'flag-it', name: 'Italia', svg: 'italia', region: 'europa', options: ['Italia', 'Francia', 'Irlanda', 'Bélgica'], correct: 'Italia', explanation: 'Se parece a Francia e Irlanda, pero su franja derecha es roja.' }),
  flagQuestion({ id: 'flag-de', name: 'Alemania', svg: 'alemania', region: 'europa', options: ['Alemania', 'Bélgica', 'Países Bajos', 'Austria'], correct: 'Alemania' }),
  flagQuestion({ id: 'flag-ie', name: 'Irlanda', svg: 'irlanda', region: 'europa', options: ['Irlanda', 'Italia', 'Costa de Marfil', 'Francia'], correct: 'Irlanda' }),
  flagQuestion({ id: 'flag-pt', name: 'Portugal', svg: 'portugal', region: 'europa', options: ['Portugal', 'España', 'Rumanía', 'Croacia'], correct: 'Portugal', difficulty: 'dificil' }),
  flagQuestion({ id: 'flag-jp', name: 'Japón', svg: 'japon', region: 'asia-oceania', options: ['Japón', 'Bangladés', 'Palaos', 'Tonga'], correct: 'Japón' }),
  flagQuestion({ id: 'flag-br', name: 'Brasil', svg: 'brasil', region: 'america', options: ['Brasil', 'Bolivia', 'Ecuador', 'Ghana'], correct: 'Brasil' }),
  flagQuestion({ id: 'flag-se', name: 'Suecia', svg: 'suecia', region: 'europa', options: ['Suecia', 'Finlandia', 'Noruega', 'Islandia'], correct: 'Suecia' }),
  flagQuestion({ id: 'flag-no', name: 'Noruega', svg: 'noruega', region: 'europa', options: ['Noruega', 'Dinamarca', 'Islandia', 'Suecia'], correct: 'Noruega', difficulty: 'dificil' }),
  flagQuestion({ id: 'flag-nl', name: 'Países Bajos', svg: 'paises-bajos', region: 'europa', options: ['Países Bajos', 'Luxemburgo', 'Rusia', 'Croacia'], correct: 'Países Bajos' }),
  flagQuestion({ id: 'flag-ga', name: 'Galicia', svg: 'galicia', region: 'espana', type: 'community', options: ['Galicia', 'Asturias', 'Cantabria', 'Castilla y León'], correct: 'Galicia' }),
  flagQuestion({ id: 'flag-as', name: 'Asturias', svg: 'asturias', region: 'espana', type: 'community', options: ['Asturias', 'Galicia', 'Cantabria', 'Navarra'], correct: 'Asturias' }),
  flagQuestion({ id: 'flag-ct', name: 'Cataluña', svg: 'cataluna', region: 'espana', type: 'community', options: ['Cataluña', 'Aragón', 'Comunidad Valenciana', 'Baleares'], correct: 'Cataluña' }),
];

function firstOrThrow<T>(items: readonly T[], fallback: readonly T[], label: string): T {
  const value = items[0] ?? fallback[0];
  if (!value) throw new Error(`${label} está vacío`);
  return value;
}

export function flagQuestionById(id: string, questions: readonly FlagQuestion[] = FLAG_QUESTIONS): FlagQuestion {
  return questions.find((question) => question.id === id) ?? firstOrThrow(questions, FLAG_QUESTIONS, 'Banderas');
}

export function flagQuestionIdsFor(
  region: FlagRegion,
  difficulty: FlagDifficulty,
  questions: readonly FlagQuestion[] = FLAG_QUESTIONS,
): string[] {
  const filtered = questions.filter(
    (question) =>
      (region === 'mundo' || question.region === region || (region === 'parecidas' && question.difficulty === 'dificil')) &&
      question.difficulty === difficulty,
  );
  const byRegion = questions.filter(
    (question) => region === 'mundo' || question.region === region || (region === 'parecidas' && question.difficulty === 'dificil'),
  );
  return (filtered.length > 0 ? filtered : byRegion.length > 0 ? byRegion : questions).map((question) => question.id);
}

export interface NumberQuestion {
  id: string;
  kind: 'estimate';
  prompt: string;
  unit: string;
  definition: string;
  category: Exclude<CifrasCategory, 'todo'>;
  referenceValue: number;
  source: string;
  updatedAt: string;
}

export interface OrderQuestion {
  id: string;
  kind: 'order';
  prompt: string;
  unit: string;
  definition: string;
  category: Exclude<CifrasCategory, 'todo'>;
  items: { id: string; label: string; value: number }[];
  direction: 'asc' | 'desc';
  source: string;
  updatedAt: string;
}

export type CifrasQuestion = NumberQuestion | OrderQuestion;

export const CIFRAS_QUESTIONS: readonly CifrasQuestion[] = [
  { id: 'altura-eiffel', kind: 'estimate', prompt: '¿Cuántos metros mide la Torre Eiffel hasta su antena?', unit: 'metros', definition: 'Altura total hasta la punta de la antena.', category: 'edificios', referenceValue: 330, source: 'Société d’Exploitation de la Tour Eiffel · ficha editorial', updatedAt: '2026-01-01' },
  { id: 'altura-burj', kind: 'estimate', prompt: '¿Cuántos metros mide el Burj Khalifa?', unit: 'metros', definition: 'Altura arquitectónica oficial hasta la punta.', category: 'edificios', referenceValue: 828, source: 'CTBUH · ficha editorial', updatedAt: '2026-01-01' },
  { id: 'madrid-barcelona', kind: 'estimate', prompt: '¿Qué distancia en línea recta hay entre Madrid y Barcelona?', unit: 'kilómetros', definition: 'Distancia geodésica entre los centros urbanos.', category: 'distancias', referenceValue: 505, source: 'Cálculo geodésico editorial de Ronda', updatedAt: '2026-01-01' },
  { id: 'superficie-espana', kind: 'estimate', prompt: '¿Qué superficie tiene España?', unit: 'km²', definition: 'Superficie territorial de España, sin aguas territoriales.', category: 'superficie', referenceValue: 505990, source: 'Instituto Geográfico Nacional · ficha editorial', updatedAt: '2026-01-01' },
  { id: 'everest', kind: 'estimate', prompt: '¿A qué altura está la cima del Everest?', unit: 'metros', definition: 'Altitud sobre el nivel medio del mar.', category: 'montanas', referenceValue: 8849, source: 'National Geographic · ficha editorial', updatedAt: '2026-01-01' },
  { id: 'profundidad-bajikal', kind: 'estimate', prompt: '¿Cuál es la profundidad máxima del lago Baikal?', unit: 'metros', definition: 'Profundidad máxima registrada del lago.', category: 'profundidad', referenceValue: 1642, source: 'UNESCO · ficha editorial', updatedAt: '2026-01-01' },
  { id: 'orden-edificios', kind: 'order', prompt: 'Ordena estas construcciones de menor a mayor altura.', unit: 'metros', definition: 'Altura arquitectónica oficial, de menor a mayor.', category: 'edificios', direction: 'asc', items: [{ id: 'guggenheim', label: 'Museo Guggenheim Bilbao', value: 32 }, { id: 'torre-pisa', label: 'Torre de Pisa', value: 57 }, { id: 'eiffel', label: 'Torre Eiffel', value: 330 }, { id: 'burj', label: 'Burj Khalifa', value: 828 }], source: 'Fichas editoriales de cada edificio', updatedAt: '2026-01-01' },
  { id: 'orden-montanas', kind: 'order', prompt: 'Ordena estas montañas de mayor a menor altitud.', unit: 'metros', definition: 'Altitud de la cima sobre el nivel del mar, de mayor a menor.', category: 'montanas', direction: 'desc', items: [{ id: 'teide', label: 'Teide', value: 3715 }, { id: 'mont-blanc', label: 'Mont Blanc', value: 4808 }, { id: 'aconcagua', label: 'Aconcagua', value: 6961 }, { id: 'everest', label: 'Everest', value: 8849 }], source: 'Fichas editoriales de cada montaña', updatedAt: '2026-01-01' },
  { id: 'orden-superficie', kind: 'order', prompt: 'Ordena estos territorios de menor a mayor superficie.', unit: 'km²', definition: 'Superficie territorial, de menor a mayor.', category: 'superficie', direction: 'asc', items: [{ id: 'mallorca', label: 'Mallorca', value: 3640 }, { id: 'canarias', label: 'Canarias', value: 7447 }, { id: 'irlanda', label: 'Irlanda', value: 70273 }, { id: 'espana', label: 'España', value: 505990 }], source: 'Instituto Geográfico Nacional · fichas editoriales', updatedAt: '2026-01-01' },
  { id: 'orden-distancias', kind: 'order', prompt: 'Ordena estas distancias entre ciudades de menor a mayor.', unit: 'kilómetros', definition: 'Distancia en línea recta entre los centros urbanos.', category: 'distancias', direction: 'asc', items: [{ id: 'madrid-toledo', label: 'Madrid — Toledo', value: 67 }, { id: 'madrid-valencia', label: 'Madrid — Valencia', value: 303 }, { id: 'madrid-barcelona', label: 'Madrid — Barcelona', value: 505 }, { id: 'madrid-roma', label: 'Madrid — Roma', value: 1363 }], source: 'Cálculo geodésico editorial de Ronda', updatedAt: '2026-01-01' },
];

export function cifrasQuestionById(id: string, questions: readonly CifrasQuestion[] = CIFRAS_QUESTIONS): CifrasQuestion {
  return questions.find((question) => question.id === id) ?? firstOrThrow(questions, CIFRAS_QUESTIONS, 'Cifras');
}

export function cifrasQuestionIdsFor(
  category: CifrasCategory,
  mode: CifrasMode,
  questions: readonly CifrasQuestion[] = CIFRAS_QUESTIONS,
): string[] {
  const filtered = questions.filter(
    (question) =>
      (category === 'todo' || question.category === category) &&
      (mode === 'mixto' || (mode === 'estimacion' ? question.kind === 'estimate' : question.kind === 'order')),
  );
  const fallback = questions.filter(
    (question) => mode === 'mixto' || (mode === 'estimacion' ? question.kind === 'estimate' : question.kind === 'order'),
  );
  return (filtered.length > 0 ? filtered : fallback.length > 0 ? fallback : questions).map((question) => question.id);
}

export interface WhoQuestion {
  id: string;
  pack: WhoPack;
  prompt: string;
}

export const WHO_QUESTIONS: readonly WhoQuestion[] = [
  { id: 'who-01', pack: 'ligero', prompt: '¿Quién sobreviviría menos tiempo en una isla desierta?' },
  { id: 'who-02', pack: 'ligero', prompt: '¿Quién se reiría en el momento menos apropiado?' },
  { id: 'who-03', pack: 'ligero', prompt: '¿Quién acabaría siendo famoso por accidente?' },
  { id: 'who-04', pack: 'ligero', prompt: '¿Quién montaría un mueble sin mirar las instrucciones?' },
  { id: 'who-05', pack: 'fiesta', prompt: '¿Quién propondría salir cuando todo el mundo ya está en pijama?' },
  { id: 'who-06', pack: 'fiesta', prompt: '¿Quién elegiría la música de toda la noche?' },
  { id: 'who-07', pack: 'fiesta', prompt: '¿Quién haría amigos en la cola del baño?' },
  { id: 'who-08', pack: 'fiesta', prompt: '¿Quién acabaría organizando el próximo plan?' },
  { id: 'who-09', pack: 'incomodo', prompt: '¿Quién tardaría más en contestar un mensaje importante?' },
  { id: 'who-10', pack: 'incomodo', prompt: '¿Quién diría “me da igual” queriendo decir lo contrario?' },
  { id: 'who-11', pack: 'incomodo', prompt: '¿Quién se acordaría de una discusión de hace cinco años?' },
  { id: 'who-12', pack: 'incomodo', prompt: '¿Quién necesitaría tener la última palabra?' },
  { id: 'who-13', pack: 'parejas', prompt: '¿Quién elegiría mejor un regalo para la otra persona?' },
  { id: 'who-14', pack: 'parejas', prompt: '¿Quién olvidaría antes una fecha especial?' },
  { id: 'who-15', pack: 'parejas', prompt: '¿Quién prepararía una sorpresa más elaborada?' },
  { id: 'who-16', pack: 'parejas', prompt: '¿Quién pediría perdón primero?' },
  { id: 'who-17', pack: 'adulto', prompt: '¿Quién se atrevería a probar una experiencia nueva primero?' },
  { id: 'who-18', pack: 'adulto', prompt: '¿Quién tendría más facilidad para romper la tensión?' },
];

export function whoQuestionById(id: string, questions: readonly WhoQuestion[] = WHO_QUESTIONS): WhoQuestion {
  return questions.find((question) => question.id === id) ?? firstOrThrow(questions, WHO_QUESTIONS, 'Quién lo haría');
}

export function whoQuestionIdsFor(pack: WhoPack, questions: readonly WhoQuestion[] = WHO_QUESTIONS): string[] {
  const filtered = questions.filter((question) => question.pack === pack);
  return (filtered.length > 0 ? filtered : questions).map((question) => question.id);
}

export interface SentenceQuestion {
  id: string;
  pack: SentencePack;
  category: 'refran' | 'expresion' | 'original';
  prompt: string;
  canonicalAnswer: string;
  acceptedAnswers: string[];
  hint?: string;
}

export const SENTENCE_QUESTIONS: readonly SentenceQuestion[] = [
  { id: 'sentence-01', pack: 'refranes', category: 'refran', prompt: 'En abril, aguas ____.', canonicalAnswer: 'mil', acceptedAnswers: ['mil'], hint: 'Es un número pequeño, pero contundente.' },
  { id: 'sentence-02', pack: 'refranes', category: 'refran', prompt: 'Más vale pájaro en mano que ciento ____.', canonicalAnswer: 'volando', acceptedAnswers: ['volando'], hint: 'Lo contrario de estar posado.' },
  { id: 'sentence-03', pack: 'refranes', category: 'refran', prompt: 'El hábito no hace al ____.', canonicalAnswer: 'monje', acceptedAnswers: ['monje'], hint: 'Una persona que viste hábito.' },
  { id: 'sentence-04', pack: 'refranes', category: 'refran', prompt: 'No hay mal que por bien no ____.', canonicalAnswer: 'venga', acceptedAnswers: ['venga'], hint: 'Termina con un verbo.' },
  { id: 'sentence-05', pack: 'refranes', category: 'refran', prompt: 'A caballo regalado no le mires el ____.', canonicalAnswer: 'diente', acceptedAnswers: ['diente', 'dientes'], hint: 'Está en la boca del caballo.' },
  { id: 'sentence-06', pack: 'refranes', category: 'refran', prompt: 'Quien mucho abarca, poco ____.', canonicalAnswer: 'aprieta', acceptedAnswers: ['aprieta'], hint: 'Lo contrario de soltar.' },
  { id: 'sentence-07', pack: 'expresiones', category: 'expresion', prompt: 'Estar entre la espada y la ____.', canonicalAnswer: 'pared', acceptedAnswers: ['pared'], hint: 'Una superficie vertical.' },
  { id: 'sentence-08', pack: 'expresiones', category: 'expresion', prompt: 'Buscarle tres pies al ____.', canonicalAnswer: 'gato', acceptedAnswers: ['gato'], hint: 'Animal doméstico.' },
  { id: 'sentence-09', pack: 'expresiones', category: 'expresion', prompt: 'Poner toda la carne en el ____.', canonicalAnswer: 'asador', acceptedAnswers: ['asador'], hint: 'Donde se cocina a la brasa.' },
  { id: 'sentence-10', pack: 'originales', category: 'original', prompt: 'Una buena sobremesa siempre necesita una historia y un buen ____.', canonicalAnswer: 'postre', acceptedAnswers: ['postre'], hint: 'Llega al final de la comida.' },
  { id: 'sentence-11', pack: 'originales', category: 'original', prompt: 'La mejor estrategia para ganar es escuchar antes de ____.', canonicalAnswer: 'jugar', acceptedAnswers: ['jugar'], hint: 'Lo que haces durante una partida.' },
  { id: 'sentence-12', pack: 'originales', category: 'original', prompt: 'Si nadie quiere llevar la cuenta, la cuenta acaba llevando a ____.', canonicalAnswer: 'todos', acceptedAnswers: ['todos', 'todo el mundo'], hint: 'No se salva ninguna persona.' },
];

export function sentenceQuestionById(id: string, questions: readonly SentenceQuestion[] = SENTENCE_QUESTIONS): SentenceQuestion {
  return questions.find((question) => question.id === id) ?? firstOrThrow(questions, SENTENCE_QUESTIONS, 'Completa la frase');
}

export function sentenceQuestionIdsFor(pack: SentencePack, questions: readonly SentenceQuestion[] = SENTENCE_QUESTIONS): string[] {
  const filtered = questions.filter((question) => question.pack === pack);
  return (filtered.length > 0 ? filtered : questions).map((question) => question.id);
}
