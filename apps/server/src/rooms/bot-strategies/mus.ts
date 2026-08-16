import { fuerzaMus, juegoRank, juegoSuma, paresOf } from '@ronda/engine';
import type { CardId, GameAction, MusLance, MusPlayerView } from '@ronda/protocol';
import { ALL_CARD_IDS, botCard, combinations, stableHash } from './shared.ts';

function ownSeat(view: MusPlayerView): number {
  return view.players.find((player) => player.playerId === view.me.playerId)?.seat ?? 0;
}

function positionBonus(view: MusPlayerView): number {
  const distance = (ownSeat(view) - view.manoSeat + view.players.length) % view.players.length;
  return (view.players.length - distance) * 0.012;
}

function musForces(hand: readonly CardId[], ochoReyes: boolean): number[] {
  return hand
    .map((cardId) => {
      const card = botCard(cardId);
      return card ? fuerzaMus(card.rank, ochoReyes) : 0;
    })
    .sort((a, b) => b - a);
}

function grandeConfidence(hand: readonly CardId[], ochoReyes: boolean): number {
  const forces = musForces(hand, ochoReyes);
  const maximum = ochoReyes ? 8 : 10;
  const weights = [0.52, 0.26, 0.14, 0.08];
  return forces.reduce(
    (score, force, index) => score + (force / maximum) * (weights[index] ?? 0),
    0,
  );
}

function chicaConfidence(hand: readonly CardId[], ochoReyes: boolean): number {
  const forces = musForces(hand, ochoReyes).reverse();
  const maximum = ochoReyes ? 8 : 10;
  const weights = [0.52, 0.26, 0.14, 0.08];
  return forces.reduce(
    (score, force, index) => score + ((maximum + 1 - force) / maximum) * (weights[index] ?? 0),
    0,
  );
}

function paresConfidence(hand: readonly CardId[], ochoReyes: boolean): number {
  const pares = paresOf([...hand], ochoReyes);
  if (!pares) return 0.08;
  const high = (pares.key[0] ?? 0) / (ochoReyes ? 8 : 10);
  if (pares.kind === 'duples') return Math.min(0.99, 0.86 + high * 0.12);
  if (pares.kind === 'medias') return Math.min(0.96, 0.75 + high * 0.16);
  return Math.min(0.82, 0.42 + high * 0.32);
}

function juegoConfidence(hand: readonly CardId[]): number {
  const sum = juegoSuma([...hand]);
  const rank = juegoRank(sum);
  if (rank > 0) return 0.58 + (rank / 8) * 0.4;
  return Math.max(0.12, Math.min(0.68, 0.18 + ((sum - 20) / 10) * 0.45));
}

function lanceConfidence(view: MusPlayerView, lance: MusLance | null, hand = view.me.hand): number {
  let confidence: number;
  switch (lance) {
    case 'grande':
      confidence = grandeConfidence(hand, view.config.ochoReyes);
      break;
    case 'chica':
      confidence = chicaConfidence(hand, view.config.ochoReyes);
      break;
    case 'pares':
      confidence = paresConfidence(hand, view.config.ochoReyes);
      break;
    case 'juego':
      confidence = juegoConfidence(hand);
      break;
    case 'punto': {
      const sum = juegoSuma([...hand]);
      confidence = Math.max(0.12, Math.min(0.9, 0.18 + ((sum - 20) / 10) * 0.68));
      break;
    }
    default:
      confidence = 0.5;
  }

  const teammateHasLance = view.players.some((player) => {
    if (player.playerId === view.me.playerId || player.teamIndex !== view.me.teamIndex)
      return false;
    if (lance === 'pares') return view.paresDeclared[player.seat] === true;
    if (lance === 'juego') return view.juegoDeclared[player.seat] === true;
    return false;
  });
  return Math.max(
    0.02,
    Math.min(0.99, confidence + positionBonus(view) + (teammateHasLance ? 0.07 : 0)),
  );
}

function overallHandValue(view: MusPlayerView, hand = view.me.hand): number {
  const values = [
    grandeConfidence(hand, view.config.ochoReyes),
    chicaConfidence(hand, view.config.ochoReyes),
    paresConfidence(hand, view.config.ochoReyes),
    juegoConfidence(hand),
  ].sort((a, b) => b - a);
  return (values[0] ?? 0) * 0.58 + (values[1] ?? 0) * 0.3 + (values[2] ?? 0) * 0.12;
}

function shouldCutMus(view: MusPlayerView): boolean {
  // El postre no prolonga una cuarta voz automática: si los otros tres robots
  // ya pidieron mus, corta. Además de ser una decisión posicional razonable,
  // garantiza que una mesa enteramente automática no encadene descartes para
  // siempre por conservar todos la misma estructura de mano.
  if (view.musSaid.filter((said) => said === true).length >= 3) return true;

  const pares = paresOf([...view.me.hand], view.config.ochoReyes);
  const gameRank = juegoRank(view.me.juego.suma);
  if (pares?.kind === 'duples' || pares?.kind === 'medias' || gameRank >= 7) return true;

  const grande = grandeConfidence(view.me.hand, view.config.ochoReyes);
  const chica = chicaConfidence(view.me.hand, view.config.ochoReyes);
  const value = overallHandValue(view);
  if (value >= 0.7 || (grande >= 0.82 && chica >= 0.62)) return true;

  // Un corte ocasional con una mano media evita ciclos artificialmente largos
  // entre cuatro robots sin convertir una mano mala en una apuesta agresiva.
  return (
    value >= 0.61 &&
    stableHash(`${view.roomCode}:${view.round}:${view.me.hand.join(',')}`) % 100 < 18
  );
}

