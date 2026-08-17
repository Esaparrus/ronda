// Estado del juego de Mus. Contrato §12 (reglas) + §3 (requisitos del motor).
//
// Requisitos duros del motor (§3, iguales que Chinchón y Pocha):
//   - JSON-serializable puro: nada de Map, Set, Date ni clases.
//   - Inmutable: applyAction devuelve un estado nuevo.
//   - Determinista: el RNG va con semilla y contador DENTRO del estado.
//
// Lo que hace a Mus distinto de los otros dos (§12.12): el marcador es de la
// PAREJA, no del jugador. `piedras`, `juegosWon` y `winnerTeamIndex` van
// indexados por `teamIndex`, y `MusPlayer` no tiene `score`.
import type {
  CardId,
  MusHandResult,
  MusLance,
  MusPartnerSignal,
  MusPhase,
  PlayerId,
  RoomCode,
} from '@ronda/protocol';
import type { MusConfig } from '@ronda/protocol';

/** Status global de la partida. Sin 'lobby', igual que Chinchón y Pocha:
 * el motor arranca en 'playing' y el lobby es cosa de la sala. 'roundEnd' es
 * el fin de una MANO (el recuento de §12.9), no el fin de un juego. */
export type MusStatus = 'playing' | 'roundEnd' | 'gameEnd';

/** Envite vivo en el lance en curso. Contrato §12.7. */
export interface MusBetState {
  piedras: number; // 0 en un órdago: lo que se apuesta es el juego entero
  byTeam: 0 | 1;
  /** Lo que se lleva quien envidó si la contraria no quiere (§12.7): lo
   * acumulado ANTES del último envite, o 1 si no había nada. */
  ifRejected: number;
  isOrdago: boolean;
}

/** Cómo acabó un lance. Se resuelve en el recuento salvo `noQuerido`. */
export type MusLanceOutcome =
  | 'skipped' // nadie tiene pares (o juego): el lance no existe en esta mano (§12.7)
  | 'paso' // pasaron los cuatro: 1 piedra al ganador de la comparación (§12.7)
  | 'querido' // se aceptó el envite: se compara en el recuento (§12.9)
  | 'noQuerido' // se rechazó: piedras pagadas EN EL ACTO, sin comparación (§12.7)
  | 'soloUna'; // solo una pareja tiene pares (o juego): se lo lleva sin comparar (§12.7)

/** Lo que dejó un lance ya cerrado, pendiente del recuento. */
export interface MusLanceState {
  lance: MusLance;
  outcome: MusLanceOutcome;
  /** Piedras del envite ('querido'), del "en paso" (1) o del rechazo. */
  piedras: number;
  /** Pareja que ya tiene ganado el lance sin comparar, o null si se compara. */
  team: 0 | 1 | null;
  /**
   * true si esas piedras ya se apuntaron FUERA del recuento. Pasa con
   * `noQuerido` (§12.7: quien envidó se las lleva en el acto, sin esperar a
   * descubrir cartas) y con el lance que resuelve un órdago querido (§12.8).
   * El recuento las muestra pero no las vuelve a sumar.
   */
  paid: boolean;
}

/** Estado de un jugador dentro de la partida. */
export interface MusPlayer {
  playerId: PlayerId;
  nick: string;
  seat: number; // 0..3
  /** Pareja: asientos 0 y 2 contra 1 y 3 (§12.2). Derivado de `seat % 2`. */
  teamIndex: 0 | 1;
  /** Abandonó. El Mus no se puede jugar con 3 (§12.11): suspender la partida
   * es responsabilidad de apps/server, igual que en Chinchón y Pocha. El
   * motor lo guarda pero NO salta al jugador, porque no hay Mus sin cuatro. */
  left: boolean;
  hand: CardId[];
  musSaid: boolean | null; // en la vuelta de mus en curso; null = no le ha tocado
  /** Frase privada enviada al compañero durante la consulta online. */
  musSignal: MusPartnerSignal | null;
  /** Cedió al compañero la decisión de dar o cortar el mus. */
  musDelegated: boolean;
  discarded: boolean; // ya descartó en la fase de descarte en curso
  paresDeclared: boolean | null; // resultado público calculado por el motor (§12.6.3)
  juegoDeclared: boolean | null; // resultado público calculado por el motor (§12.6.4)
}

