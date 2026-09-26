import { ClassificationMeta, MoveClassification } from '../types/analysis.js';

export const CLASSIFICATION_META: Record<MoveClassification, ClassificationMeta> = {
  EXCEPTIONAL: {
    type: 'EXCEPTIONAL',
    label: 'Exceptional',
    symbol: '◆',
    colorHex: '#38bdf8', // vivid sky
    badgeBg: 'bg-sky-950/80 border-sky-500/50',
    badgeText: 'text-sky-300',
    description: 'An extraordinary, high-impact tactical or strategic move.'
  },
  BEST: {
    type: 'BEST',
    label: 'Best',
    symbol: '✓',
    colorHex: '#10b981', // emerald
    badgeBg: 'bg-emerald-950/80 border-emerald-500/50',
    badgeText: 'text-emerald-300',
    description: 'The top choice found by the chess engine.'
  },
  GREAT: {
    type: 'GREAT',
    label: 'Great',
    symbol: '★',
    colorHex: '#06b6d4', // cyan
    badgeBg: 'bg-cyan-950/80 border-cyan-500/50',
    badgeText: 'text-cyan-300',
    description: 'An extremely strong move that maintains the full initiative.'
  },
  GOOD: {
    type: 'GOOD',
    label: 'Good',
    symbol: '●',
    colorHex: '#94a3b8', // slate
    badgeBg: 'bg-slate-800/80 border-slate-600/50',
    badgeText: 'text-slate-300',
    description: 'A solid move preserving the position.'
  },
  INACCURACY: {
    type: 'INACCURACY',
    label: 'Inaccuracy',
    symbol: '△',
    colorHex: '#f59e0b', // amber
    badgeBg: 'bg-amber-950/80 border-amber-500/50',
    badgeText: 'text-amber-300',
    description: 'A suboptimal move that lets some advantage slip away.'
  },
  MISTAKE: {
    type: 'MISTAKE',
    label: 'Mistake',
    symbol: '!',
    colorHex: '#f97316', // orange
    badgeBg: 'bg-orange-950/80 border-orange-500/50',
    badgeText: 'text-orange-300',
    description: 'A clear error that noticeably harms the position.'
  },
  BLUNDER: {
    type: 'BLUNDER',
    label: 'Blunder',
    symbol: '✕',
    colorHex: '#ef4444', // red
    badgeBg: 'bg-red-950/80 border-red-500/50',
    badgeText: 'text-red-300',
    description: 'A severe mistake that severely hurts the position.'
  }
};

/**
 * Centipawn Loss thresholds for classification
 */
export const CLASSIFICATION_THRESHOLDS = {
  bestMaxLoss: 8,       // <= 8 cp loss is Best
  greatMaxLoss: 25,     // <= 25 cp loss is Great
  goodMaxLoss: 60,      // <= 60 cp loss is Good
  inaccuracyMaxLoss: 140, // <= 140 cp loss is Inaccuracy
  mistakeMaxLoss: 300,    // <= 300 cp loss is Mistake
  // > 300 cp loss is Blunder
};
