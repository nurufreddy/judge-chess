'use client';

import React from 'react';
import { X, ShieldCheck, Award, Target, Clock, ArrowRight } from 'lucide-react';

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RulesModal: React.FC<RulesModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-judge-panel border border-judge-border rounded-xl max-w-lg w-full p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between border-b border-judge-border pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">♞</span>
            <h2 className="text-base font-bold text-judge-text tracking-wide">
              How to Play Judge Chess
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-judge-muted hover:text-judge-text hover:bg-judge-subtle transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 text-xs text-judge-muted leading-relaxed">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-judge-surface border border-judge-border">
            <Target className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-judge-text text-sm mb-0.5">The Objective</div>
              Standard chess rules apply. Checkmate the opponent’s king so it cannot escape attack.
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-lg bg-judge-surface border border-judge-border">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-judge-text text-sm mb-0.5">Turns & Moves</div>
              White moves first. Players alternate turns. You can drag and drop pieces or click a piece then click its destination square.
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-lg bg-judge-surface border border-judge-border">
            <Clock className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-judge-text text-sm mb-0.5">Game End Conditions</div>
              A game concludes by Checkmate, Stalemate, Draw Agreement, Resignation, Insufficient Material, 50-move rule, or Timeout.
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-lg bg-judge-surface border border-judge-border">
            <Award className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-judge-text text-sm mb-0.5">The Judge Review</div>
              Once a game concludes, the Stockfish engine grades every move as Exceptional, Best, Great, Good, Inaccuracy, Mistake, or Blunder and calculates your Judge Accuracy (0–100%).
            </div>
          </div>
        </div>

        <div className="pt-2">
          <button
            onClick={onClose}
            className="w-full py-2.5 px-4 rounded-lg bg-judge-accent text-judge-bg font-semibold text-xs tracking-wider uppercase hover:bg-judge-accentHover transition-colors flex items-center justify-center gap-1.5"
          >
            <span>Got it, let's play</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
