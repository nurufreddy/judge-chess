'use client';

import React, { useState, useEffect } from 'react';
import { Color, ClockState } from '@judge-chess/shared';

interface ChessClockProps {
  color: Color;
  clockState: ClockState;
  isCurrentTurn: boolean;
  isGameActive: boolean;
  onTimeout?: (color: Color) => void;
}

export const ChessClock: React.FC<ChessClockProps> = ({
  color,
  clockState,
  isCurrentTurn,
  isGameActive,
  onTimeout
}) => {
  const [displayMs, setDisplayMs] = useState<number>(
    color === 'w' ? clockState.whiteRemainingMs : clockState.blackRemainingMs
  );

  useEffect(() => {
    // Whenever server sends an authoritative clock sync update, reset base value
    const baseMs = color === 'w' ? clockState.whiteRemainingMs : clockState.blackRemainingMs;
    setDisplayMs(baseMs);

    if (!clockState.hasClock || !isGameActive || clockState.activeColor !== color) {
      return;
    }

    const interval = setInterval(() => {
      const now = Date.now();
      const elapsedSinceSync = now - clockState.lastUpdateTimestamp;
      const remaining = Math.max(0, baseMs - elapsedSinceSync);

      setDisplayMs(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
        onTimeout?.(color);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [clockState, color, isGameActive, onTimeout]);

  if (!clockState.hasClock) {
    return (
      <div className="flex items-center gap-1 text-xs text-judge-muted font-mono px-2.5 py-1 rounded bg-judge-surface border border-judge-border">
        <span>∞</span>
      </div>
    );
  }

  const totalSeconds = Math.max(0, Math.floor(displayMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const tenths = Math.floor((displayMs % 1000) / 100);

  const isLowTime = totalSeconds < 30;
  const isCritical = totalSeconds < 10;

  return (
    <div
      className={`flex items-center justify-center font-mono font-bold tracking-wider px-3 py-1.5 rounded-lg border transition-all select-none ${
        isCurrentTurn && isGameActive
          ? isCritical
            ? 'bg-red-950/70 border-red-500/70 text-red-300 animate-pulse'
            : isLowTime
            ? 'bg-amber-950/70 border-amber-500/70 text-amber-300'
            : 'bg-judge-panel border-judge-accent text-judge-accent shadow-sm'
          : 'bg-judge-surface border-judge-border text-judge-muted'
      }`}
    >
      <span className="text-base">
        {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
      </span>
      {isCritical && (
        <span className="text-xs ml-0.5 opacity-80">
          .{tenths}
        </span>
      )}
    </div>
  );
};
