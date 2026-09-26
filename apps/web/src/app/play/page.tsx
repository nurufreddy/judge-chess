'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { Chess } from 'chess.js';
import { Sidebar } from '@/components/layout/Sidebar';
import { MobileHeader } from '@/components/layout/MobileHeader';
import { ChessBoard } from '@/components/chess/ChessBoard';
import { MoveHistory } from '@/components/chess/MoveHistory';
import { CapturedPieces } from '@/components/chess/CapturedPieces';
import { RulesModal } from '@/components/layout/RulesModal';
import { MoveRecord, Color } from '@judge-chess/shared';
import { RotateCw, RefreshCw, Trophy, AlertTriangle, ShieldCheck, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function PassAndPlayPage() {
  const [chess, setChess] = useState(() => new Chess());
  const [moves, setMoves] = useState<MoveRecord[]>([]);
  const [orientation, setOrientation] = useState<'white' | 'black'>('white');
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);
  const [rulesOpen, setRulesOpen] = useState(false);

  const turn = chess.turn() as Color;
  const isGameOver = chess.isGameOver();

  // Compute captured pieces
  const { whiteCaptured, blackCaptured, whiteAdvantage, blackAdvantage } = useMemo(() => {
    const startCounts: Record<string, number> = { p: 8, n: 2, b: 2, r: 2, q: 1, k: 1 };
    const currentCountsWhite: Record<string, number> = { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 };
    const currentCountsBlack: Record<string, number> = { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 };

    const board = chess.board();
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = board[r][c];
        if (piece) {
          if (piece.color === 'w') {
            currentCountsWhite[piece.type] = (currentCountsWhite[piece.type] || 0) + 1;
          } else {
            currentCountsBlack[piece.type] = (currentCountsBlack[piece.type] || 0) + 1;
          }
        }
      }
    }

    const whiteCapturedList: string[] = []; // Black pieces captured by White
    const blackCapturedList: string[] = []; // White pieces captured by Black

    const pieceValues: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9 };
    let whiteScore = 0;
    let blackScore = 0;

    for (const [type, count] of Object.entries(startCounts)) {
      if (type === 'k') continue;
      const whiteLoss = Math.max(0, count - (currentCountsWhite[type] || 0));
      const blackLoss = Math.max(0, count - (currentCountsBlack[type] || 0));

      for (let i = 0; i < blackLoss; i++) {
        whiteCapturedList.push(type);
        whiteScore += pieceValues[type] || 0;
      }
      for (let i = 0; i < whiteLoss; i++) {
        blackCapturedList.push(type);
        blackScore += pieceValues[type] || 0;
      }
    }

    return {
      whiteCaptured: whiteCapturedList,
      blackCaptured: blackCapturedList,
      whiteAdvantage: Math.max(0, whiteScore - blackScore),
      blackAdvantage: Math.max(0, blackScore - whiteScore)
    };
  }, [chess]);

  // Handle move from local board
  const handleMove = useCallback(
    (move: { from: string; to: string; promotion?: string }) => {
      try {
        const fenBefore = chess.fen();
        const res = chess.move({
          from: move.from,
          to: move.to,
          promotion: move.promotion || 'q'
        });

        if (!res) return;

        const newPly = moves.length;
        const newRecord: MoveRecord = {
          ply: newPly,
          moveNumber: Math.floor(newPly / 2) + 1,
          playerColor: res.color as Color,
          from: res.from,
          to: res.to,
          promotion: res.promotion,
          san: res.san,
          uci: `${res.from}${res.to}${res.promotion || ''}`,
          fenBefore,
          fenAfter: chess.fen(),
          captured: res.captured,
          isCheck: chess.isCheck(),
          isCheckmate: chess.isCheckmate(),
          timestamp: Date.now()
        };

        setMoves((prev) => [...prev, newRecord]);
        setLastMove({ from: res.from, to: res.to });
        // Force update chess instance reference
        setChess(new Chess(chess.fen()));
      } catch (err) {
        console.error('Illegal local move', err);
      }
    },
    [chess, moves.length]
  );

  const resetGame = () => {
    const newGame = new Chess();
    setChess(newGame);
    setMoves([]);
    setLastMove(null);
  };

  const flipBoard = () => {
    setOrientation((prev) => (prev === 'white' ? 'black' : 'white'));
  };

  // Result summary text
  const resultReason = useMemo(() => {
    if (chess.isCheckmate()) {
      return `Checkmate! ${turn === 'w' ? 'Black' : 'White'} wins.`;
    }
    if (chess.isStalemate()) {
      return 'Draw by Stalemate.';
    }
    if (chess.isThreefoldRepetition()) {
      return 'Draw by Threefold Repetition.';
    }
    if (chess.isInsufficientMaterial()) {
      return 'Draw by Insufficient Material.';
    }
    if (chess.isDraw()) {
      return 'Draw by 50-move rule.';
    }
    return null;
  }, [chess, turn]);

  return (
    <div className="flex h-screen bg-judge-bg overflow-hidden">
      <Sidebar onOpenRules={() => setRulesOpen(true)} />
      <RulesModal isOpen={rulesOpen} onClose={() => setRulesOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <MobileHeader onOpenRules={() => setRulesOpen(true)} />

        <main className="flex-1 max-w-7xl w-full mx-auto p-3 md:p-6 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start justify-center">
          {/* Central Chessboard Column */}
          <div className="flex flex-col items-center justify-center space-y-3 w-full max-w-[560px] mx-auto">
            {/* Top Player (Opponent) */}
            <div className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg bg-judge-surface border border-judge-border">
              <div className="flex items-center gap-2">
                <div
                  className={`w-3 h-3 rounded-full border ${
                    orientation === 'white'
                      ? 'bg-zinc-800 border-zinc-500'
                      : 'bg-zinc-200 border-zinc-400'
                  }`}
                />
                <span className="font-semibold text-xs tracking-wide text-judge-text">
                  {orientation === 'white' ? 'Black' : 'White'}
                </span>
                <CapturedPieces
                  color={orientation === 'white' ? 'b' : 'w'}
                  capturedPieces={orientation === 'white' ? blackCaptured : whiteCaptured}
                  scoreAdvantage={orientation === 'white' ? blackAdvantage : whiteAdvantage}
                />
              </div>

              {turn === (orientation === 'white' ? 'b' : 'w') && !isGameOver && (
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                  To Move
                </span>
              )}
            </div>

            {/* Chessboard */}
            <ChessBoard
              fen={chess.fen()}
              orientation={orientation}
              isInteractive={!isGameOver}
              lastMove={lastMove}
              onMove={handleMove}
            />

            {/* Bottom Player */}
            <div className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg bg-judge-surface border border-judge-border">
              <div className="flex items-center gap-2">
                <div
                  className={`w-3 h-3 rounded-full border ${
                    orientation === 'white'
                      ? 'bg-zinc-200 border-zinc-400'
                      : 'bg-zinc-800 border-zinc-500'
                  }`}
                />
                <span className="font-semibold text-xs tracking-wide text-judge-text">
                  {orientation === 'white' ? 'White' : 'Black'}
                </span>
                <CapturedPieces
                  color={orientation === 'white' ? 'w' : 'b'}
                  capturedPieces={orientation === 'white' ? whiteCaptured : blackCaptured}
                  scoreAdvantage={orientation === 'white' ? whiteAdvantage : blackAdvantage}
                />
              </div>

              {turn === (orientation === 'white' ? 'w' : 'b') && !isGameOver && (
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                  To Move
                </span>
              )}
            </div>
          </div>

          {/* Right Information Panel */}
          <div className="w-full bg-judge-surface border border-judge-border rounded-xl p-4 flex flex-col h-[560px] shadow-lg">
            <div className="flex items-center justify-between pb-3 border-b border-judge-border">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-judge-text">
                  Pass & Play Match
                </h2>
              </div>
              <span className="text-xs font-mono text-judge-muted">
                Move {Math.floor(moves.length / 2) + 1}
              </span>
            </div>

            {/* Game Status Banner */}
            <div className="my-3">
              {isGameOver ? (
                <div className="p-3 rounded-lg bg-amber-950/40 border border-amber-500/40 text-center">
                  <div className="flex items-center justify-center gap-1.5 text-amber-300 font-bold text-sm mb-1">
                    <Trophy className="w-4 h-4" />
                    <span>Game Ended</span>
                  </div>
                  <div className="text-xs text-judge-muted">{resultReason}</div>
                </div>
              ) : chess.isCheck() ? (
                <div className="p-2.5 rounded-lg bg-red-950/40 border border-red-500/40 text-center">
                  <div className="flex items-center justify-center gap-1.5 text-red-300 font-bold text-xs">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Check! {turn === 'w' ? 'White' : 'Black'} king is under attack.</span>
                  </div>
                </div>
              ) : (
                <div className="p-2.5 rounded-lg bg-judge-panel border border-judge-border text-center">
                  <span className="text-xs text-judge-muted">
                    {turn === 'w' ? 'White to move' : 'Black to move'}
                  </span>
                </div>
              )}
            </div>

            {/* Move History */}
            <div className="flex-1 flex flex-col min-h-0 bg-judge-panel/60 rounded-lg p-2 border border-judge-border/80">
              <div className="text-[11px] font-semibold text-judge-muted uppercase tracking-wider px-2 py-1 border-b border-judge-border/50">
                Notation
              </div>
              <MoveHistory
                moves={moves}
                currentPlyIndex={moves.length - 1}
                onSelectPly={() => {}}
                isReviewMode={false}
              />
            </div>

            {/* Actions */}
            <div className="pt-3 border-t border-judge-border grid grid-cols-2 gap-2">
              <button
                onClick={flipBoard}
                className="flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-judge-panel border border-judge-border hover:bg-judge-subtle text-xs font-semibold text-judge-muted hover:text-judge-text transition-colors"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>Flip Board</span>
              </button>

              <button
                onClick={resetGame}
                className="flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-judge-panel border border-judge-border hover:bg-judge-subtle text-xs font-semibold text-judge-muted hover:text-judge-text transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>New Match</span>
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
