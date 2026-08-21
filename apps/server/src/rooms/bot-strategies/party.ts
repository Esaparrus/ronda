import { COLOR_NAMES, colorQuestionById } from '@ronda/engine';
import type { GameAction, PartyPlayerView } from '@ronda/protocol';
import { stableHash } from './shared.ts';

const MAJORITY_ANSWERS: Readonly<Record<string, readonly string[]>> = {
  salsa: ['mayonesa', 'kétchup'],
  helado: ['chocolate', 'vainilla'],
  desayuno: ['café', 'tostadas'],
  superpoder: ['volar', 'invisibilidad'],
  animal: ['araña', 'serpiente'],
  viaje: ['móvil', 'pasaporte'],
  pelicula: ['Titanic', 'El rey león'],
  app: ['WhatsApp', 'Instagram'],
  pizza: ['queso', 'tomate'],
  playa: ['toalla', 'crema solar'],
  excusa: ['había tráfico', 'me he dormido'],
  fiesta: ['música', 'bebida'],
  serie: ['Breaking Bad', 'La casa de papel'],
  deporte: ['fútbol', 'baloncesto'],
  ruido: ['una alarma', 'un taladro'],
  bar: ['una cerveza', 'un café'],
  regalo: ['dinero', 'un perfume'],
  domingo: ['sofá y película', 'comer en familia'],
  miedo: ['un ruido', 'la oscuridad'],
  color: ['blanco', 'azul'],
  sopa: ['sopa de pollo', 'sopa de fideos'],
  fruta: ['plátano', 'manzana'],
  verdura: ['brócoli', 'coliflor'],
  bocadillo: ['jamón', 'queso'],
  tapa: ['tortilla', 'patatas bravas'],
  despensa: ['arroz', 'pasta'],
  'cena-rapida': ['pizza', 'tortilla'],
  'comida-cine': ['palomitas', 'chucherías'],
  'salsa-picante': ['tabasco', 'sriracha'],
  postre: ['flan', 'tarta'],
  'bebida-fria': ['agua', 'cerveza'],
  'bebida-caliente': ['café', 'té'],
  'fruta-desayuno': ['plátano', 'naranja'],
  'comida-domingo': ['paella', 'asado'],
  'comida-playa': ['bocadillo', 'fruta'],
  'ingrediente-tortilla': ['patata', 'huevo'],
  'pizza-rara': ['piña', 'anchoas'],
  'sabor-helado': ['chocolate', 'vainilla'],
  'desayuno-hotel': ['café', 'bollería'],
  'comida-viaje': ['bocadillo', 'fruta'],
  'plan-noche': ['ver una serie', 'salir de fiesta'],
  'plan-lluvia': ['ver una película', 'juegos de mesa'],
  'plan-verano': ['ir a la playa', 'viajar'],
  'plan-primera-cita': ['tomar algo', 'cenar'],
  'plan-barato': ['dar un paseo', 'quedar en casa'],
  'plan-grupo': ['cenar', 'ir de bares'],
  'plan-domingo': ['sofá y película', 'dar un paseo'],
  'plan-sorpresa': ['una escapada', 'una cena'],
  'plan-vacaciones': ['ir a la playa', 'viajar'],
  'plan-sin-movil': ['leer', 'dar un paseo'],
  'plan-una-hora': ['dar un paseo', 'tomar un café'],
  'plan-casa': ['juegos de mesa', 'ver una película'],
  'plan-nieve': ['hacer un muñeco', 'esquiar'],
  'plan-mañana': ['desayunar fuera', 'dar un paseo'],
  'plan-despues-trabajo': ['tomar algo', 'ir al gimnasio'],
  maleta: ['ropa', 'cepillo de dientes'],
  destino: ['París', 'el Caribe'],
  transporte: ['avión', 'coche'],
  'recuerdo-viaje': ['un imán', 'una postal'],
  'foto-viaje': ['un monumento', 'el paisaje'],
  hotel: ['una cama', 'wifi'],
  'viaje-amigos': ['Ibiza', 'Ámsterdam'],
  'viaje-coche': ['agua', 'música'],
  'viaje-largo': ['dormir', 'ver una película'],
  'playa-viaje': ['toalla', 'crema solar'],
  'montaña-viaje': ['agua', 'botas'],
  'idioma-viaje': ['inglés', 'español'],
  'pelicula-risas': ['Resacón en Las Vegas', 'Shrek'],
  'pelicula-miedo': ['El exorcista', 'It'],
  'personaje-ficcion': ['Harry Potter', 'Batman'],
  superheroe: ['Spider-Man', 'Batman'],
  villano: ['Joker', 'Darth Vader'],
  'cancion-fiesta': ['Despacito', 'La gasolina'],
  instrumento: ['guitarra', 'piano'],
  'serie-corta': ['Chernobyl', 'Fleabag'],
  'juego-mesa': ['Monopoly', 'Parchís'],
  videojuego: ['Mario Bros', 'Minecraft'],
  'deporte-ver': ['fútbol', 'baloncesto'],
  'animal-peligroso': ['león', 'tiburón'],
  'animal-grande': ['elefante', 'ballena'],
  'animal-rapido': ['guepardo', 'halcón'],
  'animal-mar': ['delfín', 'tiburón'],
  'animal-granja': ['vaca', 'gallina'],
  'superpoder-util': ['teletransporte', 'volar'],
  'objeto-perdido': ['las llaves', 'el móvil'],
  'sonido-molesto': ['una alarma', 'un taladro'],
  olor: ['café', 'gasolina'],
  'excusa-no-salir': ['estoy cansado', 'me encuentro mal'],
  'excusa-tarde': ['había tráfico', 'me he dormido'],
  'regalo-facil': ['dinero', 'una tarjeta regalo'],
  'regalo-malo': ['ropa', 'un perfume'],
  'compra-impulso': ['ropa', 'comida'],
  'objeto-cajon': ['pilas', 'bolígrafos'],
  'objeto-mochila': ['una botella de agua', 'el móvil'],
  'cosa-domingo': ['dormir', 'comer en familia'],
  'cosa-noche': ['lavarse los dientes', 'mirar el móvil'],
  'cosa-manana': ['mirar el móvil', 'tomar café'],
  'frase-bar': ['otra ronda', 'ponme una cerveza'],
  'sonido-casa': ['la televisión', 'una puerta'],
  'lugar-esperar': ['el médico', 'una estación'],
  'lugar-primera-cita': ['un bar', 'un restaurante'],
  'lugar-perderse': ['un centro comercial', 'una ciudad'],
  'lugar-relajarse': ['la playa', 'el sofá'],
  'lugar-fiesta': ['una casa', 'una discoteca'],
  'cosa-cara': ['una casa', 'un coche'],
  'cosa-barata': ['el pan', 'un café'],
  'algo-innecesario': ['ropa', 'otro móvil'],
  'algo-imprescindible': ['el móvil', 'internet'],
  'pregunta-cuadrilla': ['dónde cenar', 'qué plan hacer'],
  'plan-cuadrilla': ['ir de bares', 'cenar'],
  'comida-cuadrilla': ['pizza', 'barbacoa'],
  'bar-cuadrilla': ['una ronda de cervezas', 'unas tapas'],
  'viaje-cuadrilla': ['ponerse de acuerdo', 'llegar tarde'],
  'frase-amigos': ['una y nos vamos', 'te lo dije'],
  'secreto-amigos': ['quién te gusta', 'tus manías'],
  'foto-amigos': ['un selfie', 'una foto de fiesta'],
  'discusion-amigos': ['dónde cenar', 'quién conduce'],
  'juego-cuadrilla': ['UNO', 'Pictionary'],
};

