// Reacciones rápidas. Roadmap "Después del MVP" §2 de 02-PAQUETES.md
// ("Reacciones rápidas (4 emojis, sin chat libre)").
//
// El protocolo transporta IDENTIFICADORES, nunca el emoji: el carácter
// concreto es decisión de la interfaz (apps/web) y puede cambiar sin tocar
// un contrato compartido por servidor y motor. La lista es cerrada y de
// exactamente cuatro entradas -- eso es lo que impide que esto degenere en
// un chat libre, que está explícitamente fuera de alcance (00-MASTER.md §4).
import { z } from 'zod';
import type { PlayerId } from './ids.ts';

export const REACTION_IDS = ['aplauso', 'risa', 'asombro', 'pensar'] as const;

export type ReactionId = (typeof REACTION_IDS)[number];

/**
 * Espera mínima entre dos reacciones del MISMO jugador. No es el
 * rate-limit general de sockets (rate-limit.ts, que cuenta todos los
 * eventos juntos): es un enfriamiento propio para que nadie pueda
 * empapelar la mesa con emojis aunque no llegue a agotar su cupo global.
 */
export const REACTION_COOLDOWN_MS = 1500;

/** Cuánto vive una reacción en pantalla antes de desvanecerse (interfaz). */
export const REACTION_TTL_MS = 2500;

export const ReactionIdSchema = z.enum(REACTION_IDS);

/** Reacción difundida a todos los miembros de la sala (servidor → cliente). */
export interface ReactionPayload {
  playerId: PlayerId;
  /** Asiento del que reacciona: la interfaz coloca el emoji sin buscar en `players`. */
  seat: number;
  reaction: ReactionId;
  /** ms epoch del servidor. Sirve de clave estable para la animación. */
  at: number;
}

/** Comprueba que un string es un ReactionId válido (entrada externa). */
export const isReactionId = (value: unknown): value is ReactionId =>
  typeof value === 'string' && (REACTION_IDS as readonly string[]).includes(value);
