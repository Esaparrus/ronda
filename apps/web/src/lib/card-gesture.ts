export const CARD_DRAG_ACTIVATION_PX = 8;
export const CARD_FLING_THRESHOLD_PX = 52;
export const DROP_ZONE_MARGIN_PX = 18;

export type CardDragIntent = 'pending' | 'reorder' | 'play';

export function cardDragIntent(deltaX: number, deltaY: number): CardDragIntent {
  if (Math.hypot(deltaX, deltaY) < CARD_DRAG_ACTIVATION_PX) return 'pending';
  if (deltaY < 0 && Math.abs(deltaY) >= Math.abs(deltaX) * 0.72) return 'play';
  if (Math.abs(deltaX) > Math.abs(deltaY)) return 'reorder';
  return 'pending';
}

export function isUpwardCardFling(
  startX: number,
  startY: number,
  currentX: number,
  currentY: number,
): boolean {
  const rise = startY - currentY;
  const horizontalTravel = Math.abs(currentX - startX);
  return rise >= CARD_FLING_THRESHOLD_PX && rise >= horizontalTravel * 0.58;
}

export interface RectLike {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export function pointInsideExpandedRect(
  x: number,
  y: number,
  rect: RectLike,
  margin = DROP_ZONE_MARGIN_PX,
): boolean {
  return (
    x >= rect.left - margin &&
    x <= rect.right + margin &&
    y >= rect.top - margin &&
    y <= rect.bottom + margin
  );
}
