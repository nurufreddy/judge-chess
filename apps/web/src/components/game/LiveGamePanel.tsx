'use client';

import React, { useState } from 'react';
import { AuthoritativeGameState, Color } from '@judge-chess/shared';
import { MoveHistory } from '../chess/MoveHistory';
import { Flag, Handshake, RotateCw, Volume2, VolumeX, ShieldAlert, Check } from 'lucide-react';
import { soundService } from '@/lib/sound';

interface LiveGamePanelProps {
  state: AuthoritativeGameState;
  playerColor: Color | null;
  onOfferDraw: () => void;
  onAcceptDraw: () => void;
  onDeclineDraw: () => void;
  onResign: () => void;
  onFlipBoard: () => void;
}

export const LiveGamePanel: React.FC<LiveGamePanelProps> = ({
  state,
  playerColor,
  onOfferDraw,
  onAcceptDraw,
  onDeclineDraw,
  onResign,
  onFlipBoard
}) => {
  const [showResignModal, setShowResignModal] = useState(false);
  const [isMuted, setIsMuted] = useState(soundService.getMuted());

  const isMyTurn = state.turn === playerColor;
  const isDrawOfferedToMe = state.drawOfferedBy && state.drawOfferedBy !== playerColor;
  const isMyDrawOfferPending = state.drawOfferedBy === playerColor;

  const handleToggleSound = () => {
    const muted = soundService.toggleMute();
    setIsMuted(muted);
  };

  return (
    <div className="w-full bg-judge-surface border border-judge-border rounded-xl p-4 flex flex-col h-[560px] shadow-xl">
      {/* Header / Game Status */}
      <div className="flex items-center justify-between pb-3 border-b border-judge-border">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-bold uppercase tracking-wider text-judge-text">
            Live Match
          </span>
        </div>
        <span className="text-xs font-mono text-judge-muted">
          Move {Math.floor(state.moveHistory.length / 2) + 1}
        </span>
      </div>

      {/* Turn indicator */}
      <div className="my-3">
        <div
          className={`p-2.5 rounded-lg text-center font-semibold text-xs tracking-wide transition-all ${
            isMyTurn
              ? 'bg-amber-500/10 border border-amber-500/30 text-amber-300'
              : 'bg-judge-panel border border-judge-border text-judge-muted'
          }`}
        >
          {isMyTurn ? '● YOUR TURN' : "Opponent's turn"}
        </div>
      </div>

      {/* Draw Offer Notification */}
      {isDrawOfferedToMe && (
        <div className="mb-3 p-3 rounded-lg bg-sky-950/80 border border-sky-500/50 text-sky-200 text-xs flex flex-col gap-2 animate-in fade-in duration-150">
          <div className="font-semibold flex items-center gap-1.5">
            <Handshake className="w-4 h-4 text-sky-400" />
            <span>Opponent offered a draw.</span>
          </div>
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              onClick={onAcceptDraw}
              className="py-1.5 px-3 rounded bg-sky-500 text-judge-bg font-bold text-[11px] hover:bg-sky-400 transition-colors"
            >
              Accept Draw
            </button>
            <button
              onClick={onDeclineDraw}
              className="py-1.5 px-3 rounded bg-judge-panel border border-judge-border text-judge-muted hover:text-judge-text text-[11px] transition-colors"
            >
              Decline
            </button>
          </div>
        </div>
      )}

      {/* Move History */}
      <div className="flex-1 flex flex-col min-h-0 bg-judge-panel/50 rounded-lg p-2 border border-judge-border/80">
        <div className="text-[11px] font-semibold text-judge-muted uppercase tracking-wider px-2 py-1 border-b border-judge-border/50">
          Move History
        </div>
        <MoveHistory
          moves={state.moveHistory}
          currentPlyIndex={state.moveHistory.length - 1}
          isReviewMode={false}
        />
      </div>

      {/* Actions */}
      <div className="pt-3 border-t border-judge-border space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={onOfferDraw}
            disabled={isMyDrawOfferPending || !!state.drawOfferedBy}
            className="flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-judge-panel border border-judge-border hover:bg-judge-subtle text-xs font-semibold text-judge-muted hover:text-judge-text disabled:opacity-50 transition-colors"
          >
            <Handshake className="w-3.5 h-3.5" />
            <span>{isMyDrawOfferPending ? 'Draw Offered' : 'Offer Draw'}</span>
          </button>

          <button
            onClick={() => setShowResignModal(true)}
            className="flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-judge-panel border border-judge-border hover:border-red-500/40 hover:bg-red-950/20 text-xs font-semibold text-judge-muted hover:text-red-400 transition-colors"
          >
            <Flag className="w-3.5 h-3.5" />
            <span>Resign</span>
          </button>
        </div>

        <div className="flex items-center justify-between pt-1 text-xs text-judge-muted">
          <button
            onClick={onFlipBoard}
            className="flex items-center gap-1.5 hover:text-judge-text transition-colors p-1"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>Flip Board</span>
          </button>

          <button
            onClick={handleToggleSound}
            className="flex items-center gap-1.5 hover:text-judge-text transition-colors p-1"
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5 text-red-400" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-400" />}
            <span>{isMuted ? 'Muted' : 'Sound On'}</span>
          </button>
        </div>
      </div>

      {/* Resignation Confirmation Modal */}
      {showResignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-judge-panel border border-judge-border rounded-xl max-w-xs w-full p-5 text-center shadow-2xl space-y-4">
            <div className="w-10 h-10 rounded-full bg-red-950/60 border border-red-500/40 text-red-400 flex items-center justify-center mx-auto">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-judge-text">Resign Match?</h3>
              <p className="text-xs text-judge-muted mt-1">
                Are you sure you want to resign? Your opponent will win the game.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                onClick={() => setShowResignModal(false)}
                className="py-2 px-3 rounded-lg bg-judge-surface border border-judge-border text-xs text-judge-muted hover:text-judge-text transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowResignModal(false);
                  onResign();
                }}
                className="py-2 px-3 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-xs transition-colors"
              >
                Confirm Resign
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
