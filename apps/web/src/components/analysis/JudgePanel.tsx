'use client';

import React from 'react';
import { GameJudgeSummary, AuthoritativeGameState } from '@judge-chess/shared';
import { MoveClassificationBadge } from './MoveClassificationBadge';
import { ReviewNavigation } from './ReviewNavigation';
import { MoveHistory } from '../chess/MoveHistory';
import { Sparkles, RotateCw, RefreshCw, BarChart2 } from 'lucide-react';

interface JudgePanelProps {
  summary: GameJudgeSummary;
  gameState: AuthoritativeGameState;
  currentPly: number;
  onSelectPly: (ply: number) => void;
  onShowSummaryModal: () => void;
  onRequestRematch: () => void;
  onFlipBoard: () => void;
}

export const JudgePanel: React.FC<JudgePanelProps> = ({
  summary,
  gameState,
  currentPly,
  onSelectPly,
  onShowSummaryModal,
  onRequestRematch,
  onFlipBoard
}) => {
  const selectedMove = currentPly >= 0 ? summary.analyzedMoves[currentPly] : null;

  // Format evaluation score
  const formatEval = (scoreCp: number | null, mateIn: number | null): string => {
    if (mateIn !== null) {
      return mateIn > 0 ? `+M${mateIn}` : `-M${Math.abs(mateIn)}`;
    }
    if (scoreCp === null) return '0.0';
    const pawns = scoreCp / 100;
    return pawns > 0 ? `+${pawns.toFixed(1)}` : pawns.toFixed(1);
  };

  return (
    <div className="w-full bg-judge-surface border border-judge-border rounded-xl p-4 flex flex-col h-[560px] shadow-xl animate-in fade-in duration-200">
      {/* Brand Header */}
      <div className="flex items-center justify-between pb-3 border-b border-judge-border">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded bg-judge-panel border border-judge-border flex items-center justify-center text-judge-accent font-bold text-sm">
            ♞
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-judge-text flex items-center gap-1">
              JUDGE REVIEW
            </div>
            <div className="text-[10px] text-judge-muted font-mono">
              Stockfish Engine Depth {summary.analysisDepth}
            </div>
          </div>
        </div>

        <button
          onClick={onShowSummaryModal}
          className="flex items-center gap-1.5 py-1 px-2.5 rounded-lg bg-judge-panel border border-judge-border hover:bg-judge-subtle text-[11px] font-semibold text-judge-accent hover:text-judge-accentHover transition-colors"
        >
          <BarChart2 className="w-3.5 h-3.5" />
          <span>Overview</span>
        </button>
      </div>

      {/* Selected Move Analysis Card */}
      <div className="my-3 p-3 rounded-xl bg-judge-panel border border-judge-border/80 space-y-2.5">
        {selectedMove ? (
          <>
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-semibold text-judge-muted">
                Move {selectedMove.moveNumber} ({selectedMove.playerColor === 'w' ? 'White' : 'Black'})
              </span>
              <span className="text-base font-extrabold font-mono text-judge-text">
                {selectedMove.san}
              </span>
            </div>

            <div className="flex items-center justify-between pt-0.5">
              <MoveClassificationBadge classification={selectedMove.classification} />
              {selectedMove.isMoveOfGame && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-[10px] font-bold text-amber-300">
                  <Sparkles className="w-3 h-3" />
                  <span>Move of the Game</span>
                </span>
              )}
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-judge-border/60 text-center">
              <div className="p-1.5 rounded bg-judge-surface">
                <div className="text-[10px] text-judge-muted uppercase">Evaluation</div>
                <div className="text-xs font-bold font-mono text-judge-text mt-0.5">
                  {formatEval(selectedMove.evalBefore.scoreCp, selectedMove.evalBefore.mateIn)} →{' '}
                  {formatEval(selectedMove.evalAfter.scoreCp, selectedMove.evalAfter.mateIn)}
                </div>
              </div>

              <div className="p-1.5 rounded bg-judge-surface">
                <div className="text-[10px] text-judge-muted uppercase">Engine Best</div>
                <div className="text-xs font-bold font-mono text-emerald-400 mt-0.5 truncate">
                  {selectedMove.bestMoveSan || selectedMove.bestMoveUci}
                </div>
              </div>

              <div className="p-1.5 rounded bg-judge-surface">
                <div className="text-[10px] text-judge-muted uppercase">Loss</div>
                <div
                  className={`text-xs font-bold font-mono mt-0.5 ${
                    selectedMove.centipawnLoss === 0
                      ? 'text-emerald-400'
                      : selectedMove.centipawnLoss <= 25
                      ? 'text-cyan-400'
                      : selectedMove.centipawnLoss <= 60
                      ? 'text-slate-300'
                      : selectedMove.centipawnLoss <= 140
                      ? 'text-amber-400'
                      : 'text-red-400'
                  }`}
                >
                  {selectedMove.centipawnLoss} cp
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="py-4 text-center text-xs text-judge-muted italic">
            Starting Position. Use arrow keys or buttons below to review moves.
          </div>
        )}

        {/* Stepper Navigation */}
        <ReviewNavigation
          currentPly={currentPly}
          totalPlies={summary.analyzedMoves.length}
          onSelectPly={onSelectPly}
        />
      </div>

      {/* Clickable Move History */}
      <div className="flex-1 flex flex-col min-h-0 bg-judge-panel/50 rounded-lg p-2 border border-judge-border/80">
        <div className="flex items-center justify-between text-[11px] font-semibold text-judge-muted uppercase tracking-wider px-2 py-1 border-b border-judge-border/50">
          <span>Move History</span>
          <span className="text-[10px] text-judge-muted/70">Click move to inspect</span>
        </div>
        <MoveHistory
          moves={gameState.moveHistory}
          analyses={summary.analyzedMoves}
          currentPlyIndex={currentPly}
          onSelectPly={onSelectPly}
          isReviewMode={true}
        />
      </div>

      {/* Footer Controls */}
      <div className="pt-3 border-t border-judge-border flex items-center justify-between text-xs">
        <button
          onClick={onFlipBoard}
          className="flex items-center gap-1.5 text-judge-muted hover:text-judge-text p-1.5 rounded hover:bg-judge-panel transition-colors"
        >
          <RotateCw className="w-3.5 h-3.5" />
          <span>Flip Board</span>
        </button>

        <button
          onClick={onRequestRematch}
          className="flex items-center gap-1.5 font-semibold text-judge-accent hover:text-judge-accentHover p-1.5 rounded hover:bg-judge-panel transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Rematch</span>
        </button>
      </div>
    </div>
  );
};
