'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Chess, Square } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { Color } from '@judge-chess/shared';
import { PromotionModal } from './PromotionModal';
import { soundService } from '@/lib/sound';

interface ChessBoardProps {
  fen: string;
  orientation: 'white' | 'black';
  isInteractive: boolean;
  playerColor?: Color;
  lastMove?: { from: string; to: string } | null;
  onMove?: (move: { from: string; to: string; promotion?: string }) => void;
  reviewArrows?: Array<[string, string, string]>; // [from, to, color]
  isReviewMode?: boolean;
}

export const ChessBoard: React.FC<ChessBoardProps> = ({
  fen,
  orientation,
  isInteractive,
  playerColor,
  lastMove,
  onMove,
  reviewArrows = [],
  isReviewMode = false
}) => {
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [possibleMoves, setPossibleMoves] = useState<Square[]>([]);
  const [pendingPromotion, setPendingPromotion] = useState<{ from: Square; to: Square } | null>(null);

  // Maintain local chess instance to compute legal highlights
  const chess = useMemo(() => new Chess(fen), [fen]);

  // King in check square detection
  const checkSquare = useMemo<Square | null>(() => {
    if (!chess.isCheck()) return null;
    const turn = chess.turn();
    const board = chess.board();
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = board[r][c];
        if (piece && piece.type === 'k' && piece.color === turn) {
          const file = String.fromCharCode(97 + c);
          const rank = 8 - r;
          return `${file}${rank}` as Square;
        }
      }
    }
    return null;
  }, [chess]);

  // Helper to determine if a pawn move is a promotion
  const isPawnPromotion = useCallback(
    (from: Square, to: Square): boolean => {
      const piece = chess.get(from);
      if (!piece || piece.type !== 'p') return false;
      const rank = to[1];
      return (piece.color === 'w' && rank === '8') || (piece.color === 'b' && rank === '1');
    },
    [chess]
  );

  // Compute possible legal destination squares for a given square
  const getLegalMovesForSquare = useCallback(
    (square: Square): Square[] => {
      try {
        const moves = chess.moves({ square, verbose: true });
        return moves.map((m) => m.to as Square);
      } catch {
        return [];
      }
    },
    [chess]
  );

  // Handle piece drop (drag and drop)
  const handlePieceDrop = (sourceSquare: Square, targetSquare: Square): boolean => {
    if (!isInteractive || isReviewMode) return false;

    // Check turn
    if (playerColor && chess.turn() !== playerColor) {
      return false;
    }

    // Verify it's legal in chess.js
    if (isPawnPromotion(sourceSquare, targetSquare)) {
      // Need promotion modal
      setPendingPromotion({ from: sourceSquare, to: targetSquare });
      return true;
    }

    try {
      const move = chess.move({
        from: sourceSquare,
        to: targetSquare
      });

      if (!move) return false;

      // Play sound
      if (move.captured) {
        soundService.playCapture();
      } else {
        soundService.playMove();
      }
      if (chess.isCheck()) {
        soundService.playCheck();
      }

      onMove?.({
        from: sourceSquare,
        to: targetSquare
      });

      setSelectedSquare(null);
      setPossibleMoves([]);
      return true;
    } catch {
      return false;
    }
  };

  // Handle square click (click piece, then click destination)
  const handleSquareClick = (square: Square) => {
    if (!isInteractive || isReviewMode) return;

    // If currently selecting promotion, do nothing
    if (pendingPromotion) return;

    // If clicking the already selected square, unselect
    if (selectedSquare === square) {
      setSelectedSquare(null);
      setPossibleMoves([]);
      return;
    }

    // If a square is already selected and target square is in possible moves
    if (selectedSquare && possibleMoves.includes(square)) {
      if (isPawnPromotion(selectedSquare, square)) {
        setPendingPromotion({ from: selectedSquare, to: square });
        return;
      }

      try {
        const move = chess.move({
          from: selectedSquare,
          to: square
        });

        if (move) {
          if (move.captured) {
            soundService.playCapture();
          } else {
            soundService.playMove();
          }
          if (chess.isCheck()) {
            soundService.playCheck();
          }

          onMove?.({
            from: selectedSquare,
            to: square
          });
        }
      } catch {
        // move failed
      }

      setSelectedSquare(null);
      setPossibleMoves([]);
      return;
    }

    // Otherwise, check if clicked square contains a piece belonging to player
    const piece = chess.get(square);
    if (piece) {
      // In local mode (no playerColor specified), allow moving active color
      // In multiplayer mode, only allow clicking own pieces
      if (!playerColor || piece.color === playerColor) {
        if (piece.color === chess.turn()) {
          setSelectedSquare(square);
          setPossibleMoves(getLegalMovesForSquare(square));
          return;
        }
      }
    }

    // Clicking empty square or invalid piece clears selection
    setSelectedSquare(null);
    setPossibleMoves([]);
  };

  // Finalize pawn promotion selection
  const handlePromotionSelect = (promotionPiece: 'q' | 'r' | 'b' | 'n') => {
    if (!pendingPromotion) return;

    const { from, to } = pendingPromotion;
    try {
      const move = chess.move({
        from,
        to,
        promotion: promotionPiece
      });

      if (move) {
        if (move.captured) {
          soundService.playCapture();
        } else {
          soundService.playMove();
        }
        if (chess.isCheck()) {
          soundService.playCheck();
        }

        onMove?.({
          from,
          to,
          promotion: promotionPiece
        });
      }
    } catch {
      // promotion failed
    }

    setPendingPromotion(null);
    setSelectedSquare(null);
    setPossibleMoves([]);
  };

  // Custom square styles for highlights
  const customSquareStyles = useMemo(() => {
    const styles: Record<string, React.CSSProperties> = {};

    // 1. Last move highlights
    if (lastMove) {
      styles[lastMove.from] = {
        backgroundColor: 'rgba(212, 163, 115, 0.28)'
      };
      styles[lastMove.to] = {
        backgroundColor: 'rgba(212, 163, 115, 0.36)'
      };
    }

    // 2. Selected square highlight
    if (selectedSquare) {
      styles[selectedSquare] = {
        backgroundColor: 'rgba(234, 179, 8, 0.45)',
        boxShadow: 'inset 0 0 0 2px rgba(234, 179, 8, 0.8)'
      };
    }

    // 3. Legal move destination indicators
    possibleMoves.forEach((sq) => {
      const destPiece = chess.get(sq);
      if (destPiece) {
        // Capture ring
        styles[sq] = {
          background: 'radial-gradient(circle, transparent 58%, rgba(239, 68, 68, 0.4) 60%)',
          borderRadius: '50%'
        };
      } else {
        // Subtle dot
        styles[sq] = {
          background: 'radial-gradient(circle, rgba(212, 163, 115, 0.65) 24%, transparent 26%)',
          borderRadius: '50%'
        };
      }
    });

    // 4. King in check highlight
    if (checkSquare) {
      styles[checkSquare] = {
        background: 'radial-gradient(circle, rgba(239, 68, 68, 0.9) 0%, rgba(239, 68, 68, 0.3) 75%, transparent 100%)',
        boxShadow: 'inset 0 0 8px 3px rgba(239, 68, 68, 0.8)'
      };
    }

    return styles;
  }, [lastMove, selectedSquare, possibleMoves, checkSquare, chess]);

  // Transform review arrows format
  const arrows = useMemo(() => {
    return reviewArrows.map(([from, to, color]) => [from as Square, to as Square, color] as [Square, Square, string]);
  }, [reviewArrows]);

  return (
    <div className="relative w-full max-w-[560px] aspect-square select-none judge-board-container mx-auto">
      <Chessboard
        position={fen}
        boardOrientation={orientation}
        onPieceDrop={handlePieceDrop}
        onSquareClick={handleSquareClick}
        arePiecesDraggable={isInteractive && !isReviewMode}
        animationDuration={160}
        customBoardStyle={{
          borderRadius: '8px',
          boxShadow: '0 8px 32px -8px rgba(0, 0, 0, 0.8)'
        }}
        customDarkSquareStyle={{
          backgroundColor: '#5e6878' // muted bronze-slate
        }}
        customLightSquareStyle={{
          backgroundColor: '#e8e2d4' // warm ivory / stone
        }}
        customSquareStyles={customSquareStyles}
        customArrows={arrows}
      />

      {/* Promotion Choice Modal */}
      <PromotionModal
        isOpen={pendingPromotion !== null}
        color={pendingPromotion ? (chess.get(pendingPromotion.from)?.color || 'w') : 'w'}
        onSelect={handlePromotionSelect}
        onCancel={() => setPendingPromotion(null)}
      />
    </div>
  );
};
