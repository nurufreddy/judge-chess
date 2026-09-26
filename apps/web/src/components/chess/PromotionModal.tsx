'use client';

import React from 'react';
import { Color } from '@judge-chess/shared';

interface PromotionModalProps {
  color: Color;
  isOpen: boolean;
  onSelect: (piece: 'q' | 'r' | 'b' | 'n') => void;
  onCancel: () => void;
}

export const PromotionModal: React.FC<PromotionModalProps> = ({
  color,
  isOpen,
  onSelect,
  onCancel
}) => {
  if (!isOpen) return null;

  const pieces: { id: 'q' | 'r' | 'b' | 'n'; label: string; icon: string }[] = [
    { id: 'q', label: 'Queen', icon: color === 'w' ? '♕' : '♛' },
    { id: 'r', label: 'Rook', icon: color === 'w' ? '♖' : '♜' },
    { id: 'b', label: 'Bishop', icon: color === 'w' ? '♗' : '♝' },
    { id: 'n', label: 'Knight', icon: color === 'w' ? '♘' : '♞' }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-judge-panel border border-judge-border rounded-xl p-5 shadow-2xl max-w-xs w-full text-center">
        <h3 className="text-sm font-semibold tracking-wider uppercase text-judge-muted mb-4">
          Promote Pawn
        </h3>
        <div className="grid grid-cols-4 gap-2 mb-4">
          {pieces.map((p) => (
            <button
              key={p.id}
              onClick={() => onSelect(p.id)}
              className="flex flex-col items-center justify-center p-3 rounded-lg bg-judge-surface border border-judge-border hover:border-judge-accent hover:bg-judge-subtle transition-all duration-150 group"
            >
              <span className="text-4xl group-hover:scale-110 transition-transform">
                {p.icon}
              </span>
              <span className="text-xs text-judge-muted group-hover:text-judge-text mt-1">
                {p.label}
              </span>
            </button>
          ))}
        </div>
        <button
          onClick={onCancel}
          className="text-xs text-judge-muted hover:text-judge-text transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};
