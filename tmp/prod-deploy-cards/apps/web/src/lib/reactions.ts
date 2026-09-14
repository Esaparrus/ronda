// Cara visible de las cuatro reacciones. Roadmap "Después del MVP" §2.
//
// El protocolo transporta identificadores (`@ronda/protocol/reactions.ts`);
// el emoji y su nombre en castellano viven aquí, en la interfaz, que es lo
// único que hay que tocar para cambiarlos. El texto no es decorativo: es lo
// que leen el lector de pantalla y el `aria-label` del botón (§8.5).
import { REACTION_IDS, type ReactionId } from '@ronda/protocol';

export interface ReactionFace {
  emoji: string;
  /** Nombre en castellano, para aria-label y para el texto alternativo. */
  label: string;
}

export const REACTION_FACES: Readonly<Record<ReactionId, ReactionFace>> = {
  aplauso: { emoji: '👏', label: 'Bien jugado' },
  risa: { emoji: '😂', label: 'Qué risa' },
  asombro: { emoji: '😮', label: 'No me lo creo' },
  pensar: { emoji: '🤔', label: 'Piensa un poco' },
};

/** Las cuatro reacciones en el orden en que se pintan en la barra. */
export const REACTION_ORDER: readonly ReactionId[] = REACTION_IDS;
