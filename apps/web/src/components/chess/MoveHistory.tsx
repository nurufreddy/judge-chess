'use client';

import React, { useEffect, useRef } from 'react';
import { MoveRecord, MoveAnalysis } from '@judge-chess/shared';
import { CLASSIFICATION_META } from '@judge-chess/shared';

interface MoveHistoryProps {
  moves: MoveRecord[];
  analyses?: MoveAnalysis[];
  currentPlyIndex: number; // -1 for starting position, or ply (0-based)
  onSelectPly?: (plyIndex: number) => void;
  isReviewMode?: boolean;
}

export const MoveHistory: React.FC<MoveHistoryProps> = ({
  moves,
  analyses = [],
  currentPlyIndex,
  onSelectPly,
  isReviewMode = false
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Group into pairs (1. White Black, 2. White Black)
  const movePairs: { moveNumber: number; white?: MoveRecord; black?: MoveRecord }[] = [];
  for (let i = 0; i < moves.length; i += 2) {
    movePairs.push({
      moveNumber: Math.floor(i / 2) + 1,
      white: moves[i],
      black: moves[i + 1]
    });
  }

  // Auto-scroll to selected move
  useEffect(() => {
    if (!containerRef.current) return;
    const activeEl = containerRef.current.querySelector('[data-active="true"]');
    if (activeEl) {
      activeEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    } else if (currentPlyIndex === moves.length - 1) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [currentPlyIndex, moves.length]);

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto font-mono text-xs divide-y divide-judge-border/50 max-h-[360px] pr-1"
    >
      {movePairs.length === 0 ? (
        <div className="py-8 text-center text-judge-muted/70 text-xs italic">
          No moves made yet
        </div>
      ) : (
        movePairs.map((pair) => {
          const whiteAnalysis = analyses.find((a) => a.ply === (pair.white?.ply ?? -1));
          const blackAnalysis = analyses.find((a) => a.ply === (pair.black?.ply ?? -1));

          const isWhiteActive = currentPlyIndex === (pair.white?.ply ?? -1);
          const isBlackActive = currentPlyIndex === (pair.black?.ply ?? -1);

          return (
            <div
              key={pair.moveNumber}
              className="grid grid-cols-[38px_1fr_1fr] items-center hover:bg-judge-panel/40 transition-colors py-1 px-1.5"
            >
              {/* Move Number */}
              <span className="text-judge-muted text-[11px] font-semibold select-none">
                {pair.moveNumber}.
              </span>

              {/* White Move */}
              {pair.white ? (
                <button
                  type="button"
                  data-active={isWhiteActive}
                  onClick={() => onSelectPly?.(pair.white!.ply)}
                  className={`flex items-center justify-between px-2 py-1 rounded text-left transition-all ${
                    isWhiteActive
                      ? 'bg-judge-accent/20 text-judge-accent font-bold border border-judge-accent/40'
                      : 'text-judge-text hover:bg-judge-panel'
                  }`}
                >
                  <span className="truncate">{pair.white.san}</span>
                  {isReviewMode && whiteAnalysis && (
                    <span
                      title={CLASSIFICATION_META[whiteAnalysis.classification].description}
                      className="ml-1 text-[11px] font-bold shrink-0"
                      style={{ color: CLASSIFICATION_META[whiteAnalysis.classification].colorHex }}
                    >
                      {CLASSIFICATION_META[whiteAnalysis.classification].symbol}
                    </span>
                  )}
                </button>
              ) : (
                <span />
              )}

              {/* Black Move */}
              {pair.black ? (
                <button
                  type="button"
                  data-active={isBlackActive}
                  onClick={() => onSelectPly?.(pair.black!.ply)}
                  className={`flex items-center justify-between px-2 py-1 rounded text-left transition-all ${
                    isBlackActive
                      ? 'bg-judge-accent/20 text-judge-accent font-bold border border-judge-accent/40'
                      : 'text-judge-text hover:bg-judge-panel'
                  }`}
                >
                  <span className="truncate">{pair.black.san}</span>
                  {isReviewMode && blackAnalysis && (
                    <span
                      title={CLASSIFICATION_META[blackAnalysis.classification].description}
                      className="ml-1 text-[11px] font-bold shrink-0"
                      style={{ color: CLASSIFICATION_META[blackAnalysis.classification].colorHex }}
                    >
                      {CLASSIFICATION_META[blackAnalysis.classification].symbol}
                    </span>
                  )}
                </button>
              ) : (
                <span />
              )}
            </div>
          );
        })
      )}
    </div>
  );
};
