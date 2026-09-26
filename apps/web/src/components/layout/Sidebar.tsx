'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  PlusCircle,
  LogIn,
  Swords,
  History,
  BookOpen,
  Volume2,
  VolumeX,
  HelpCircle,
  Wifi,
  Sparkles
} from 'lucide-react';
import { soundService } from '@/lib/sound';

interface SidebarProps {
  socketConnected?: boolean;
  onOpenRules?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ socketConnected = true, onOpenRules }) => {
  const pathname = usePathname();
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    setIsMuted(soundService.getMuted());
  }, []);

  const handleToggleSound = () => {
    const muted = soundService.toggleMute();
    setIsMuted(muted);
  };

  const navItems = [
    { label: 'Create Game', href: '/#create', icon: PlusCircle },
    { label: 'Join Game', href: '/#join', icon: LogIn },
    { label: 'Pass & Play', href: '/play', icon: Swords },
    { label: 'Game History', href: '/history', icon: History }
  ];

  return (
    <aside className="hidden md:flex flex-col w-52 bg-judge-surface border-r border-judge-border select-none h-screen sticky top-0 shrink-0">
      {/* Brand Header */}
      <div className="p-5 border-b border-judge-border">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-lg bg-judge-panel border border-judge-border flex items-center justify-center text-judge-accent font-bold text-xl group-hover:border-judge-accent transition-colors shadow-sm">
            ♞
          </div>
          <div>
            <div className="font-extrabold tracking-wider text-base text-judge-text flex items-center gap-1.5">
              JUDGE
              <span className="text-[10px] tracking-widest uppercase px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 font-semibold border border-amber-500/20">
                CHESS
              </span>
            </div>
            <div className="text-[10px] text-judge-muted font-medium tracking-tight">
              Post-Game Analysis
            </div>
          </div>
        </Link>
      </div>

      {/* Primary Navigation */}
      <div className="flex-1 py-4 px-3 space-y-1">
        <div className="px-3 py-1.5 text-[11px] font-semibold text-judge-muted uppercase tracking-wider">
          Play
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-judge-panel text-judge-accent font-semibold border border-judge-border'
                  : 'text-judge-muted hover:text-judge-text hover:bg-judge-panel/60'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-judge-accent' : 'text-judge-muted'}`} />
              <span>{item.label}</span>
            </Link>
          );
        })}

        <div className="pt-4 px-3 py-1.5 text-[11px] font-semibold text-judge-muted uppercase tracking-wider">
          Features
        </div>

        <button
          onClick={onOpenRules}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-judge-muted hover:text-judge-text hover:bg-judge-panel/60 transition-all text-left"
        >
          <BookOpen className="w-4 h-4 text-judge-muted" />
          <span>How to Play</span>
        </button>

        <div className="px-3 pt-3">
          <div className="p-3 rounded-lg bg-judge-panel/80 border border-judge-border text-xs text-judge-muted">
            <div className="flex items-center gap-1.5 text-judge-text font-semibold mb-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Judge Engine</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              Every move is evaluated with Stockfish and classified by accuracy.
            </p>
          </div>
        </div>
      </div>

      {/* Footer / Controls */}
      <div className="p-3 border-t border-judge-border space-y-2">
        <button
          onClick={handleToggleSound}
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-judge-muted hover:text-judge-text hover:bg-judge-panel transition-all"
        >
          <div className="flex items-center gap-2">
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
            <span>Sound</span>
          </div>
          <span className="text-[10px] uppercase font-bold text-judge-muted">
            {isMuted ? 'Off' : 'On'}
          </span>
        </button>

        <div className="flex items-center justify-between px-3 py-1.5 text-[11px] text-judge-muted">
          <div className="flex items-center gap-1.5">
            <Wifi className={`w-3.5 h-3.5 ${socketConnected ? 'text-emerald-400' : 'text-amber-400 animate-pulse'}`} />
            <span>{socketConnected ? 'Online' : 'Connecting...'}</span>
          </div>
          <span className="text-[10px] text-judge-muted/70 font-mono">v1.0</span>
        </div>
      </div>
    </aside>
  );
};
