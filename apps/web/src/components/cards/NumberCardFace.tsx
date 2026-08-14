import React from 'react';

export interface NumberCardFaceProps {
  value: number;
  className?: string;
}

export function NumberCardArtwork({ value }: { value: number }) {
  return (
    <img
      src={`/cards/orden/${value}.webp`}
      alt=""
      aria-hidden="true"
      draggable={false}
      decoding="async"
      className="number-card-art"
    />
  );
}

export function NumberCardFace({ value, className = '' }: NumberCardFaceProps) {
  return (
    <div className={'number-card number-card-static ' + className} aria-label={'Carta ' + value}>
      <NumberCardArtwork value={value} />
    </div>
  );
}
