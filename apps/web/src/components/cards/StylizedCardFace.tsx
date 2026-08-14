import React from 'react';
import type { Rank, Suit } from '@ronda/protocol';
import type { CardRenderMode } from '@/lib/card-style';

type StylizedVariant = Extract<CardRenderMode, 'minimal' | 'pixel'>;
type PipRank = 1 | 2 | 3 | 4 | 5 | 6 | 7;

const INK = 'var(--card-ink)';
const PAPER = 'var(--card-face)';
const SKIN = 'var(--card-skin)';

const SUIT_COLORS: Record<Suit, string> = {
  oros: 'var(--card-oros)',
  copas: 'var(--card-copas)',
  espadas: 'var(--card-espadas)',
  bastos: 'var(--card-bastos)',
};

const PIP_LAYOUT: Record<PipRank, readonly (readonly [number, number])[]> = {
  1: [[36, 54]],
  2: [
    [36, 31],
    [36, 77],
  ],
  3: [
    [36, 25],
    [36, 54],
    [36, 83],
  ],
  4: [
    [24, 31],
    [48, 31],
    [24, 77],
    [48, 77],
  ],
  5: [
    [24, 27],
    [48, 27],
    [36, 54],
    [24, 81],
    [48, 81],
  ],
  6: [
    [24, 25],
    [48, 25],
    [24, 54],
    [48, 54],
    [24, 83],
    [48, 83],
  ],
  7: [
    [24, 23],
    [48, 23],
    [24, 46],
    [48, 46],
    [36, 63],
    [24, 85],
    [48, 85],
  ],
};

const PIXEL_DIGITS: Readonly<Record<string, readonly string[]>> = {
  '0': ['111', '101', '101', '101', '111'],
  '1': ['010', '110', '010', '010', '111'],
  '2': ['110', '001', '111', '100', '111'],
  '3': ['110', '001', '111', '001', '110'],
  '4': ['101', '101', '111', '001', '001'],
  '5': ['111', '100', '111', '001', '110'],
  '6': ['011', '100', '111', '101', '111'],
  '7': ['111', '001', '010', '010', '010'],
};

function isPipRank(rank: Rank): rank is PipRank {
  return rank <= 7;
}

interface SuitGlyphProps {
  suit: Suit;
  x: number;
  y: number;
  scale?: number;
}

function MinimalSuitGlyph({ suit, x, y, scale = 1 }: SuitGlyphProps) {
  const color = SUIT_COLORS[suit];

  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      {suit === 'oros' ? (
        <>
          <circle r={6.5} fill={color} stroke={INK} strokeWidth={1.5} />
          <circle r={3.2} fill={PAPER} stroke={INK} strokeWidth={1} />
          <path d="M0-3.2V3.2M-3.2 0H3.2" stroke={color} strokeWidth={1.2} />
        </>
      ) : null}
      {suit === 'copas' ? (
        <>
          <path
            d="M-7-6H7L5.3.5C4.7 3.2 2.8 4.8 0 4.8S-4.7 3.2-5.3.5Z"
            fill={color}
            stroke={INK}
            strokeWidth={1.5}
            strokeLinejoin="round"
          />
          <path d="M0 4.5V8M-4 8H4" stroke={INK} strokeWidth={1.7} strokeLinecap="round" />
        </>
      ) : null}
      {suit === 'espadas' ? (
        <>
          <path
            d="M0-9 3.7 3.2 0 6.2-3.7 3.2Z"
            fill={color}
            stroke={INK}
            strokeWidth={1.4}
            strokeLinejoin="round"
          />
          <path d="M-5 4H5M0 5V9" stroke={INK} strokeWidth={1.7} strokeLinecap="round" />
        </>
      ) : null}
      {suit === 'bastos' ? (
        <>
          <path
            d="M-2.4-9H2.4L3.8 8H-3.8Z"
            fill={color}
            stroke={INK}
            strokeWidth={1.5}
            strokeLinejoin="round"
          />
          <path
            d="M-2-4-6-7M2 0 6-4M-2 4-6 1"
            stroke={color}
            strokeWidth={3.5}
            strokeLinecap="round"
          />
          <path
            d="M-2-4-6-7M2 0 6-4M-2 4-6 1"
            stroke={INK}
            strokeWidth={1.1}
            strokeLinecap="round"
          />
        </>
      ) : null}
    </g>
  );
}

