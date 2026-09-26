'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Sidebar } from '@/components/layout/Sidebar';
import { MobileHeader } from '@/components/layout/MobileHeader';
import { RulesModal } from '@/components/layout/RulesModal';
import { Trophy, Clock, BarChart2, Swords, Calendar } from 'lucide-react';

interface StoredGame {
  id: string;
  roomCode: string;
  whitePlayerName: string;
  blackPlayerName: string;
  winner: string | null;
  result: string | null;
  resultReason: string | null;
  startedAt: number | null;
  endedAt: number | null;
  whiteAccuracy?: number;
  blackAccuracy?: number;
  hasAnalysis: boolean;
}

export default function HistoryPage() {
  const [games, setGames] = useState<StoredGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [rulesOpen, setRulesOpen] = useState(false);

  useEffect(() => {
    fetch('/api/history')
      .then((res) => res.json())
      .then((data) => {
        if (data.games) {
          setGames(data.games);
        }
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  return (
    <div className="flex h-screen bg-judge-bg overflow-hidden">
      <Sidebar onOpenRules={() => setRulesOpen(true)} />
      <RulesModal isOpen={rulesOpen} onClose={() => setRulesOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <MobileHeader onOpenRules={() => setRulesOpen(true)} />

        <main className="flex-1 max-w-4xl w-full mx-auto p-4 md:p-8 space-y-6">
          <div className="flex items-center justify-between border-b border-judge-border pb-4">
            <div>
              <h1 className="text-xl font-black uppercase tracking-wider text-judge-text flex items-center gap-2">
                <span>♞</span>
                <span>Match History</span>
              </h1>
              <p className="text-xs text-judge-muted mt-0.5">
                Past matches played on Judge Chess with engine analysis
              </p>
            </div>

            <Link
              href="/"
              className="py-2 px-3.5 rounded-lg bg-judge-accent text-judge-bg font-bold text-xs uppercase tracking-wider hover:bg-judge-accentHover transition-colors"
            >
              Play Match
            </Link>
          </div>

          {loading ? (
            <div className="text-center py-16 text-xs text-judge-muted flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-judge-accent border-t-transparent rounded-full animate-spin" />
              <span>Loading game history...</span>
            </div>
          ) : games.length === 0 ? (
            <div className="text-center py-20 bg-judge-surface border border-judge-border rounded-2xl p-8 space-y-3">
              <div className="w-12 h-12 rounded-full bg-judge-panel border border-judge-border text-judge-muted flex items-center justify-center mx-auto text-xl">
                <Swords className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-judge-text">No matches recorded yet</h3>
              <p className="text-xs text-judge-muted max-w-xs mx-auto">
                Completed games will appear here with move accuracies and Stockfish review records.
              </p>
              <div className="pt-2">
                <Link
                  href="/"
                  className="inline-block py-2 px-4 rounded-xl bg-judge-panel border border-judge-border hover:bg-judge-subtle text-xs font-semibold text-judge-accent"
                >
                  Start First Game
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {games.map((g) => {
                const dateStr = g.endedAt
                  ? new Date(g.endedAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })
                  : 'Recent';

                return (
                  <div
                    key={g.id}
                    className="p-4 rounded-xl bg-judge-surface border border-judge-border hover:border-judge-accent/50 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-judge-text">
                          {g.whitePlayerName}
                        </span>
                        <span className="text-xs text-judge-muted font-mono">vs</span>
                        <span className="font-bold text-sm text-judge-text">
                          {g.blackPlayerName}
                        </span>
                        <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-judge-panel border border-judge-border text-judge-accent ml-2">
                          {g.result || '1/2-1/2'}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-[11px] text-judge-muted">
                        <span className="capitalize">{g.resultReason || 'Completed'}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1 font-mono">
                          <Calendar className="w-3 h-3" />
                          <span>{dateStr}</span>
                        </span>
                        <span>•</span>
                        <span className="font-mono uppercase text-judge-accent">
                          Room {g.roomCode}
                        </span>
                      </div>
                    </div>

                    {/* Accuracies & Review CTA */}
                    <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-2 sm:pt-0 border-judge-border/50">
                      {g.whiteAccuracy !== undefined && g.blackAccuracy !== undefined ? (
                        <div className="text-right">
                          <div className="text-xs font-mono font-bold text-judge-text">
                            {g.whiteAccuracy.toFixed(0)}% vs {g.blackAccuracy.toFixed(0)}%
                          </div>
                          <div className="text-[10px] text-judge-muted uppercase">
                            Judge Accuracy
                          </div>
                        </div>
                      ) : null}

                      <Link
                        href={`/game/${g.roomCode}`}
                        className="py-2 px-3.5 rounded-lg bg-judge-panel border border-judge-border hover:border-judge-accent hover:bg-judge-subtle text-xs font-semibold text-judge-accent flex items-center gap-1.5 transition-colors"
                      >
                        <BarChart2 className="w-3.5 h-3.5" />
                        <span>Review</span>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
