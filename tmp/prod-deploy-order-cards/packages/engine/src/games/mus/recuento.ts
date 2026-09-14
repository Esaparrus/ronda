// Comparación de lances y recuento de la mano. Contrato §12.9.
//
// Separado del reducer a propósito: aquí no hay turnos ni acciones, solo
// "dadas estas cuatro manos y estos lances cerrados, cuántas piedras se
// apunta cada pareja". Es la parte con los casos dorados de §12.13.
import type { MusHandResult, MusLance, MusLanceResultRow } from '@ronda/protocol';
import {
  compareChica,
  compareGrande,
  comparePares,
  juegoPiedras,
  juegoRank,
  juegoSuma,
  paresOf,
  puntoValor,
  tieneJuego,
} from './hand.ts';
import { type MusState, otherTeam, seatsFromMano, teamOfSeat } from './state.ts';

/** Piedras que ganan un juego. Contrato §12.3: 40 piedras = 8 amarrakos. */
export const MUS_META = 40;

/** Piedras que hacen un amarrako. Contrato §12.3. */
export const PIEDRAS_POR_AMARRAKO = 5;

/** ¿Ya hay una pareja en 40? El recuento se corta ahí (§12.9.3). */
export function juegoDecided(state: MusState): boolean {
  return state.piedras.some((n) => n >= MUS_META);
}

/**
 * Apunta piedras a una pareja, respetando el corte de §12.9.3: si ya hay una
 * pareja en 40, no se suma nada más. Tope en 40 para que el marcador nunca
 * publique un número imposible.
 */
export function addPiedras(state: MusState, team: 0 | 1, n: number): void {
  if (n <= 0 || juegoDecided(state)) return;
  state.piedras[team] = Math.min(MUS_META, (state.piedras[team] ?? 0) + n);
}

/**
 * Asientos que juegan un lance, en orden desde el mano. Pares y juego solo
 * los juegan quienes hayan declarado que tienen (§12.7); grande, chica y
 * punto los juegan los cuatro.
 */
export function eligibleSeats(state: MusState, lance: MusLance): number[] {
  const seats = seatsFromMano(state).filter((s) => state.players[s] !== undefined && !state.players[s].left);
  if (lance === 'pares') return seats.filter((s) => state.players[s]?.paresDeclared === true);
  if (lance === 'juego') return seats.filter((s) => state.players[s]?.juegoDeclared === true);
  return seats;
}

/** Compara dos asientos en un lance. >0 si gana `a`. */
function compareSeats(state: MusState, lance: MusLance, a: number, b: number): number {
  const ha = state.players[a]?.hand ?? [];
  const hb = state.players[b]?.hand ?? [];
  const ocho = state.config.ochoReyes;

  switch (lance) {
    case 'grande':
      return compareGrande(ha, hb, ocho);
    case 'chica':
      return compareChica(ha, hb, ocho);
    case 'pares': {
      const pa = paresOf(ha, ocho);
      const pb = paresOf(hb, ocho);
      if (!pa && !pb) return 0;
      if (!pa) return -1;
      if (!pb) return 1;
      return comparePares(pa, pb);
    }
    case 'juego': {
      // Orden 31, 32, 40, 37, 36, 35, 34, 33 (§12.6.4), ya codificado en juegoRank.
      return juegoRank(juegoSuma(ha)) - juegoRank(juegoSuma(hb));
    }
    case 'punto':
      return puntoValor(ha) - puntoValor(hb);
  }
}

/**
 * Asiento que gana un lance entre los candidatos dados. `seats` viene en
 * orden desde el mano, y solo se sustituye al ganador con una mano
 * ESTRICTAMENTE mejor: así el empate lo gana el primero de la lista, que es
 * exactamente "gana la mano más cercana al mano" (§12.9).
 */
export function lanceWinnerSeat(state: MusState, lance: MusLance, seats: readonly number[]): number | null {
  let best: number | null = null;
  for (const seat of seats) {
    if (best === null) {
      best = seat;
      continue;
    }
    if (compareSeats(state, lance, seat, best) > 0) best = seat;
  }
  return best;
}

/** Las dos parejas, empezando por la del mano. Fija el orden de las tablas. */
function teamsFromMano(state: MusState): [0 | 1, 0 | 1] {
  const first = teamOfSeat(state.manoSeat);
  return [first, otherTeam(first)];
}

