'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Menu, X, PlusCircle, LogIn, Swords, History, BookOpen, Volume2, VolumeX } from 'lucide-react';
import { soundService } from '@/lib/sound';

interface MobileHeaderProps {
  onOpenRules?: () => void;
}

export const MobileHeader: React.FC<MobileHeaderProps> = ({ onOpenRules }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(soundService.getMuted());

  const handleToggleSound = () => {
    const muted = soundService.toggleMute();
    setIsMuted(muted);
  };

  return (
    <header className="md:hidden flex items-center justify-between px-4 py-2.5 bg-judge-surface border-b border-judge-border sticky top-0 z-40">
      <Link href="/" className="flex items-center gap-2">
        <div className="w-7 h-7 rounded bg-judge-panel border border-judge-border flex items-center justify-center text-judge-accent font-bold text-sm">
          ♞
        </div>
        <div className="font-extrabold text-sm text-judge-text tracking-wide flex items-center gap-1">
          JUDGE
          <span className="text-[9px] uppercase px-1 py-0.2 rounded bg-amber-500/10 text-amber-400 font-semibold border border-amber-500/20">
            CHESS
          </span>
        </div>
      </Link>

      <div className="flex items-center gap-2">
        <button
          onClick={handleToggleSound}
          className="p-1.5 rounded-lg bg-judge-panel border border-judge-border text-judge-muted hover:text-judge-text"
          aria-label="Toggle sound"
        >
          {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
        </button>

        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-1.5 rounded-lg bg-judge-panel border border-judge-border text-judge-muted hover:text-judge-text"
          aria-label="Toggle navigation menu"
        >
          {isOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
        </button>
      </div>

      {/* Mobile Drawer Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 bg-judge-surface border-b border-judge-border p-4 shadow-2xl flex flex-col gap-2 z-50 animate-in slide-in-from-top-2 duration-150">
          <Link
            href="/#create"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-judge-text hover:bg-judge-panel"
          >
            <PlusCircle className="w-4 h-4 text-judge-accent" />
            <span>Create Game</span>
          </Link>

          <Link
            href="/#join"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-judge-text hover:bg-judge-panel"
          >
            <LogIn className="w-4 h-4 text-judge-accent" />
            <span>Join Game</span>
          </Link>

          <Link
            href="/play"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-judge-text hover:bg-judge-panel"
          >
            <Swords className="w-4 h-4 text-judge-accent" />
            <span>Pass & Play</span>
          </Link>

          <Link
            href="/history"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-judge-text hover:bg-judge-panel"
          >
            <History className="w-4 h-4 text-judge-accent" />
            <span>Game History</span>
          </Link>

          <button
            onClick={() => {
              setIsOpen(false);
              onOpenRules?.();
            }}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-judge-text hover:bg-judge-panel text-left"
          >
            <BookOpen className="w-4 h-4 text-judge-muted" />
            <span>How to Play</span>
          </button>
        </div>
      )}
    </header>
  );
};
