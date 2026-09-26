'use client';

import React, { useState } from 'react';
import { AuthoritativeGameState, Color } from '@judge-chess/shared';
import { Copy, Check, Users, Clock, Play, Sparkles } from 'lucide-react';

interface GameLobbyProps {
  state: AuthoritativeGameState;
  localPlayerColor: Color | null;
  onStartGame: () => void;
  onReadyToggle: (isReady: boolean) => void;
}

export const GameLobby: React.FC<GameLobbyProps> = ({
  state,
  localPlayerColor,
  onStartGame,
  onReadyToggle
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/game/${state.roomCode}` : '';

  const handleCopyLink = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(state.roomCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const isBothPlayersPresent = state.whitePlayer && state.blackPlayer;
  const isHost = localPlayerColor === (state.whitePlayer ? 'w' : 'b');

  return (
    <div className="w-full max-w-lg mx-auto bg-judge-surface border border-judge-border rounded-2xl p-6 shadow-2xl space-y-6 animate-in fade-in zoom-in-95 duration-200">
      {/* Header */}
      <div className="text-center space-y-2 border-b border-judge-border pb-5">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-judge-panel border border-judge-border text-xs text-judge-muted font-medium">
          <Users className="w-3.5 h-3.5 text-judge-accent" />
          <span>Match Lobby</span>
        </div>
        <h1 className="text-2xl font-extrabold tracking-wider text-judge-text uppercase">
          ROOM <span className="text-judge-accent font-mono">{state.roomCode}</span>
        </h1>
        <p className="text-xs text-judge-muted">
          Share this link or room code with your opponent to begin.
        </p>
      </div>

      {/* Share Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          onClick={handleCopyLink}
          className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-judge-panel border border-judge-border hover:border-judge-accent/60 hover:bg-judge-subtle text-xs font-semibold text-judge-text transition-all group"
        >
          {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-judge-muted group-hover:text-judge-accent" />}
          <span>{copiedLink ? 'Invite link copied!' : 'Copy Invite Link'}</span>
        </button>

        <button
          onClick={handleCopyCode}
          className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-judge-panel border border-judge-border hover:border-judge-accent/60 hover:bg-judge-subtle text-xs font-semibold text-judge-text transition-all group"
        >
          {copiedCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-judge-muted group-hover:text-judge-accent" />}
          <span>{copiedCode ? 'Room code copied!' : `Copy Code: ${state.roomCode}`}</span>
        </button>
      </div>

      {/* Players Cards */}
      <div className="space-y-3">
        {/* White Player */}
        <div className="flex items-center justify-between p-4 rounded-xl bg-judge-panel border border-judge-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-zinc-200 border border-zinc-400 flex items-center justify-center text-zinc-900 font-bold text-sm shadow-inner">
              ♔
            </div>
            <div>
              <div className="text-xs text-judge-muted uppercase tracking-wider font-semibold">
                White
              </div>
              <div className="text-sm font-bold text-judge-text">
                {state.whitePlayer ? state.whitePlayer.name : 'Waiting for player...'}
              </div>
            </div>
          </div>

          <div>
            {state.whitePlayer ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs font-semibold">
                <Check className="w-3.5 h-3.5" />
                <span>Ready</span>
              </span>
            ) : (
              <span className="text-xs text-judge-muted animate-pulse">Waiting...</span>
            )}
          </div>
        </div>

        {/* Black Player */}
        <div className="flex items-center justify-between p-4 rounded-xl bg-judge-panel border border-judge-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-700 flex items-center justify-center text-zinc-200 font-bold text-sm shadow-inner">
              ♚
            </div>
            <div>
              <div className="text-xs text-judge-muted uppercase tracking-wider font-semibold">
                Black
              </div>
              <div className="text-sm font-bold text-judge-text">
                {state.blackPlayer ? state.blackPlayer.name : 'Waiting for opponent...'}
              </div>
            </div>
          </div>

          <div>
            {state.blackPlayer ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs font-semibold">
                <Check className="w-3.5 h-3.5" />
                <span>Ready</span>
              </span>
            ) : (
              <span className="text-xs text-judge-muted animate-pulse">Waiting...</span>
            )}
          </div>
        </div>
      </div>

      {/* Start Button / Status Feedback */}
      <div className="pt-2">
        {isBothPlayersPresent ? (
          <button
            onClick={onStartGame}
            className="w-full py-3.5 px-4 rounded-xl bg-judge-accent text-judge-bg font-bold text-sm tracking-wider uppercase hover:bg-judge-accentHover transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-900/20 active:scale-[0.99]"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Start Game</span>
          </button>
        ) : (
          <div className="p-3 rounded-xl bg-judge-panel/50 border border-judge-border text-center text-xs text-judge-muted flex items-center justify-center gap-2">
            <div className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            <span>Waiting for opponent to connect via public URL...</span>
          </div>
        )}
      </div>
    </div>
  );
};