/** Piedras de pares que se apunta una pareja: las de CADA jugador que tenga (§12.9.2). */
function tablaPares(state: MusState, team: 0 | 1): number {
  let sum = 0;
  for (const p of state.players) {
    if (p.left || p.teamIndex !== team) continue;
    const pares = paresOf(p.hand, state.config.ochoReyes);
    if (pares) sum += pares.piedras;
  }
  return sum;
}

/** Piedras de juego que se apunta una pareja: las de CADA jugador que tenga (§12.9.2). */
function tablaJuego(state: MusState, team: 0 | 1): number {
  let sum = 0;
  for (const p of state.players) {
    if (p.left || p.teamIndex !== team) continue;
    const suma = juegoSuma(p.hand);
    if (tieneJuego(suma)) sum += juegoPiedras(suma);
  }
  return sum;
}

/**
 * Recuento de la mano (§12.9). MUTA `state.piedras` y devuelve el desglose.
 *
 * Se resuelven los lances en el orden de §12.6 y, dentro de cada uno:
 *   1. las piedras del envite querido, o la del "en paso", al ganador de la
 *      comparación;
 *   2. las tablas de pares y juego, que **cada pareja cobra las suyas** aunque
 *      no haya ganado el lance y aunque se jugara en paso (§12.9.2, y el caso
 *      dorado §12.13.4: "paga 3 piedras frente a 2", los dos cobran).
 *
 * Si una pareja llega a 40 a mitad del recuento, se para ahí: los lances que
 * quedan salen con `counted: false` (§12.9.3).
 *
 * [DECISIÓN P28] Dentro de un mismo lance, las tablas se apuntan primero a la
 * pareja del mano. El contrato no fija el orden y solo se nota en el caso
 * límite en que las dos parejas llegarían a 40 con las tablas del mismo
 * lance; "más cerca del mano gana" es el criterio de desempate que §12.9 usa
 * en todo lo demás, así que se aplica también aquí.
 */
export function runRecuento(state: MusState): MusHandResult {
  const rows: MusLanceResultRow[] = [];

  for (const ls of state.lances) {
    const tablas = [0, 0];

    if (ls.paid) {
      // Piedras ya apuntadas fuera del recuento (no querido, órdago): el
      // recuento las enseña pero no las vuelve a sumar.
      rows.push({
        lance: ls.lance,
        outcome: ls.outcome,
        wonByTeam: ls.team,
        piedras: ls.piedras,
        tablas,
        counted: true,
      });
      continue;
    }

    if (juegoDecided(state)) {
      rows.push({
        lance: ls.lance,
        outcome: ls.outcome,
        wonByTeam: null,
        piedras: 0,
        tablas,
        counted: false,
      });
      continue;
    }

    // 1. Piedras del lance.
    let wonByTeam: 0 | 1 | null = null;
    let piedras = 0;

    if (ls.outcome === 'soloUna' && ls.team !== null) {
      wonByTeam = ls.team;
      piedras = ls.piedras;
      addPiedras(state, wonByTeam, piedras);
    } else if (ls.outcome === 'paso' || ls.outcome === 'querido') {
      const winner = lanceWinnerSeat(state, ls.lance, eligibleSeats(state, ls.lance));
      if (winner !== null) {
        wonByTeam = teamOfSeat(winner);
        piedras = ls.piedras;
        addPiedras(state, wonByTeam, piedras);
      }
    }

    // 2. Tablas de pares / juego / punto.
    if (ls.lance === 'pares' || ls.lance === 'juego') {
      for (const team of teamsFromMano(state)) {
        const n = ls.lance === 'pares' ? tablaPares(state, team) : tablaJuego(state, team);
        tablas[team] = n;
        addPiedras(state, team, n);
      }
    } else if (ls.lance === 'punto') {
      // El punto es comparativo: solo cobra quien lo gana (§12.6 bis).
      const winner = lanceWinnerSeat(state, 'punto', eligibleSeats(state, 'punto'));
      if (winner !== null) {
        const team = teamOfSeat(winner);
        tablas[team] = state.config.puntoVale;
        addPiedras(state, team, state.config.puntoVale);
      }
    }

    rows.push({ lance: ls.lance, outcome: ls.outcome, wonByTeam, piedras, tablas, counted: true });
  }

  const juegoWonByTeam: 0 | 1 | null =
    (state.piedras[0] ?? 0) >= MUS_META ? 0 : (state.piedras[1] ?? 0) >= MUS_META ? 1 : null;

  return {
    hands: state.players.map((p) => [...p.hand]),
    rows,
    piedras: [...state.piedras],
    juegoWonByTeam,
    byOrdago: false,
  };
}
