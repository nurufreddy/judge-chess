'use client';

import React, { useEffect } from 'react';
import { AuthoritativeGameState, Color } from '@judge-chess/shared';
import confetti from 'canvas-confetti';
import { Trophy, RefreshCw, BarChart2, Home, X } from 'lucide-react';
import Link from 'next/link';

interface GameResultModalProps {
  isOpen: boolean;
  state: AuthoritativeGameState;
  playerColor: Color | null;
  onClose: () => void;
  onReviewGame: () => void;
  onRequestRematch: () => void;
}

export const GameResultModal: React.FC<GameResultModalProps> = ({
  isOpen,
  state,
  playerColor,
  onClose,
  onReviewGame,
  onRequestRematch
}) => {
  const isWinner = playerColor && state.winner === playerColor;

  useEffect(() => {
    if (isOpen && isWinner) {
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch {
        // ignore
      }
    }
  }, [isOpen, isWinner]);

  if (!isOpen) return null;

  const winnerName =
    state.winner === 'w'
      ? state.whitePlayer?.name || 'White'
      : state.winner === 'b'
      ? state.blackPlayer?.name || 'Black'
      : 'Draw';

  const formatReason = (reason: string | null) => {
    switch (reason) {
      case 'checkmate':
        return 'Checkmate';
      case 'resignation':
        return 'Resignation';
      case 'timeout':
        return 'Timeout';
      case 'stalemate':
        return 'Stalemate';
      case 'draw_agreement':
        return 'Draw by Agreement';
      case 'insufficient_material':
        return 'Insufficient Material';
      case 'threefold_repetition':
        return 'Threefold Repetition';
      case 'fifty_move_rule':
        return '50-Move Rule';
      case 'abandonment':
        return 'Opponent Disconnected';
      default:
        return 'Match Concluded';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-judge-panel border border-judge-border rounded-2xl max-w-sm w-full p-6 text-center shadow-2xl space-y-5 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-lg text-judge-muted hover:text-judge-text hover:bg-judge-subtle transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Icon & Title */}
        <div className="space-y-2">
          <div className="w-12 h-12 rounded-full bg-judge-surface border border-judge-accent/40 text-judge-accent flex items-center justify-center mx-auto text-xl shadow-lg">
            <Trophy className="w-6 h-6 text-amber-400" />
          </div>

          <h2 className="text-xl font-extrabold uppercase tracking-wider text-judge-text">
            {formatReason(state.resultReason)}
          </h2>

          <div className="text-base font-bold text-judge-accent">
            {state.winner === 'draw' ? 'Draw Game' : `${winnerName} Won`}
          </div>

          <div className="inline-block px-3 py-1 rounded bg-judge-surface border border-judge-border font-mono text-sm font-bold text-judge-muted">
            {state.result || '1/2-1/2'}
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-2 pt-2">
          <button
            onClick={() => {
              onClose();
              onReviewGame();
            }}
            className="w-full py-3 px-4 rounded-xl bg-judge-accent text-judge-bg font-bold text-xs tracking-wider uppercase hover:bg-judge-accentHover transition-all flex items-center justify-center gap-2 shadow-lg"
          >
            <BarChart2 className="w-4 h-4" />
            <span>Review Game with Judge</span>
          </button>

          <button
            onClick={onRequestRematch}
            className="w-full py-2.5 px-4 rounded-xl bg-judge-surface border border-judge-border hover:bg-judge-subtle text-xs font-semibold text-judge-text transition-colors flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-3.5 h-3.5 text-judge-accent" />
            <span>Request Rematch</span>
          </button>

          <Link
            href="/"
            className="w-full py-2 px-4 rounded-xl text-xs text-judge-muted hover:text-judge-text transition-colors flex items-center justify-center gap-2"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Back to Home</span>
          </Link>
        </div>
      </div>
    </div>
  );
};
