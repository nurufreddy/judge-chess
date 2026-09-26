import { Color } from './game.js';

export type MoveClassification =
  | 'EXCEPTIONAL'
  | 'BEST'
  | 'GREAT'
  | 'GOOD'
  | 'INACCURACY'
  | 'MISTAKE'
  | 'BLUNDER';

export interface ClassificationMeta {
  type: MoveClassification;
  label: string;
  symbol: string;
  colorHex: string;
  badgeBg: string;
  badgeText: string;
  description: string;
}

export interface EngineEvaluation {
  scoreCp: number | null; // In centipawns from White's perspective (+ = White advantage, - = Black advantage)
  mateIn: number | null;  // Mate in N moves from White's perspective (+N = White mates, -N = Black mates)
  depth: number;
  bestMoveUci: string;
  bestMoveSan?: string;
  pv: string[]; // principal variation
}

export interface MoveAnalysis {
  ply: number;
  moveNumber: number;
  playerColor: Color;
  san: string;
  uci: string;
  fenBefore: string;
  fenAfter: string;
  evalBefore: EngineEvaluation;
  evalAfter: EngineEvaluation;
  bestMoveUci: string;
  bestMoveSan: string;
  centipawnLoss: number;
  classification: MoveClassification;
  explanation?: string;
  isMoveOfGame?: boolean;
}

export interface ClassificationBreakdown {
  exceptional: number;
  best: number;
  great: number;
  good: number;
  inaccuracy: number;
  mistake: number;
  blunder: number;
}

export interface GameJudgeSummary {
  gameId: string;
  whiteAccuracy: number;
  blackAccuracy: number;
  whiteBreakdown: ClassificationBreakdown;
  blackBreakdown: ClassificationBreakdown;
  moveOfTheGamePly: number | null;
  moveOfTheGameExplanation?: string;
  analyzedMoves: MoveAnalysis[];
  analysisDepth: number;
  completedAt: number;
}
