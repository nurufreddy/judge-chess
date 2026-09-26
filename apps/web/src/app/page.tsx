'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { TIME_CONTROL_PRESETS } from '@judge-chess/shared';
import { getSocket } from '@/lib/socket';
import { Sidebar } from '@/components/layout/Sidebar';
import { MobileHeader } from '@/components/layout/MobileHeader';
import { RulesModal } from '@/components/layout/RulesModal';
import {
  PlusCircle,
  LogIn,
  Swords,
  Clock,
  Sparkles,
  Trophy,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Users
} from 'lucide-react';
import Link from 'next/link';

export default function HomePage() {
  const router = useRouter();

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [joinModalOpen, setJoinModalOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);

  // Form states for Create Game
  const [hostName, setHostName] = useState('Nuru');
  const [selectedTimeControl, setSelectedTimeControl] = useState('5m');
  const [preferredColor, setPreferredColor] = useState<'w' | 'b' | 'random'>('random');
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Form states for Join Game
  const [joinName, setJoinName] = useState('Alex');
  const [joinRoomCode, setJoinRoomCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  const handleCreateGame = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hostName.trim()) return;

    setIsCreating(true);
    setCreateError(null);

    const socket = getSocket();
    socket.emit(
      'room:create',
      {
        playerName: hostName.trim(),
        preferredColor,
        timeControlId: selectedTimeControl
      },
      (res) => {
        setIsCreating(false);
        if (res.ok && res.roomCode && res.playerId && res.reconnectToken) {
          // Persist session to local storage for automatic reconnection on refresh
          localStorage.setItem(
            `judge_session_${res.roomCode}`,
            JSON.stringify({
              playerId: res.playerId,
              reconnectToken: res.reconnectToken,
              color: preferredColor === 'b' ? 'b' : 'w' // initial assignment
            })
          );
          router.push(`/game/${res.roomCode}`);
        } else {
          setCreateError(res.error || 'Failed to create room.');
        }
      }
    );
  };

  const handleJoinGame = (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinName.trim() || !joinRoomCode.trim()) return;

    setIsJoining(true);
    setJoinError(null);

    const code = joinRoomCode.trim().toUpperCase();
    const socket = getSocket();

    socket.emit(
      'room:join',
      {
        roomCode: code,
        playerName: joinName.trim()
      },
      (res) => {
        setIsJoining(false);
        if (res.ok && res.playerId && res.reconnectToken) {
          localStorage.setItem(
            `judge_session_${code}`,
            JSON.stringify({
              playerId: res.playerId,
              reconnectToken: res.reconnectToken
            })
          );
          router.push(`/game/${code}`);
        } else {
          setJoinError(res.error || 'Could not join room. Verify the code.');
        }
      }
    );
  };

  return (
    <div className="flex h-screen bg-judge-bg overflow-hidden">
      <Sidebar onOpenRules={() => setRulesOpen(true)} />
      <RulesModal isOpen={rulesOpen} onClose={() => setRulesOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <MobileHeader onOpenRules={() => setRulesOpen(true)} />

        <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8 md:py-16 flex flex-col items-center justify-center space-y-12">
          {/* Brand Hero */}
          <div className="text-center space-y-4 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-judge-surface border border-judge-border text-xs text-judge-muted font-medium mb-2 shadow-sm">
              <span className="text-base text-judge-accent">♞</span>
              <span className="text-judge-text font-bold">JUDGE CHESS</span>
              <span className="text-judge-border">•</span>
              <span className="text-amber-400">Real-Time Multiplayer</span>
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-judge-text">
              Play chess. <br className="hidden sm:inline" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-judge-accent via-amber-200 to-judge-accent">
                Then find out how good your moves really were.
              </span>
            </h1>

            <p className="text-sm md:text-base text-judge-muted max-w-lg mx-auto leading-relaxed">
              Two players on separate devices anywhere in the world. Server-authoritative moves, synchronized clocks, and deep Stockfish move-by-move post-game analysis.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
              <button
                id="create"
                onClick={() => setCreateModalOpen(true)}
                className="w-full sm:w-auto py-3.5 px-8 rounded-xl bg-judge-accent text-judge-bg font-extrabold text-sm tracking-wider uppercase hover:bg-judge-accentHover transition-all flex items-center justify-center gap-2 shadow-xl shadow-amber-950/20 active:scale-[0.99]"
              >
                <PlusCircle className="w-5 h-5" />
                <span>Create Game</span>
              </button>

              <button
                id="join"
                onClick={() => setJoinModalOpen(true)}
                className="w-full sm:w-auto py-3.5 px-8 rounded-xl bg-judge-surface border border-judge-border hover:border-judge-accent/60 hover:bg-judge-panel text-judge-text font-bold text-sm tracking-wide transition-all flex items-center justify-center gap-2 shadow-sm"
              >
                <LogIn className="w-5 h-5 text-judge-accent" />
                <span>Join Game</span>
              </button>

              <Link
                href="/play"
                className="w-full sm:w-auto py-3.5 px-6 rounded-xl bg-judge-panel/60 border border-judge-border hover:bg-judge-subtle text-judge-muted hover:text-judge-text font-semibold text-sm transition-all flex items-center justify-center gap-2"
              >
                <Swords className="w-4 h-4" />
                <span>Pass & Play</span>
              </Link>
            </div>
          </div>

          {/* How It Works (Section 10) */}
          <div className="w-full max-w-3xl bg-judge-surface border border-judge-border rounded-2xl p-6 md:p-8 shadow-xl">
            <div className="text-xs font-bold text-judge-muted tracking-widest uppercase mb-6 text-center">
              How Judge Chess Works
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
              <div className="p-4 rounded-xl bg-judge-panel border border-judge-border/80 flex flex-col items-center space-y-2">
                <div className="w-10 h-10 rounded-xl bg-judge-surface border border-judge-border flex items-center justify-center text-judge-accent font-bold text-lg">
                  1
                </div>
                <div className="font-bold text-sm text-judge-text">Invite a Friend</div>
                <p className="text-xs text-judge-muted leading-relaxed">
                  Create a game, copy the unique 5-letter invite URL, and share it. No sign-up required.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-judge-panel border border-judge-border/80 flex flex-col items-center space-y-2">
                <div className="w-10 h-10 rounded-xl bg-judge-surface border border-judge-border flex items-center justify-center text-emerald-400 font-bold text-lg">
                  2
                </div>
                <div className="font-bold text-sm text-judge-text">Play Normal Chess</div>
                <p className="text-xs text-judge-muted leading-relaxed">
                  Real-time synchronization with server validation. No engine assistance during live play.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-judge-panel border border-judge-border/80 flex flex-col items-center space-y-2">
                <div className="w-10 h-10 rounded-xl bg-judge-surface border border-judge-border flex items-center justify-center text-amber-400 font-bold text-lg">
                  3
                </div>
                <div className="font-bold text-sm text-judge-text">Get Your Game Judged</div>
                <p className="text-xs text-judge-muted leading-relaxed">
                  Stockfish grades every move: Exceptional, Best, Great, Good, Inaccuracies, Mistakes, Blunders.
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* CREATE GAME MODAL (Section 11) */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-judge-panel border border-judge-border rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-judge-border pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">♞</span>
                <h2 className="text-base font-bold text-judge-text uppercase tracking-wider">
                  Create Match
                </h2>
              </div>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="text-xs text-judge-muted hover:text-judge-text"
              >
                Close
              </button>
            </div>

            {createError && (
              <div className="p-2.5 rounded-lg bg-red-950/60 border border-red-500/40 text-red-300 text-xs">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateGame} className="space-y-4 text-xs">
              {/* Name */}
              <div>
                <label className="block text-judge-muted uppercase tracking-wider font-semibold mb-1.5">
                  Your Display Name
                </label>
                <input
                  type="text"
                  maxLength={20}
                  required
                  value={hostName}
                  onChange={(e) => setHostName(e.target.value)}
                  placeholder="e.g. Nuru"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-judge-surface border border-judge-border text-judge-text text-sm focus:outline-none focus:border-judge-accent"
                />
              </div>

              {/* Time Control */}
              <div>
                <label className="block text-judge-muted uppercase tracking-wider font-semibold mb-1.5">
                  Time Control
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {TIME_CONTROL_PRESETS.map((tc) => (
                    <button
                      key={tc.id}
                      type="button"
                      onClick={() => setSelectedTimeControl(tc.id)}
                      className={`p-2 rounded-lg border text-center font-semibold text-xs transition-colors ${
                        selectedTimeControl === tc.id
                          ? 'bg-judge-accent/20 border-judge-accent text-judge-accent font-bold'
                          : 'bg-judge-surface border-judge-border text-judge-muted hover:text-judge-text hover:bg-judge-subtle'
                      }`}
                    >
                      {tc.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color Selection */}
              <div>
                <label className="block text-judge-muted uppercase tracking-wider font-semibold mb-1.5">
                  Your Color Preference
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'w', label: 'White', icon: '♔' },
                    { id: 'random', label: 'Random', icon: '⚄' },
                    { id: 'b', label: 'Black', icon: '♚' }
                  ].map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setPreferredColor(c.id as any)}
                      className={`py-2 px-3 rounded-lg border flex items-center justify-center gap-1.5 text-xs font-semibold transition-colors ${
                        preferredColor === c.id
                          ? 'bg-judge-accent/20 border-judge-accent text-judge-accent font-bold'
                          : 'bg-judge-surface border-judge-border text-judge-muted hover:text-judge-text hover:bg-judge-subtle'
                      }`}
                    >
                      <span className="text-sm">{c.icon}</span>
                      <span>{c.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Post-game Judge Analysis */}
              <div className="p-3 rounded-xl bg-judge-surface border border-judge-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <div>
                    <div className="font-semibold text-judge-text text-xs">
                      Post-Game Stockfish Analysis
                    </div>
                    <div className="text-[10px] text-judge-muted">
                      Evaluates accuracy, best moves, mistakes & blunders
                    </div>
                  </div>
                </div>
                <span className="text-[10px] font-bold uppercase text-emerald-400 bg-emerald-950/60 border border-emerald-500/40 px-2 py-0.5 rounded">
                  Enabled
                </span>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isCreating || !hostName.trim()}
                  className="w-full py-3.5 px-4 rounded-xl bg-judge-accent text-judge-bg font-extrabold text-xs tracking-wider uppercase hover:bg-judge-accentHover disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-lg"
                >
                  <span>{isCreating ? 'Creating Room...' : 'Create Game'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* JOIN GAME MODAL */}
      {joinModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-judge-panel border border-judge-border rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-judge-border pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">♞</span>
                <h2 className="text-base font-bold text-judge-text uppercase tracking-wider">
                  Join Match
                </h2>
              </div>
              <button
                onClick={() => setJoinModalOpen(false)}
                className="text-xs text-judge-muted hover:text-judge-text"
              >
                Close
              </button>
            </div>

            {joinError && (
              <div className="p-2.5 rounded-lg bg-red-950/60 border border-red-500/40 text-red-300 text-xs">
                {joinError}
              </div>
            )}

            <form onSubmit={handleJoinGame} className="space-y-4 text-xs">
              <div>
                <label className="block text-judge-muted uppercase tracking-wider font-semibold mb-1.5">
                  Your Display Name
                </label>
                <input
                  type="text"
                  maxLength={20}
                  required
                  value={joinName}
                  onChange={(e) => setJoinName(e.target.value)}
                  placeholder="e.g. Alex"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-judge-surface border border-judge-border text-judge-text text-sm focus:outline-none focus:border-judge-accent"
                />
              </div>

              <div>
                <label className="block text-judge-muted uppercase tracking-wider font-semibold mb-1.5">
                  5-Letter Room Code
                </label>
                <input
                  type="text"
                  maxLength={5}
                  required
                  value={joinRoomCode}
                  onChange={(e) => setJoinRoomCode(e.target.value.toUpperCase())}
                  placeholder="e.g. H7K2Q"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-judge-surface border border-judge-border text-judge-text text-sm font-mono tracking-widest uppercase focus:outline-none focus:border-judge-accent"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isJoining || !joinName.trim() || !joinRoomCode.trim()}
                  className="w-full py-3.5 px-4 rounded-xl bg-judge-accent text-judge-bg font-extrabold text-xs tracking-wider uppercase hover:bg-judge-accentHover disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-lg"
                >
                  <span>{isJoining ? 'Joining Match...' : 'Join Game'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
