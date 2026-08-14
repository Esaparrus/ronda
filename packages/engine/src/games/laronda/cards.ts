import type {
  RondaCardKind,
  RondaCardView,
  RondaTapaType,
} from '@ronda/protocol';

export interface RondaCard {
  id: string;
  kind: RondaCardKind;
  name: string;
  description: string;
  priceCents: number;
  tapaType: RondaTapaType | null;
}

const cards: RondaCard[] = [];

function copies(
  count: number,
  stem: string,
  card: Omit<RondaCard, 'id'>,
): void {
  for (let copy = 1; copy <= count; copy += 1) {
    cards.push({ ...card, id: `${stem}-${copy}` });
  }
}

const tapas: { type: RondaTapaType; stem: string; name: string; priceCents: number }[] = [
  { type: 'carne', stem: 'pincho-moruno', name: 'Pincho moruno', priceCents: 1000 },
  { type: 'carne', stem: 'albondigas-brasa', name: 'Albóndigas a la brasa', priceCents: 3000 },
  { type: 'carne', stem: 'secreto-plancha', name: 'Secreto a la plancha', priceCents: 5000 },
  { type: 'carne', stem: 'carrillera', name: 'Carrillera de la casa', priceCents: 7000 },
  { type: 'pescado', stem: 'boquerones', name: 'Boquerones', priceCents: 2000 },
  { type: 'pescado', stem: 'calamares', name: 'Calamares', priceCents: 4000 },
  { type: 'pescado', stem: 'gambas-ajillo', name: 'Gambas al ajillo', priceCents: 6000 },
  { type: 'pescado', stem: 'pulpo-brasa', name: 'Pulpo a la brasa', priceCents: 8000 },
  { type: 'vegetal', stem: 'aceitunas-alinadas', name: 'Aceitunas aliñadas', priceCents: 1000 },
  { type: 'vegetal', stem: 'patatas-bravas', name: 'Patatas bravas', priceCents: 2000 },
  { type: 'vegetal', stem: 'berenjena-miel', name: 'Berenjena con miel', priceCents: 4000 },
  { type: 'vegetal', stem: 'pimientos-asados', name: 'Pimientos asados', priceCents: 6000 },
];

for (const tapa of tapas) {
  copies(4, `tapa-${tapa.type}-${tapa.stem}`, {
    kind: 'tapa',
    name: tapa.name,
    description: 'Abre su comanda o iguala o supera el último precio de su familia.',
    priceCents: tapa.priceCents,
    tapaType: tapa.type,
  });
}

copies(10, 'vino-de-la-casa', {
  kind: 'vino',
  name: 'Vino de la casa',
  description: 'Siempre se puede pedir mientras siga abierta la cocina.',
  priceCents: 0,
  tapaType: null,
});

copies(8, 'cocina-cerrada', {
  kind: 'bloqueo',
  name: 'Cocina cerrada',
  description: 'Cierra una familia de tapas que ya esté abierta.',
  priceCents: 0,
  tapaType: null,
});
copies(4, 'media-vuelta', {
  kind: 'giro',
  name: 'Media vuelta',
  description: 'Invierte el sentido de juego durante esta ronda.',
  priceCents: 0,
  tapaType: null,
});
copies(4, 'gourmet', {
  kind: 'premium',
  name: 'Toque gourmet',
  description: 'Acompaña una tapa y duplica su precio.',
  priceCents: 0,
  tapaType: null,
});
copies(5, 'al-bano', {
  kind: 'toilette',
  name: 'Ahora vuelvo',
  description: 'No pueden elegirte ni cobrarte hasta tu próximo turno.',
  priceCents: 0,
  tapaType: null,
});
copies(10, 'sobremesa', {
  kind: 'sobremesa',
  name: 'Sobremesa',
  description: 'Con las tres familias abiertas, cierra los pedidos de comida y bebida.',
  priceCents: 4000,
  tapaType: null,
});
copies(1, 'celebracion', {
  kind: 'celebracion',
  name: 'Hoy se celebra',
  description: 'Puedes pasar y no pueden cobrarte durante esta ronda.',
  priceCents: 4000,
  tapaType: null,
});
copies(3, 'mitad-y-mitad', {
  kind: 'mitad',
  name: 'Mitad y mitad',
  description: 'Comparte la cuenta al 50 % con otra persona disponible.',
  priceCents: 0,
  tapaType: null,
});
copies(1, 'entre-todos', {
  kind: 'grupo',
  name: 'Entre todos',
  description: 'Reparte la cuenta entre quienes sigan en la mesa.',
  priceCents: 0,
  tapaType: null,
});
copies(6, 'servicio-de-mesa', {
  kind: 'servicio',
  name: 'Servicio de mesa',
  description: 'Añade a la cuenta el precio de la tapa más barata.',
  priceCents: 0,
  tapaType: null,
});

if (cards.length !== 100) throw new Error(`La Ronda necesita 100 cartas, hay ${cards.length}`);

const CARD_BY_ID = new Map(cards.map((card) => [card.id, card] as const));

export const RONDA_CARDS: readonly RondaCard[] = cards;

export function buildRondaDeck(): string[] {
  return cards.map((card) => card.id);
}

export function rondaCardById(cardId: string): RondaCard | undefined {
  return CARD_BY_ID.get(cardId);
}

export function rondaCardView(card: RondaCard): RondaCardView {
  return { ...card };
}

export function rondaCardViewById(cardId: string): RondaCardView | null {
  const card = rondaCardById(cardId);
  return card ? rondaCardView(card) : null;
}
