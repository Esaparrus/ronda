/** Contenido inicial propio de los modos sociales. */

import type { ColorQuestionCategory } from '@ronda/protocol';
import { COLOR_QUESTIONS } from './color-questions.ts';

export interface ColorQuestion {
  id: string;
  prompt: string;
  category: ColorQuestionCategory;
  allowMultiple: boolean;
  correctColors: string[];
}

export interface MajorityQuestion {
  id: string;
  prompt: string;
}

export interface ScaleQuestion {
  id: string;
  leftLabel: string;
  rightLabel: string;
}

export const COLOR_NAMES = [
  'rojo',
  'azul',
  'verde',
  'amarillo',
  'naranja',
  'morado',
  'rosa',
  'negro',
  'blanco',
  'marrón',
  'gris',
] as const;

export type ColorRgb = readonly [number, number, number];

/** Coordenadas sencillas para puntuar colores cercanos, no solo aciertos exactos. */
export const COLOR_SPECS: Record<string, ColorRgb> = {
  rojo: [220, 38, 38],
  azul: [37, 99, 235],
  verde: [22, 163, 74],
  amarillo: [234, 179, 8],
  naranja: [234, 88, 12],
  morado: [126, 34, 206],
  rosa: [236, 72, 153],
  negro: [20, 20, 24],
  blanco: [245, 245, 245],
  'marr\u00f3n': [145, 92, 55],
  gris: [128, 128, 128],
};