function PixelSuitGlyph({ suit, x, y, scale = 1 }: SuitGlyphProps) {
  const color = SUIT_COLORS[suit];

  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`} shapeRendering="crispEdges">
      {suit === 'oros' ? (
        <>
          <path d="M-3-9H3V-6H6V-3H9V3H6V6H3V9H-3V6H-6V3H-9V-3H-6V-6H-3Z" fill={INK} />
          <rect x={-3} y={-6} width={6} height={12} fill={color} />
          <rect x={-6} y={-3} width={12} height={6} fill={color} />
          <rect x={-1.5} y={-1.5} width={3} height={3} fill={PAPER} />
        </>
      ) : null}
      {suit === 'copas' ? (
        <>
          <path d="M-9-9H9V0H6V3H3V6H1.5V9H7.5V12H-7.5V9H-1.5V6H-3V3H-6V0H-9Z" fill={INK} />
          <path d="M-6-6H6V0H3V3H-3V0H-6Z" fill={color} />
          <rect x={-4.5} y={9} width={9} height={1.5} fill={color} />
        </>
      ) : null}
      {suit === 'espadas' ? (
        <>
          <path
            d="M-1.5-12H1.5V-9H4.5V3H1.5V6H7.5V9H1.5V12H-1.5V9H-7.5V6H-1.5V3H-4.5V-9H-1.5Z"
            fill={INK}
          />
          <path d="M0-9 3-6V1.5L0 4.5-3 1.5V-6Z" fill={color} />
        </>
      ) : null}
      {suit === 'bastos' ? (
        <>
          <path
            d="M-3-12H3V-6H6V-9H9V-3H6V0H3V3H6V0H9V6H6V9H3V12H-3V6H-6V9H-9V3H-6V0H-3Z"
            fill={INK}
          />
          <rect x={-1.5} y={-9} width={3} height={18} fill={color} />
          <rect x={3} y={-6} width={3} height={3} fill={color} />
          <rect x={-6} y={3} width={3} height={3} fill={color} />
        </>
      ) : null}
    </g>
  );
}

function MinimalCorners({ suit, rank }: { suit: Suit; rank: Rank }) {
  const corner = (
    <g>
      <text
        x={7}
        y={14}
        fill={INK}
        fontFamily="ui-sans-serif, system-ui, sans-serif"
        fontSize={9}
        fontWeight={800}
      >
        {rank}
      </text>
      <MinimalSuitGlyph suit={suit} x={10.5} y={21.5} scale={0.38} />
    </g>
  );

  return (
    <>
      {corner}
      <g transform="rotate(180 36 54)">{corner}</g>
    </>
  );
}

function PixelRank({ rank, x, y }: { rank: Rank; x: number; y: number }) {
  const unit = 1.5;
  const digits = String(rank).split('');

  return (
    <g transform={`translate(${x} ${y})`} fill={INK} shapeRendering="crispEdges">
      {digits.flatMap((digit, digitIndex) =>
        (PIXEL_DIGITS[digit] ?? []).flatMap((row, rowIndex) =>
          row
            .split('')
            .map((cell, columnIndex) =>
              cell === '1' ? (
                <rect
                  key={`${digitIndex}-${rowIndex}-${columnIndex}`}
                  x={(digitIndex * 4 + columnIndex) * unit}
                  y={rowIndex * unit}
                  width={unit}
                  height={unit}
                />
              ) : null,
            ),
        ),
      )}
    </g>
  );
}

function PixelCorners({ suit, rank }: { suit: Suit; rank: Rank }) {
  const corner = (
    <g>
      <PixelRank rank={rank} x={6} y={7} />
      <PixelSuitGlyph suit={suit} x={11} y={23} scale={0.42} />
    </g>
  );

  return (
    <>
      {corner}
      <g transform="rotate(180 36 54)">{corner}</g>
    </>
  );
}

function MinimalFigure({ suit, rank }: { suit: Suit; rank: Rank }) {
  const color = SUIT_COLORS[suit];

  if (rank === 10) {
    return (
      <g stroke={INK} strokeLinejoin="round">
        <path d="M21 88Q23 61 36 57Q49 61 51 88Z" fill={color} fillOpacity={0.22} strokeWidth={2} />
        <circle cx={36} cy={43} r={10} fill={SKIN} strokeWidth={2} />
        <path d="M25 42Q28 29 44 32L49 38Q39 35 25 42Z" fill={color} strokeWidth={2} />
        <path d="M29 47Q36 52 43 47" fill="none" strokeWidth={1.4} strokeLinecap="round" />
        <path d="M28 65 20 76M44 65 52 76" fill="none" strokeWidth={2} strokeLinecap="round" />
        <MinimalSuitGlyph suit={suit} x={36} y={72} scale={0.72} />
      </g>
    );
  }

  if (rank === 11) {
    return (
      <g stroke={INK} strokeLinejoin="round">
        <path
          d="M19 88Q19 65 25 49L23 37 31 41Q38 32 49 38L54 49 48 59 39 61 45 88Z"
          fill={color}
          fillOpacity={0.26}
          strokeWidth={2.2}
        />
        <path d="M29 48Q38 42 48 47L43 55 32 57Z" fill={SKIN} strokeWidth={1.7} />
        <circle cx={43.5} cy={47.5} r={1.5} fill={INK} stroke="none" />
        <path d="M31 40Q36 27 44 32L48 38" fill={SKIN} strokeWidth={1.7} />
        <path d="M34 31 40 27 46 34" fill={color} strokeWidth={2} />
        <MinimalSuitGlyph suit={suit} x={31} y={72} scale={0.62} />
      </g>
    );
  }

  return (
    <g stroke={INK} strokeLinejoin="round">
      <path d="M19 88Q22 61 36 57Q50 61 53 88Z" fill={color} fillOpacity={0.24} strokeWidth={2} />
      <circle cx={36} cy={43} r={10} fill={SKIN} strokeWidth={2} />
      <path d="M27 47Q36 60 45 47Q43 61 36 64Q29 61 27 47Z" fill={INK} strokeWidth={1.2} />
      <path
        d="M25 39 27 27 34 33 36 24 39 33 47 27 47 40Z"
        fill="var(--card-oros)"
        strokeWidth={2}
      />
      <path d="M28 67 19 76M44 67 53 76" fill="none" strokeWidth={2} strokeLinecap="round" />
      <MinimalSuitGlyph suit={suit} x={36} y={74} scale={0.7} />
    </g>
  );
}

function PixelFigure({ suit, rank }: { suit: Suit; rank: Rank }) {
  const color = SUIT_COLORS[suit];

  if (rank === 10) {
    return (
      <g shapeRendering="crispEdges">
        <path d="M18 87V69H21V63H27V57H45V63H51V69H54V87Z" fill={INK} />
        <path d="M21 84V72H27V63H45V72H51V84Z" fill={color} />
        <rect x={27} y={33} width={18} height={24} fill={INK} />
        <rect x={30} y={36} width={12} height={15} fill={SKIN} />
        <path d="M24 39V33H27V30H42V33H48V39H39V36H30V39Z" fill={INK} />
        <path d="M27 36V33H42V36H36V39H30V42H27Z" fill="var(--card-copas)" />
        <rect x={30} y={42} width={3} height={3} fill={INK} />
        <rect x={39} y={42} width={3} height={3} fill={INK} />
        <rect x={33} y={51} width={6} height={3} fill={INK} />
        <PixelSuitGlyph suit={suit} x={36} y={75} scale={0.65} />
      </g>
    );
  }

  if (rank === 11) {
    return (
      <g shapeRendering="crispEdges">
        <path d="M18 87V60H21V48H24V39H30V33H39V36H48V39H54V54H51V60H45V66H42V87Z" fill={INK} />
        <path d="M21 84V63H24V51H27V42H33V39H42V42H48V45H51V51H45V57H36V63H33V84Z" fill={color} />
        <rect x={42} y={45} width={3} height={3} fill={INK} />
        <rect x={48} y={51} width={6} height={3} fill={SKIN} />
        <path d="M24 42V33H27V27H36V30H42V36H36V33H30V42Z" fill={INK} />
        <path d="M27 36V30H33V33H39V36H36V39H30V42H27Z" fill={SKIN} />
        <rect x={27} y={27} width={9} height={3} fill="var(--card-espadas)" />
        <PixelSuitGlyph suit={suit} x={29} y={72} scale={0.58} />
      </g>
    );
  }

  return (
    <g shapeRendering="crispEdges">
      <path d="M18 87V69H21V63H27V57H45V63H51V69H54V87Z" fill={INK} />
      <path d="M21 84V72H27V63H45V72H51V84Z" fill={color} />
      <rect x={27} y={33} width={18} height={24} fill={INK} />
      <rect x={30} y={36} width={12} height={15} fill={SKIN} />
      <path d="M27 39V27H30V33H33V24H36V33H39V24H42V33H45V27H48V39Z" fill={INK} />
      <path d="M30 36V30H33V36H36V27H39V36H42V30H45V36Z" fill="var(--card-oros)" />
      <rect x={30} y={42} width={3} height={3} fill={INK} />
      <rect x={39} y={42} width={3} height={3} fill={INK} />
      <path d="M27 48H30V54H33V57H39V54H42V48H45V57H42V60H30V57H27Z" fill={INK} />
      <PixelSuitGlyph suit={suit} x={36} y={75} scale={0.65} />
    </g>
  );
}

interface StylizedCardFaceProps {
  suit: Suit;
  rank: Rank;
  variant: StylizedVariant;
}

/** Dibujo determinista para las barajas que deben conservar nitidez a 48 px. */
export function StylizedCardFace({ suit, rank, variant }: StylizedCardFaceProps) {
  const pixel = variant === 'pixel';
  const Glyph = pixel ? PixelSuitGlyph : MinimalSuitGlyph;

  return (
    <g shapeRendering={pixel ? 'crispEdges' : 'geometricPrecision'}>
      {pixel ? (
        <PixelCorners suit={suit} rank={rank} />
      ) : (
        <MinimalCorners suit={suit} rank={rank} />
      )}

      {isPipRank(rank) ? (
        <g>
          {PIP_LAYOUT[rank].map(([x, y], index) => (
            <Glyph
              key={`${x}-${y}-${index}`}
              suit={suit}
              x={x}
              y={y}
              scale={rank >= 6 ? 0.82 : 0.94}
            />
          ))}
        </g>
      ) : pixel ? (
        <PixelFigure suit={suit} rank={rank} />
      ) : (
        <MinimalFigure suit={suit} rank={rank} />
      )}
    </g>
  );
}