function colorAnswer(view: Extract<PartyPlayerView, { gameId: 'colores' }>): string[] {
  const question = colorQuestionById(view.party.questionId);
  const correct = question.correctColors.slice(0, view.party.answerCount);
  const signature = `${view.roomCode}:${view.round}:${view.me.playerId}:${question.id}`;
  if (stableHash(signature) % 100 < 88) return correct;

  const alternatives = COLOR_NAMES.filter((color) => !correct.includes(color));
  const answer = [...correct];
  const replacementIndex = stableHash(`${signature}:miss`) % Math.max(1, alternatives.length);
  const replacement = alternatives[replacementIndex] ?? 'rojo';
  answer[Math.max(0, answer.length - 1)] = replacement;
  return answer;
}

function majorityAnswer(view: Extract<PartyPlayerView, { gameId: 'mayoria' }>): string {
  const options = MAJORITY_ANSWERS[view.party.questionId] ?? ['lo primero que se te ocurra'];
  const signature = `${view.roomCode}:${view.round}:${view.me.playerId}:${view.party.questionId}`;
  const useAlternative = options.length > 1 && stableHash(signature) % 100 >= 82;
  return options[useAlternative ? 1 : 0] ?? options[0] ?? 'no sé';
}

function normalizeMajorityAnswer(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase('es-ES')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function majorityGroups(view: Extract<PartyPlayerView, { gameId: 'mayoria' }>): string[][] {
  const groups = new Map<string, string[]>();
  for (const [playerId, answer] of Object.entries(view.party.answers ?? {})) {
    const key = normalizeMajorityAnswer(answer);
    const group = groups.get(key);
    if (group) group.push(playerId);
    else groups.set(key, [playerId]);
  }
  return [...groups.values()];
}

export function decidePartyAction(view: PartyPlayerView): GameAction | null {
  if (view.gameId === 'orden') {
    // Es cooperativo: jugar el mínimo propio es la política correcta y no se
    // introduce un fallo artificial que perjudicaría también al humano.
    const value = [...view.me.hand].sort((a, b) => a - b)[0];
    return value === undefined ? null : { type: 'playNumber', value };
  }
  if (view.gameId === 'colores') return { type: 'submitColors', colors: colorAnswer(view) };
  if (view.gameId === 'mayoria') {
    if (view.me.availableActions.includes('resolveMajority')) {
      return { type: 'resolveMajority', groups: majorityGroups(view) };
    }
    return { type: 'submitMajority', answer: majorityAnswer(view) };
  }
  if (view.party.cluePlayerId === view.me.playerId) {
    return view.me.availableActions.includes('submitScaleClue')
      ? { type: 'submitScaleClue', clue: 'Una situación que divide a la mesa' }
      : null;
  }

  // La pista ya está en la vista pública tras confirmarse. Sin intentar
  // interpretar lenguaje, la mejor estimación honesta del robot es el centro,
  // con una pequeña dispersión para que varios robots no respondan en bloque.
  const offset = (stableHash(`${view.roomCode}:${view.round}:${view.me.playerId}`) % 17) - 8;
  return { type: 'submitScale', value: 50 + offset };
}