export function colorDistance(first: string, second: string): number {
  const a = COLOR_SPECS[first];
  const b = COLOR_SPECS[second];
  if (!a || !b) return 1;
  const distance = Math.sqrt(
    ((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2) / 3,
  );
  return Math.min(1, distance / 255);
}

export { COLOR_QUESTIONS };

export const MAJORITY_QUESTIONS: readonly MajorityQuestion[] = [
  { id: 'salsa', prompt: 'Nombra una salsa.' },
  { id: 'helado', prompt: 'Nombra un sabor de helado.' },
  { id: 'desayuno', prompt: 'Nombra algo típico de un desayuno.' },
  { id: 'superpoder', prompt: 'Nombra un superpoder.' },
  { id: 'animal', prompt: 'Nombra un animal que no querrías ver en casa.' },
  { id: 'viaje', prompt: 'Nombra algo imprescindible para un viaje.' },
  { id: 'pelicula', prompt: 'Nombra una película que casi todo el mundo conozca.' },
  { id: 'app', prompt: 'Nombra una aplicación que use casi todo el mundo.' },
  { id: 'pizza', prompt: 'Nombra un ingrediente de pizza.' },
  { id: 'playa', prompt: 'Nombra algo que llevas a la playa.' },
  { id: 'excusa', prompt: 'Nombra una excusa típica para llegar tarde.' },
  { id: 'fiesta', prompt: 'Nombra algo que nunca debería faltar en una fiesta.' },
  { id: 'serie', prompt: 'Nombra una serie que recomendarías.' },
  { id: 'deporte', prompt: 'Nombra un deporte que se pueda jugar con una pelota.' },
  { id: 'ruido', prompt: 'Nombra un ruido que moleste mucho.' },
  { id: 'bar', prompt: 'Nombra algo que pedirías en un bar.' },
  { id: 'regalo', prompt: 'Nombra un regalo que casi siempre funciona.' },
  { id: 'domingo', prompt: 'Nombra un plan típico de domingo.' },
  { id: 'miedo', prompt: 'Nombra algo que dé miedo en una casa vacía.' },
  { id: 'color', prompt: 'Nombra un color que elegirías para pintar una habitación.' },
  { id: 'sopa', prompt: 'Nombra una sopa.' },
  { id: 'fruta', prompt: 'Nombra una fruta que se coma mucho.' },
  { id: 'verdura', prompt: 'Nombra una verdura que no guste a todo el mundo.' },
  { id: 'bocadillo', prompt: 'Nombra un ingrediente de bocadillo.' },
  { id: 'tapa', prompt: 'Nombra una tapa típica de bar.' },
  { id: 'despensa', prompt: 'Nombra algo que siempre debería haber en una despensa.' },
  { id: 'cena-rapida', prompt: 'Nombra una cena rápida.' },
  { id: 'comida-cine', prompt: 'Nombra algo que se come en el cine.' },
  { id: 'salsa-picante', prompt: 'Nombra una salsa picante.' },
  { id: 'postre', prompt: 'Nombra un postre clásico.' },
  { id: 'bebida-fria', prompt: 'Nombra una bebida fría.' },
  { id: 'bebida-caliente', prompt: 'Nombra una bebida caliente.' },
  { id: 'fruta-desayuno', prompt: 'Nombra una fruta de desayuno.' },
  { id: 'comida-domingo', prompt: 'Nombra una comida típica de domingo.' },
  { id: 'comida-playa', prompt: 'Nombra algo fácil de llevar a la playa para comer.' },
  { id: 'ingrediente-tortilla', prompt: 'Nombra un ingrediente de tortilla.' },
  { id: 'pizza-rara', prompt: 'Nombra un ingrediente de pizza que genere discusión.' },
  { id: 'sabor-helado', prompt: 'Nombra un sabor de helado que nunca falla.' },
  { id: 'desayuno-hotel', prompt: 'Nombra algo que buscas en un desayuno de hotel.' },
  { id: 'comida-viaje', prompt: 'Nombra una comida cómoda para un viaje.' },
  { id: 'plan-noche', prompt: 'Nombra un plan para una noche sin sueño.' },
  { id: 'plan-lluvia', prompt: 'Nombra un plan para un día de lluvia.' },
  { id: 'plan-verano', prompt: 'Nombra un plan típico de verano.' },
  { id: 'plan-primera-cita', prompt: 'Nombra un plan para una primera cita.' },
  { id: 'plan-barato', prompt: 'Nombra un plan que cueste poco dinero.' },
  { id: 'plan-grupo', prompt: 'Nombra un plan para una cuadrilla.' },
  { id: 'plan-domingo', prompt: 'Nombra un plan para un domingo por la tarde.' },
  { id: 'plan-sorpresa', prompt: 'Nombra un plan sorpresa.' },
  { id: 'plan-vacaciones', prompt: 'Nombra un plan típico de vacaciones.' },
  { id: 'plan-sin-movil', prompt: 'Nombra algo que se pueda hacer sin móvil.' },
  { id: 'plan-una-hora', prompt: 'Nombra un plan que dure una hora.' },
  { id: 'plan-casa', prompt: 'Nombra algo divertido que se pueda hacer en casa.' },
  { id: 'plan-nieve', prompt: 'Nombra un plan para un día de nieve.' },
  { id: 'plan-mañana', prompt: 'Nombra un plan para una mañana libre.' },
  { id: 'plan-despues-trabajo', prompt: 'Nombra un plan después de trabajar.' },
  { id: 'maleta', prompt: 'Nombra algo que no puede faltar en una maleta.' },
  { id: 'destino', prompt: 'Nombra un destino de vacaciones.' },
  { id: 'transporte', prompt: 'Nombra un medio de transporte para viajar.' },
  { id: 'recuerdo-viaje', prompt: 'Nombra algo que se compra como recuerdo de un viaje.' },
  { id: 'foto-viaje', prompt: 'Nombra algo que se fotografía durante un viaje.' },
  { id: 'hotel', prompt: 'Nombra algo que esperas encontrar en un hotel.' },
  { id: 'viaje-amigos', prompt: 'Nombra un destino para viajar con amigos.' },
  { id: 'viaje-coche', prompt: 'Nombra algo imprescindible en un viaje en coche.' },
  { id: 'viaje-largo', prompt: 'Nombra una forma de pasar un viaje largo.' },
  { id: 'playa-viaje', prompt: 'Nombra algo que llevas a la playa.' },
  { id: 'montaña-viaje', prompt: 'Nombra algo que llevas a la montaña.' },
  { id: 'idioma-viaje', prompt: 'Nombra un idioma útil para viajar.' },
  { id: 'pelicula-risas', prompt: 'Nombra una película que haga reír.' },
  { id: 'pelicula-miedo', prompt: 'Nombra una película de miedo.' },
  { id: 'personaje-ficcion', prompt: 'Nombra un personaje de ficción conocido.' },
  { id: 'superheroe', prompt: 'Nombra un superhéroe.' },
  { id: 'villano', prompt: 'Nombra un villano famoso.' },
  { id: 'cancion-fiesta', prompt: 'Nombra una canción que funcione en una fiesta.' },
  { id: 'instrumento', prompt: 'Nombra un instrumento musical.' },
  { id: 'serie-corta', prompt: 'Nombra una serie que se pueda ver rápido.' },
  { id: 'juego-mesa', prompt: 'Nombra un juego de mesa.' },
  { id: 'videojuego', prompt: 'Nombra un videojuego conocido.' },
  { id: 'deporte-ver', prompt: 'Nombra un deporte que sea entretenido de ver.' },
  { id: 'animal-peligroso', prompt: 'Nombra un animal peligroso.' },
  { id: 'animal-grande', prompt: 'Nombra un animal muy grande.' },
  { id: 'animal-rapido', prompt: 'Nombra un animal rápido.' },
  { id: 'animal-mar', prompt: 'Nombra un animal del mar.' },
  { id: 'animal-granja', prompt: 'Nombra un animal de granja.' },
  { id: 'superpoder-util', prompt: 'Nombra un superpoder útil en la vida diaria.' },
  { id: 'objeto-perdido', prompt: 'Nombra algo que se pierde con facilidad.' },
  { id: 'sonido-molesto', prompt: 'Nombra un sonido muy molesto.' },
  { id: 'olor', prompt: 'Nombra un olor que reconozca todo el mundo.' },
  { id: 'excusa-no-salir', prompt: 'Nombra una excusa típica para no salir.' },
  { id: 'excusa-tarde', prompt: 'Nombra una excusa para llegar tarde.' },
  { id: 'regalo-facil', prompt: 'Nombra un regalo fácil de acertar.' },
  { id: 'regalo-malo', prompt: 'Nombra un regalo que puede salir mal.' },
  { id: 'compra-impulso', prompt: 'Nombra algo que se compra por impulso.' },
  { id: 'objeto-cajon', prompt: 'Nombra algo que suele vivir en un cajón.' },
  { id: 'objeto-mochila', prompt: 'Nombra algo que suele estar en una mochila.' },
  { id: 'cosa-domingo', prompt: 'Nombra algo que se hace mucho los domingos.' },
  { id: 'cosa-noche', prompt: 'Nombra algo que se hace antes de dormir.' },
  { id: 'cosa-manana', prompt: 'Nombra algo que se hace al despertarse.' },
  { id: 'frase-bar', prompt: 'Nombra una frase típica de bar.' },
  { id: 'sonido-casa', prompt: 'Nombra un sonido típico de una casa.' },
  { id: 'lugar-esperar', prompt: 'Nombra un lugar donde toca esperar.' },
  { id: 'lugar-primera-cita', prompt: 'Nombra un lugar típico para una primera cita.' },
  { id: 'lugar-perderse', prompt: 'Nombra un lugar donde es fácil perderse.' },
  { id: 'lugar-relajarse', prompt: 'Nombra un lugar donde apetece relajarse.' },
  { id: 'lugar-fiesta', prompt: 'Nombra un lugar donde se pueda montar una fiesta.' },
  { id: 'cosa-cara', prompt: 'Nombra algo que suele ser caro.' },
  { id: 'cosa-barata', prompt: 'Nombra algo que suele ser barato.' },
  { id: 'algo-innecesario', prompt: 'Nombra algo que se compra aunque no haga falta.' },
  { id: 'algo-imprescindible', prompt: 'Nombra algo que parece imprescindible.' },
  { id: 'pregunta-cuadrilla', prompt: 'Nombra algo que una cuadrilla siempre acaba discutiendo.' },
  { id: 'plan-cuadrilla', prompt: 'Nombra un plan que casi siempre acepta una cuadrilla.' },
  { id: 'comida-cuadrilla', prompt: 'Nombra una comida fácil para una cuadrilla.' },
  { id: 'bar-cuadrilla', prompt: 'Nombra algo que se pide al llegar a un bar con amigos.' },
  { id: 'viaje-cuadrilla', prompt: 'Nombra un problema típico al viajar en grupo.' },
  { id: 'frase-amigos', prompt: 'Nombra una frase que se diga entre amigos.' },
  { id: 'secreto-amigos', prompt: 'Nombra algo que los amigos suelen saber de ti.' },
  { id: 'foto-amigos', prompt: 'Nombra una foto típica de un grupo de amigos.' },
  { id: 'discusion-amigos', prompt: 'Nombra un tema absurdo por el que se puede discutir con amigos.' },
  { id: 'juego-cuadrilla', prompt: 'Nombra un juego que funcione bien con una cuadrilla.' },
];

export const SCALE_QUESTIONS: readonly ScaleQuestion[] = [
  { id: 'frio-caliente', leftLabel: 'frío', rightLabel: 'caliente' },
  { id: 'aburrido-divertido', leftLabel: 'aburrido', rightLabel: 'divertido' },
  { id: 'barato-caro', leftLabel: 'barato', rightLabel: 'caro' },
  { id: 'casero-lujoso', leftLabel: 'casero', rightLabel: 'lujoso' },
  { id: 'facil-dificil', leftLabel: 'fácil', rightLabel: 'difícil' },
  { id: 'silencioso-ruidoso', leftLabel: 'silencioso', rightLabel: 'ruidoso' },
  { id: 'normal-raro', leftLabel: 'normal', rightLabel: 'raro' },
  { id: 'pequeno-grande', leftLabel: 'pequeño', rightLabel: 'grande' },
  { id: 'sano-insano', leftLabel: 'sano', rightLabel: 'insano' },
  { id: 'formal-informal', leftLabel: 'formal', rightLabel: 'informal' },
  { id: 'planazo-planhorrible', leftLabel: 'planazo', rightLabel: 'plan horrible' },
  { id: 'pronto-tarde', leftLabel: 'muy pronto', rightLabel: 'demasiado tarde' },
  { id: 'campo-ciudad', leftLabel: 'campo', rightLabel: 'ciudad' },
  { id: 'dulce-salado', leftLabel: 'dulce', rightLabel: 'salado' },
  { id: 'serio-gracioso', leftLabel: 'serio', rightLabel: 'gracioso' },
  { id: 'cerca-lejos', leftLabel: 'cerca', rightLabel: 'lejos' },
  { id: 'util-inutil', leftLabel: 'útil', rightLabel: 'inútil' },
  { id: 'sutil-exagerado', leftLabel: 'sutil', rightLabel: 'exagerado' },
  { id: 'relajado-intenso', leftLabel: 'relajado', rightLabel: 'intenso' },
  { id: 'cotidiano-absurdo', leftLabel: 'cotidiano', rightLabel: 'absurdo' },
  { id: 'sucio-limpio', leftLabel: 'sucio', rightLabel: 'limpio' },
  { id: 'feo-bonito', leftLabel: 'feo', rightLabel: 'bonito' },
  { id: 'lento-rapido', leftLabel: 'lento', rightLabel: 'rápido' },
  { id: 'peor-mejor', leftLabel: 'peor', rightLabel: 'mejor' },
  { id: 'triste-feliz', leftLabel: 'triste', rightLabel: 'feliz' },
  { id: 'pequeno-enorme', leftLabel: 'pequeño', rightLabel: 'enorme' },
  { id: 'ligero-pesado', leftLabel: 'ligero', rightLabel: 'pesado' },
  { id: 'seco-mojado', leftLabel: 'seco', rightLabel: 'mojado' },
  { id: 'duro-blando', leftLabel: 'duro', rightLabel: 'blando' },
  { id: 'viejo-nuevo', leftLabel: 'viejo', rightLabel: 'nuevo' },
  { id: 'simple-complejo', leftLabel: 'simple', rightLabel: 'complejo' },
  { id: 'seguro-peligroso', leftLabel: 'seguro', rightLabel: 'peligroso' },
  { id: 'publico-privado', leftLabel: 'público', rightLabel: 'privado' },
  { id: 'urbano-rural', leftLabel: 'urbano', rightLabel: 'rural' },
  { id: 'sereno-caotico', leftLabel: 'sereno', rightLabel: 'caótico' },
  { id: 'predecible-impredecible', leftLabel: 'predecible', rightLabel: 'impredecible' },
  { id: 'popular-de-culto', leftLabel: 'popular', rightLabel: 'de culto' },
  { id: 'clasico-moderno', leftLabel: 'clásico', rightLabel: 'moderno' },
  { id: 'realista-fantastico', leftLabel: 'realista', rightLabel: 'fantástico' },
  { id: 'discreto-llamativo', leftLabel: 'discreto', rightLabel: 'llamativo' },
  { id: 'ligero-intenso', leftLabel: 'ligero', rightLabel: 'intenso' },
  { id: 'casual-elegante', leftLabel: 'casual', rightLabel: 'elegante' },
  { id: 'basico-premium', leftLabel: 'básico', rightLabel: 'premium' },
  { id: 'bar-deportivo-gourmet', leftLabel: 'bar deportivo', rightLabel: 'restaurante gourmet' },
  { id: 'desayuno-cena', leftLabel: 'desayuno', rightLabel: 'cena' },
  { id: 'aperitivo-postre', leftLabel: 'aperitivo', rightLabel: 'postre' },
  { id: 'dulce-amargo', leftLabel: 'dulce', rightLabel: 'amargo' },
  { id: 'crujiente-cremoso', leftLabel: 'crujiente', rightLabel: 'cremoso' },
  { id: 'suave-picante', leftLabel: 'suave', rightLabel: 'picante' },
  { id: 'fruta-verdura', leftLabel: 'fruta', rightLabel: 'verdura' },
  { id: 'casero-industrial', leftLabel: 'casero', rightLabel: 'industrial' },
  { id: 'tradicional-experimental', leftLabel: 'tradicional', rightLabel: 'experimental' },
  { id: 'sano-capricho', leftLabel: 'muy sano', rightLabel: 'capricho total' },
  { id: 'cafe-te', leftLabel: 'café', rightLabel: 'té' },
  { id: 'pasta-arroz', leftLabel: 'pasta', rightLabel: 'arroz' },
  { id: 'playa-montana', leftLabel: 'playa', rightLabel: 'montaña' },
  { id: 'hotel-camping', leftLabel: 'hotel', rightLabel: 'camping' },
  { id: 'tren-coche', leftLabel: 'tren', rightLabel: 'coche' },
  { id: 'viaje-planificado-improvisado', leftLabel: 'planificado', rightLabel: 'improvisado' },
  { id: 'maleta-vacia-llena', leftLabel: 'maleta minimalista', rightLabel: 'maleta imposible de cerrar' },
  { id: 'paseo-aventura', leftLabel: 'paseo tranquilo', rightLabel: 'aventura' },
  { id: 'domingo-lunes', leftLabel: 'domingo', rightLabel: 'lunes' },
  { id: 'madrugar-trasnochar', leftLabel: 'madrugar', rightLabel: 'trasnochar' },
  { id: 'quedarse-salir', leftLabel: 'quedarse en casa', rightLabel: 'salir' },
  { id: 'silencio-musica', leftLabel: 'silencio', rightLabel: 'música alta' },
  { id: 'llamada-mensaje', leftLabel: 'llamada', rightLabel: 'mensaje' },
  { id: 'foto-video', leftLabel: 'foto', rightLabel: 'vídeo' },
  { id: 'serie-pelicula', leftLabel: 'serie', rightLabel: 'película' },
  { id: 'comedia-drama', leftLabel: 'comedia', rightLabel: 'drama' },
  { id: 'misterio-terror', leftLabel: 'misterio', rightLabel: 'terror' },
  { id: 'juego-suerte-habilidad', leftLabel: 'suerte', rightLabel: 'habilidad' },
  { id: 'competitivo-cooperativo', leftLabel: 'competitivo', rightLabel: 'cooperativo' },
  { id: 'facil-adictivo', leftLabel: 'fácil de empezar', rightLabel: 'difícil de soltar' },
  { id: 'risa-verguenza', leftLabel: 'risa', rightLabel: 'vergüenza' },
  { id: 'normal-absurdo', leftLabel: 'normal', rightLabel: 'absurdo' },
  { id: 'logico-absurdo', leftLabel: 'lógico', rightLabel: 'absurdo' },
  { id: 'buena-idea-mala-idea', leftLabel: 'buena idea', rightLabel: 'mala idea' },
  { id: 'plan-seguro-locura', leftLabel: 'plan seguro', rightLabel: 'locura total' },
  { id: 'poco-mucho', leftLabel: 'un poco', rightLabel: 'demasiado' },
  { id: 'pronto-tarde-extremo', leftLabel: 'demasiado pronto', rightLabel: 'demasiado tarde' },
  { id: 'cerca-lejos-extremo', leftLabel: 'aquí al lado', rightLabel: 'en la otra punta' },
  { id: 'barato-carissimo', leftLabel: 'barato', rightLabel: 'carísimo' },
  { id: 'cinco-cien', leftLabel: '5 euros', rightLabel: '100 euros' },
  { id: 'poco-ruido-mucho-ruido', leftLabel: 'silencio total', rightLabel: 'ruido total' },
  { id: 'sorpresa-obvio', leftLabel: 'sorpresa', rightLabel: 'era obvio' },
  { id: 'amistoso-hostil', leftLabel: 'amistoso', rightLabel: 'hostil' },
];

export function colorQuestionById(id: string): ColorQuestion {
  return COLOR_QUESTIONS.find((q) => q.id === id) ?? {
    id: 'color-fallback',
    prompt: '¿De qué color es?',
    category: 'cultura',
    allowMultiple: false,
    correctColors: ['rojo'],
  };
}

export function majorityQuestionById(id: string): MajorityQuestion {
  return MAJORITY_QUESTIONS.find((q) => q.id === id) ?? {
    id: 'majority-fallback',
    prompt: 'Nombra algo.',
  };
}

export function scaleQuestionById(id: string): ScaleQuestion {
  return SCALE_QUESTIONS.find((q) => q.id === id) ?? {
    id: 'scale-fallback',
    leftLabel: 'poco',
    rightLabel: 'mucho',
  };
}
