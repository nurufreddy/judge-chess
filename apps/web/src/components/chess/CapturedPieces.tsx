'use client';

import React from 'react';
import { Color } from '@judge-chess/shared';

interface CapturedPiecesProps {
  color: Color;
  capturedPieces: string[];
  scoreAdvantage?: number; // >0 means this color has a point advantage
}

const PIECE_VALUES: Record<string, number> = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9
};

const PIECE_SYMBOLS: Record<string, { w: string; b: string }> = {
  p: { w: '♙', b: '♟' },
  n: { w: '♘', b: '♞' },
  b: { w: '♗', b: '♝' },
  r: { w: '♖', b: '♜' },
  q: { w: '♕', b: '♛' }
};

export const CapturedPieces: React.FC<CapturedPiecesProps> = ({
  color,
  capturedPieces,
  scoreAdvantage
}) => {
  // Sort by piece value descending
  const sorted = [...capturedPieces].sort(
    (a, b) => (PIECE_VALUES[b.toLowerCase()] || 0) - (PIECE_VALUES[a.toLowerCase()] || 0)
  );

  return (
    <div className="flex items-center gap-1.5 min-h-[22px] text-xs">
      <div className="flex items-center -space-x-1 select-none">
        {sorted.map((piece, i) => {
          const type = piece.toLowerCase();
          // The piece symbol depends on the captured piece's color (opposite of current player)
          const oppColor = color === 'w' ? 'b' : 'w';
          const symbol = PIECE_SYMBOLS[type]?.[oppColor] || '';
          return (
            <span
              key={i}
              className={`text-base leading-none drop-shadow-sm ${
                oppColor === 'w' ? 'text-zinc-200' : 'text-zinc-500'
              }`}
            >
              {symbol}
            </span>
          );
        })}
      </div>
      {scoreAdvantage !== undefined && scoreAdvantage > 0 && (
        <span className="text-[10px] font-bold text-judge-accent ml-1 px-1 rounded bg-judge-panel border border-judge-border">
          +{scoreAdvantage}
        </span>
      )}
    </div>
  );
};
