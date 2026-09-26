'use client';

import React, { useEffect } from 'react';
import { ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight } from 'lucide-react';

interface ReviewNavigationProps {
  currentPly: number;
  totalPlies: number;
  onSelectPly: (ply: number) => void;
}

export const ReviewNavigation: React.FC<ReviewNavigationProps> = ({
  currentPly,
  totalPlies,
  onSelectPly
}) => {
  // Support Left / Right arrow keys for smooth board review
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        if (currentPly > 0) onSelectPly(currentPly - 1);
        else if (currentPly === 0) onSelectPly(-1);
      } else if (e.key === 'ArrowRight') {
        if (currentPly < totalPlies - 1) onSelectPly(currentPly + 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPly, totalPlies, onSelectPly]);

  return (
    <div className="flex items-center justify-between gap-1 p-1 bg-judge-surface border border-judge-border rounded-lg select-none">
      {/* First */}
      <button
        onClick={() => onSelectPly(-1)}
        disabled={currentPly <= -1}
        title="Start of game"
        className="flex-1 py-1.5 flex items-center justify-center rounded hover:bg-judge-panel text-judge-muted hover:text-judge-text disabled:opacity-30 disabled:pointer-events-none transition-colors"
      >
        <ChevronsLeft className="w-4 h-4" />
      </button>

      {/* Prev */}
      <button
        onClick={() => onSelectPly(currentPly - 1)}
        disabled={currentPly <= -1}
        title="Previous move (Left arrow)"
        className="flex-1 py-1.5 flex items-center justify-center rounded hover:bg-judge-panel text-judge-muted hover:text-judge-text disabled:opacity-30 disabled:pointer-events-none transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      {/* Counter */}
      <span className="px-2 text-[11px] font-mono font-semibold text-judge-muted">
        {currentPly < 0 ? 'Start' : `${currentPly + 1} / ${totalPlies}`}
      </span>

      {/* Next */}
      <button
        onClick={() => onSelectPly(currentPly + 1)}
        disabled={currentPly >= totalPlies - 1}
        title="Next move (Right arrow)"
        className="flex-1 py-1.5 flex items-center justify-center rounded hover:bg-judge-panel text-judge-muted hover:text-judge-text disabled:opacity-30 disabled:pointer-events-none transition-colors"
      >
        <ChevronRight className="w-4 h-4" />
      </button>

      {/* Last */}
      <button
        onClick={() => onSelectPly(totalPlies - 1)}
        disabled={currentPly >= totalPlies - 1}
        title="End of game"
        className="flex-1 py-1.5 flex items-center justify-center rounded hover:bg-judge-panel text-judge-muted hover:text-judge-text disabled:opacity-30 disabled:pointer-events-none transition-colors"
      >
        <ChevronsRight className="w-4 h-4" />
      </button>
    </div>
  );
};
