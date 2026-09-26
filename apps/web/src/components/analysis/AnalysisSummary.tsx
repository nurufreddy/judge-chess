'use client';

import React from 'react';
import { GameJudgeSummary, AuthoritativeGameState } from '@judge-chess/shared';
import { CLASSIFICATION_META, MoveClassification } from '@judge-chess/shared';
import { Trophy, Award, Sparkles, ArrowRight } from 'lucide-react';

interface AnalysisSummaryProps {
  summary: GameJudgeSummary;
  gameState: AuthoritativeGameState;
  onStartReview: () => void;
}

export const AnalysisSummary: React.FC<AnalysisSummaryProps> = ({
  summary,
  gameState,
  onStartReview
}) => {
  const categories: { key: keyof typeof summary.whiteBreakdown; type: MoveClassification }[] = [
    { key: 'exceptional', type: 'EXCEPTIONAL' },
    { key: 'best', type: 'BEST' },
    { key: 'great', type: 'GREAT' },
    { key: 'good', type: 'GOOD' },
    { key: 'inaccuracy', type: 'INACCURACY' },
    { key: 'mistake', type: 'MISTAKE' },
    { key: 'blunder', type: 'BLUNDER' }
  ];

  const whiteName = gameState.whitePlayer?.name || 'White';
  const blackName = gameState.blackPlayer?.name || 'Black';

  return (
    <div className="bg-judge-surface border border-judge-border rounded-xl p-5 shadow-2xl space-y-5 animate-in fade-in duration-200">
      {/* Title */}
      <div className="flex items-center justify-between border-b border-judge-border pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-judge-panel border border-judge-border flex items-center justify-center text-judge-accent font-bold text-base">
            ♞
          </div>
          <div>
            <h2 className="text-sm font-bold text-judge-text uppercase tracking-wider">
              Judge Review
            </h2>
            <div className="text-[11px] text-judge-muted">
              Stockfish Engine Analysis (Depth {summary.analysisDepth})
            </div>
          </div>
        </div>

        <div className="text-right">
          <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-500/40 px-2 py-0.5 rounded">
            Analysis Complete
          </span>
        </div>
      </div>

      {/* Accuracy Comparison Cards */}
      <div className="grid grid-cols-2 gap-3">
        {/* White */}
        <div className="p-3.5 rounded-xl bg-judge-panel border border-judge-border flex flex-col items-center text-center">
          <div className="text-xs text-judge-muted font-semibold truncate max-w-[120px] mb-1">
            {whiteName} (White)
          </div>
          <div className="text-3xl font-extrabold font-mono text-judge-accent">
            {summary.whiteAccuracy.toFixed(1)}%
          </div>
          <div className="text-[10px] text-judge-muted uppercase tracking-wider mt-1">
            Judge Accuracy
          </div>
        </div>

        {/* Black */}
        <div className="p-3.5 rounded-xl bg-judge-panel border border-judge-border flex flex-col items-center text-center">
          <div className="text-xs text-judge-muted font-semibold truncate max-w-[120px] mb-1">
            {blackName} (Black)
          </div>
          <div className="text-3xl font-extrabold font-mono text-judge-accent">
            {summary.blackAccuracy.toFixed(1)}%
          </div>
          <div className="text-[10px] text-judge-muted uppercase tracking-wider mt-1">
            Judge Accuracy
          </div>
        </div>
      </div>

      {/* Move Classifications Table */}
      <div className="border border-judge-border rounded-xl overflow-hidden text-xs">
        <div className="grid grid-cols-[1fr_60px_60px] bg-judge-panel p-2 font-semibold text-judge-muted border-b border-judge-border text-center">
          <span className="text-left pl-2">Classification</span>
          <span>{whiteName.slice(0, 5)}</span>
          <span>{blackName.slice(0, 5)}</span>
        </div>

        <div className="divide-y divide-judge-border/50">
          {categories.map((c) => {
            const meta = CLASSIFICATION_META[c.type];
            const whiteCount = summary.whiteBreakdown[c.key];
            const blackCount = summary.blackBreakdown[c.key];

            return (
              <div
                key={c.key}
                className="grid grid-cols-[1fr_60px_60px] p-2 hover:bg-judge-panel/40 transition-colors items-center"
              >
                <div className="flex items-center gap-2 pl-2">
                  <span
                    className="font-bold text-sm w-4 text-center shrink-0"
                    style={{ color: meta.colorHex }}
                  >
                    {meta.symbol}
                  </span>
                  <span className="text-judge-text font-medium">{meta.label}</span>
                </div>
                <div className="text-center font-mono font-bold text-judge-text">
                  {whiteCount}
                </div>
                <div className="text-center font-mono font-bold text-judge-text">
                  {blackCount}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Move of the Game Highlight */}
      {summary.moveOfTheGamePly !== null && summary.moveOfTheGameExplanation && (
        <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/40 space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Move of the Game</span>
          </div>
          <p className="text-[11px] text-judge-muted leading-relaxed">
            {summary.moveOfTheGameExplanation}
          </p>
        </div>
      )}

      {/* Action */}
      <button
        onClick={onStartReview}
        className="w-full py-3 px-4 rounded-xl bg-judge-accent text-judge-bg font-bold text-xs tracking-wider uppercase hover:bg-judge-accentHover transition-all flex items-center justify-center gap-2 shadow-lg"
      >
        <span>Explore Moves on Board</span>
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
};
