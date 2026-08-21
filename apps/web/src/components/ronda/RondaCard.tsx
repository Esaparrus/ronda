'use client';

import Image from 'next/image';
import type { RondaCardView } from '@ronda/protocol';
import { formatEuros } from '@/lib/ronda';

const TAPA_ART = {
  carne: '/games/la-ronda/tapa-carne-v1.png',
  pescado: '/games/la-ronda/tapa-pescado-v1.png',
  vegetal: '/games/la-ronda/tapa-vegetal-v1.png',
} as const;

const KIND_MARK: Record<RondaCardView['kind'], string> = {
  tapa: 'T',
  vino: 'V',
  bloqueo: '×',
  giro: '↺',
  premium: '2×',
  toilette: '↗',
  sobremesa: '☕',
  celebracion: '★',
  mitad: '½',
  grupo: '÷',
  servicio: '+',
};

export interface RondaCardProps {
  card: RondaCardView;
  selected?: boolean;
  disabled?: boolean;
  compact?: boolean;
  width?: number;
  onClick?: () => void;
}

export function RondaCard({
  card,
  selected = false,
  disabled = false,
  compact = false,
  width,
  onClick,
}: RondaCardProps) {
  const art = card.tapaType ? TAPA_ART[card.tapaType] : '/games/la-ronda/card-back-v1.png';
  const Component = onClick ? 'button' : 'div';
  const resolvedWidth = width ?? (compact ? 92 : 118);

  return (
    <Component
      {...(onClick ? { type: 'button' as const, onClick, disabled } : {})}
      className={`relative isolate flex aspect-[2/3] shrink-0 overflow-hidden rounded-[clamp(12px,4vw,18px)] border bg-mesa text-left shadow-lg transition duration-150 ${selected ? '-translate-y-2 border-oro ring-2 ring-oro/50' : 'border-crema/20'} ${
        disabled ? 'opacity-45 grayscale-[35%]' : ''
      }`}
      style={{ width: resolvedWidth }}
      aria-pressed={onClick ? selected : undefined}
      aria-label={`${card.name}${card.priceCents > 0 ? `, ${formatEuros(card.priceCents)}` : ''}`}
    >
      <Image
        src={art}
        alt=""
        fill
        sizes={`${Math.ceil(resolvedWidth)}px`}
        className="object-cover"
      />
      {!card.tapaType ? (
        <span className="absolute inset-0 bg-tinta/80" />
      ) : (
        <span className="absolute inset-0 bg-gradient-to-t from-tinta via-transparent to-black/15" />
      )}
      <span className="absolute left-2 top-2 grid min-h-7 min-w-7 place-items-center rounded-full border border-white/30 bg-oro px-1.5 font-mono text-11 font-bold text-white">
        {KIND_MARK[card.kind]}
      </span>
      <span className="absolute inset-x-2 bottom-2 flex flex-col gap-0.5">
        <span className="font-display text-[15px] leading-tight text-white drop-shadow">
          {card.name}
        </span>
        {card.priceCents > 0 ? (
          <span className="font-mono text-12 font-bold text-oro">
            {formatEuros(card.priceCents)}
          </span>
        ) : null}
      </span>
    </Component>
  );
}
