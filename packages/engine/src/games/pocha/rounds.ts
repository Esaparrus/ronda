// Estructura de rondas en pirámide. Contrato §9.2.
import { POCHA_DECK_SIZE } from './deck.ts';

/**
 * M = floor((D-1)/n), D=40. El "-1" reserva siempre una carta para el
 * triunfo (§9.3), tanto si `config.trump` está activo como si no -- el
 * contrato fija M sobre esa reserva incondicionalmente, no solo cuando hay
 * triunfo que revelar.
 */
export function maxRoundSize(players: number): number {
  return Math.floor((POCHA_DECK_SIZE - 1) / players);
}

/** Nº total de rondas de la partida: 1,2,...,M-1,M,M-1,...,2,1 → 2M-1. */
export function totalRounds(players: number): number {
  return 2 * maxRoundSize(players) - 1;
}

/**
 * Tamaño de la ronda `round` (1-based) para `players` jugadores, según la
 * secuencia en pirámide del §9.2: sube 1..M, baja M-1..1, sin repetir el pico.
 */
export function roundSizeFor(round: number, players: number): number {
  const M = maxRoundSize(players);
  return round <= M ? round : 2 * M - round;
}
