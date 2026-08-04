'use client';

// Qué baraja pinta `PlayingCard` en este subárbol.
//
// Existe por un desajuste de materiales, no por gusto: las imágenes de
// `public/cards/` son los 40 naipes de la baraja corta (1-7, 10-12). Pocha
// (§9) y Mus (§12) reparten esos 40 exactos, así que se ven enteros con la
// baraja española. Chinchón (§5) reparte 48 + 2 comodines, y sus ochos,
// nueves y comodines no tienen imagen: mezclarlos con el resto dejaría dos
// estilos de dibujo dentro de la misma mano. Por eso Chinchón pide `'svg'` y
// se pinta entero con la baraja propia de `cardArt.tsx`.
//
// Va por contexto y no por prop para que `PlayingCard` no tenga que saber a
// qué se juega —no lo sabe ni debe saberlo— y para no encadenar una prop por
// los seis o siete componentes que hay entre la pantalla de partida y cada
// carta (`Hand`, `Pile`, `RevealedHand`, `CenterTable`, `SeatRing`...).
//
// Sin proveedor el valor es `'auto'`: se usa la imagen cuando la hay. Es lo
// que quieren el escaparate de `/dev/design` y cualquier sitio suelto que
// pinte una carta fuera de una partida.
import { createContext, useContext, type ReactNode } from 'react';
import type { GameId } from '@ronda/protocol';

export type CardArt = 'auto' | 'svg';

const CardArtContext = createContext<CardArt>('auto');

export function CardArtProvider({ art, children }: { art: CardArt; children: ReactNode }) {
  return <CardArtContext.Provider value={art}>{children}</CardArtContext.Provider>;
}

export function useCardArt(): CardArt {
  return useContext(CardArtContext);
}

/** Baraja que le toca a cada juego. Un único sitio donde decidirlo. */
export function cardArtForGame(gameId: GameId): CardArt {
  return gameId === 'chinchon' ? 'svg' : 'auto';
}
