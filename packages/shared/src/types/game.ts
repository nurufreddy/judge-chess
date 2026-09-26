export type Color = 'w' | 'b';

export type TimeControlPreset = {
  id: string;
  name: string;
  initialMinutes: number;
  incrementSeconds: number;
  hasClock: boolean;
};

export const TIME_CONTROL_PRESETS: TimeControlPreset[] = [
  { id: '1m', name: '1 min', initialMinutes: 1, incrementSeconds: 0, hasClock: true },
  { id: '3m', name: '3 min', initialMinutes: 3, incrementSeconds: 0, hasClock: true },
  { id: '3m2s', name: '3 + 2', initialMinutes: 3, incrementSeconds: 2, hasClock: true },
  { id: '5m', name: '5 min', initialMinutes: 5, incrementSeconds: 0, hasClock: true },
  { id: '10m', name: '10 min', initialMinutes: 10, incrementSeconds: 0, hasClock: true },
  { id: '15m10s', name: '15 + 10', initialMinutes: 15, incrementSeconds: 10, hasClock: true },
  { id: 'none', name: 'No Clock', initialMinutes: 0, incrementSeconds: 0, hasClock: false }
];

export type GameStatus = 'waiting' | 'ready' | 'playing' | 'ended';

export type GameResult = '1-0' | '0-1' | '1/2-1/2' | null;

export type ResultReason =
  | 'checkmate'
  | 'stalemate'
  | 'resignation'
  | 'timeout'
  | 'draw_agreement'
  | 'insufficient_material'
  | 'threefold_repetition'
  | 'fifty_move_rule'
  | 'abandonment';

export interface PlayerInfo {
  id: string;
  name: string;
  color: Color;
  isReady: boolean;
  isConnected: boolean;
  joinedAt: number;
}

export interface MoveRecord {
  ply: number;
  moveNumber: number;
  playerColor: Color;
  from: string;
  to: string;
  promotion?: string;
  san: string;
  uci: string;
  fenBefore: string;
  fenAfter: string;
  captured?: string;
  isCheck: boolean;
  isCheckmate: boolean;
  timestamp: number;
  timeSpentMs?: number;
}

export interface ClockState {
  hasClock: boolean;
  whiteRemainingMs: number;
  blackRemainingMs: number;
  lastUpdateTimestamp: number;
  activeColor: Color | null;
  incrementMs: number;
}

export interface AuthoritativeGameState {
  gameId: string;
  roomCode: string;
  status: GameStatus;
  fen: string;
  pgn: string;
  turn: Color;
  moveHistory: MoveRecord[];
  whitePlayer: PlayerInfo | null;
  blackPlayer: PlayerInfo | null;
  clocks: ClockState;
  winner: Color | 'draw' | null;
  result: GameResult;
  resultReason: ResultReason | null;
  drawOfferedBy: Color | null;
  rematchRequestedBy: Color | null;
  analysisStatus: 'none' | 'analyzing' | 'completed' | 'failed';
  createdAt: number;
  startedAt: number | null;
  endedAt: number | null;
}
