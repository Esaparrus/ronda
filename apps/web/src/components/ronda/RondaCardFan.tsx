'use client';

import { useEffect, useRef, useState } from 'react';
import type { RondaCardView } from '@ronda/protocol';
import { rondaCardFanLayout, rondaCardFanTop, rondaCardFanTransform } from '@/lib/ronda-card-fan';
import { RondaCard } from './RondaCard';

export interface RondaCardFanProps {
  cards: readonly RondaCardView[];
  selectedIds?: ReadonlySet<string>;
  disabledIds?: ReadonlySet<string>;
  onCardClick: (card: RondaCardView) => void;
  emptyLabel?: string;
}

const EMPTY_IDS = new Set<string>();

export function RondaCardFan({
  cards,
  selectedIds = EMPTY_IDS,
  disabledIds = EMPTY_IDS,
  onCardClick,
  emptyLabel = 'No tienes cartas disponibles',
}: RondaCardFanProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [availableWidth, setAvailableWidth] = useState(344);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const updateWidth = (width: number) => {
      if (width > 0) setAvailableWidth(width);
    };
    updateWidth(stage.getBoundingClientRect().width);

    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;
      if (width) updateWidth(width);
    });
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);

  if (cards.length === 0) {
    return (
      <div className="grid min-h-20 place-items-center text-center text-13 text-humo">
        {emptyLabel}
      </div>
    );
  }

  const layout = rondaCardFanLayout(availableWidth, cards.length);
  const startX = Math.max(0, (availableWidth - layout.totalWidth) / 2);

  return (
    <div
      ref={stageRef}
      className="relative isolate w-full overflow-visible"
      style={{ height: layout.stageHeight }}
      data-ronda-card-fan
    >
      {cards.map((card, index) => {
        const selected = selectedIds.has(card.id);
        return (
          <div
            key={card.id}
            className="absolute origin-bottom transition-[left,top,transform] duration-150"
            style={{
              left: startX + index * layout.slotWidth,
              top: rondaCardFanTop(index, cards.length, selected),
              width: layout.cardWidth,
              zIndex: selected ? cards.length + 2 : index + 1,
              transform: rondaCardFanTransform(index, cards.length, selected),
            }}
          >
            <RondaCard
              card={card}
              selected={selected}
              disabled={disabledIds.has(card.id)}
              width={layout.cardWidth}
              onClick={() => onCardClick(card)}
            />
          </div>
        );
      })}
    </div>
  );
}