/** RNG dentro del estado: semilla + contador de llamadas. Serializable. */
export interface RngState {
  seed: string;
  calls: number;
}

/** Estado completo de una partida de Mus. JSON-serializable. */
export interface MusState {
  version: number;
  status: MusStatus;
  phase: MusPhase;
  config: MusConfig;
  gameId: 'mus';

  roomCode: RoomCode;
  rng: RngState;

  /** Juego (vaca) en curso, 1-based. Se gana la partida al llegar a
   * `config.juegos` juegos ganados (§12.3). */
  juegoNumber: number;
  /** Juegos ganados por cada pareja, indexado por teamIndex. */
  juegosWon: number[];
  /** Piedras de cada pareja EN EL JUEGO EN CURSO (0..40), por teamIndex. */
  piedras: number[];

  /** Nº de mano dentro del juego en curso, 1-based. Es lo que la vista
   * publica como `round`. */
  handNumber: number;
  /** Quién es mano: habla primero en todo y rota una silla por mano (§12.4). */
  manoSeat: number;

  /** Cartas por repartir. El postre reparte, pero el mazo lo lleva el motor. */
  deck: CardId[];
  /** Descartes de la mano, para rebarajar si el mazo se acaba (§12.5). */
  discardPile: CardId[];

  lance: MusLance | null; // solo con phase === 'lance'
  /** Asientos que ya han hablado en el lance en curso (para detectar el "en paso"). */
  spoken: boolean[];
  bet: MusBetState | null;
  /** Lances ya cerrados de esta mano, en el orden de §12.6. */
  lances: MusLanceState[];

  /** Pareja que delibera en modo online; null en presencial y fuera del mus. */
  musConsultingTeam: 0 | 1 | null;

  turnSeat: number | null;
  players: MusPlayer[];

  handResult: MusHandResult | null; // solo en status 'roundEnd' | 'gameEnd'
  winnerTeamIndex: 0 | 1 | null;
  rematchVotes: PlayerId[];
}

/** Pareja de un asiento: 0 y 2 contra 1 y 3 (§12.2). */
export function teamOfSeat(seat: number): 0 | 1 {
  return (seat % 2) as 0 | 1;
}

/** La otra pareja. */
export function otherTeam(team: 0 | 1): 0 | 1 {
  return team === 0 ? 1 : 0;
}

/** Jugador por playerId, o undefined. */
export function findPlayer(state: MusState, playerId: PlayerId): MusPlayer | undefined {
  return state.players.find((p) => p.playerId === playerId);
}

/** ¿Es el turno de este jugador y la partida está en juego? */
export function isPlayerTurn(state: MusState, playerId: PlayerId): boolean {
  if (state.status !== 'playing') return false;
  const seat = state.turnSeat;
  if (seat === null) return false;
  return state.players[seat]?.playerId === playerId;
}

/**
 * Los cuatro asientos empezando por el mano. Es el orden en que se habla en
 * todo (§12.4) y también el que desempata: "gana la mano más cercana al
 * mano" (§12.9) es, exactamente, "gana el primero de esta lista".
 */
export function seatsFromMano(state: MusState): number[] {
  const n = state.players.length;
  const out: number[] = [];
  for (let i = 0; i < n; i++) out.push((state.manoSeat + i) % n);
  return out;
}

/** El postre está inmediatamente antes del mano en el orden de juego y es
 * quien reparte. Se deriva para que nunca pueda desincronizarse al rotar. */
export function postreSeat(state: MusState): number {
  const n = state.players.length;
  return (state.manoSeat - 1 + n) % n;
}