function deterministicReplacementSample(
  source: readonly CardId[],
  count: number,
  seed: number,
): CardId[] {
  const pool = [...source];
  const result: CardId[] = [];
  let state = seed >>> 0;
  for (let index = 0; index < count && pool.length > 0; index += 1) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    const pick = state % pool.length;
    const [card] = pool.splice(pick, 1);
    if (card) result.push(card);
  }
  return result;
}

function decideDiscards(view: MusPlayerView): CardId[] {
  const hand = view.me.hand;
  const unknown = ALL_CARD_IDS.filter((cardId) => !hand.includes(cardId));
  const candidates = [1, 2, 3, 4].flatMap((count) => combinations(hand, count));
  let best = candidates[0] ?? [...hand];
  let bestScore = Number.NEGATIVE_INFINITY;

  for (const discards of candidates) {
    const kept = hand.filter((cardId) => !discards.includes(cardId));
    let expected = 0;
    const samples = discards.length === 1 ? 36 : 72;
    for (let sample = 0; sample < samples; sample += 1) {
      const seed = stableHash(`${view.roomCode}:${view.round}:${discards.join(',')}:${sample}`);
      const replacements = deterministicReplacementSample(unknown, discards.length, seed);
      expected += overallHandValue(view, [...kept, ...replacements]);
    }
    expected /= samples;

    // Conservar una pareja real importa más que una mejora marginal de Grande.
    const keptPair = paresOf([...kept], view.config.ochoReyes) !== null;
    const score = expected + (keptPair ? 0.025 : 0) - discards.length * 0.004;
    if (score > bestScore) {
      best = discards;
      bestScore = score;
    }
  }
  return best;
}

function desiredBet(view: MusPlayerView, confidence: number): number {
  const minimum = view.me.minEnvite ?? 2;
  if (confidence >= 0.91) return minimum + 3;
  if (confidence >= 0.82) return minimum + 2;
  if (confidence >= 0.73) return minimum + 1;
  return minimum;
}

function shouldOrdago(view: MusPlayerView, confidence: number): boolean {
  const mine = view.teams[view.me.teamIndex]?.piedras ?? 0;
  const otherTeam = view.me.teamIndex === 0 ? 1 : 0;
  const theirs = view.teams[otherTeam]?.piedras ?? 0;
  if (confidence < 0.94) return false;
  return theirs >= 34 || (mine <= 12 && theirs >= 30);
}

function decideLance(view: MusPlayerView, actions: ReadonlySet<string>): GameAction | null {
  const confidence = lanceConfidence(view, view.lance);
  const signature = `${view.roomCode}:${view.round}:${view.lance}:${view.me.hand.join(',')}`;

  if (view.bet) {
    if (view.bet.isOrdago) {
      if (actions.has('querer') && confidence >= 0.84) return { type: 'querer' };
      return actions.has('noQuerer') ? { type: 'noQuerer' } : null;
    }

    const stake = Math.max(2, view.bet.piedras);
    const refusalCost = Math.max(1, view.bet.ifRejected);
    const callThreshold = Math.max(0.43, 0.52 - refusalCost / (stake * 8));
    if (actions.has('ordago') && shouldOrdago(view, confidence)) return { type: 'ordago' };
    // Una subida deja de tener valor táctico cuando el envite ya es grande:
    // sin este tope dos manos fuertes podrían resubirse indefinidamente.
    if (actions.has('envidar') && confidence >= 0.88 && stake < 8) {
      return { type: 'envidar', piedras: desiredBet(view, confidence) };
    }
    if (actions.has('querer') && confidence >= callThreshold) return { type: 'querer' };
    return actions.has('noQuerer') ? { type: 'noQuerer' } : null;
  }

  if (actions.has('ordago') && shouldOrdago(view, confidence)) return { type: 'ordago' };
  const controlledBluff = confidence >= 0.48 && stableHash(`${signature}:bluff`) % 100 < 7;
  if (actions.has('envidar') && (confidence >= 0.7 || controlledBluff)) {
    return { type: 'envidar', piedras: desiredBet(view, confidence) };
  }
  if (actions.has('paso')) return { type: 'paso' };
  return null;
}

export function decideMusAction(view: MusPlayerView): GameAction | null {
  const actions = new Set(view.me.availableActions);
  if (actions.has('repartir')) return { type: 'repartir' };
  if (actions.has('noMus') && shouldCutMus(view)) return { type: 'noMus' };
  if (actions.has('mus')) return { type: 'mus' };
  if (actions.has('noMus')) return { type: 'noMus' };

  if (actions.has('descartar')) {
    const cardIds = decideDiscards(view);
    return cardIds.length > 0 ? { type: 'descartar', cardIds } : null;
  }
  if (actions.has('declararPares')) {
    return { type: 'declararPares', tiene: view.me.pares !== null };
  }
  if (actions.has('declararJuego')) {
    return { type: 'declararJuego', tiene: view.me.juego.tiene };
  }

  if (
    actions.has('paso') ||
    actions.has('envidar') ||
    actions.has('querer') ||
    actions.has('noQuerer') ||
    actions.has('ordago')
  ) {
    return decideLance(view, actions);
  }
  if (actions.has('nextRound')) return { type: 'nextRound' };
  return null;
}
