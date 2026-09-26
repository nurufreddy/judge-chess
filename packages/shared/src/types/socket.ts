import { AuthoritativeGameState, Color, GameResult, ResultReason } from './game.js';
import { GameJudgeSummary } from './analysis.js';

export interface CreateRoomPayload {
  playerName: string;
  preferredColor: 'w' | 'b' | 'random';
  timeControlId: string;
}

export interface JoinRoomPayload {
  roomCode: string;
  playerName: string;
}

export interface MakeMovePayload {
  roomCode: string;
  from: string;
  to: string;
  promotion?: string;
}

export interface ReconnectSessionPayload {
  roomCode: string;
  playerId: string;
  reconnectToken: string;
}

export interface ClientToServerEvents {
  'room:create': (payload: CreateRoomPayload, callback: (res: { ok: boolean; roomCode?: string; playerId?: string; reconnectToken?: string; error?: string }) => void) => void;
  'room:join': (payload: JoinRoomPayload, callback: (res: { ok: boolean; playerId?: string; reconnectToken?: string; error?: string }) => void) => void;
  'player:ready': (payload: { roomCode: string; isReady: boolean }) => void;
  'game:start': (payload: { roomCode: string }) => void;
  'game:move': (payload: MakeMovePayload, callback?: (res: { ok: boolean; error?: string }) => void) => void;
  'game:offer-draw': (payload: { roomCode: string }) => void;
  'game:accept-draw': (payload: { roomCode: string }) => void;
  'game:decline-draw': (payload: { roomCode: string }) => void;
  'game:resign': (payload: { roomCode: string }) => void;
  'game:request-rematch': (payload: { roomCode: string }) => void;
  'game:accept-rematch': (payload: { roomCode: string }) => void;
  'game:decline-rematch': (payload: { roomCode: string }) => void;
  'game:request-analysis': (payload: { roomCode: string }) => void;
  'session:reconnect': (payload: ReconnectSessionPayload, callback: (res: { ok: boolean; state?: AuthoritativeGameState; error?: string }) => void) => void;
}

export interface ServerToClientEvents {
  'room:created': (data: { roomCode: string; playerId: string; reconnectToken: string; state: AuthoritativeGameState }) => void;
  'room:updated': (data: { state: AuthoritativeGameState }) => void;
  'room:error': (data: { message: string }) => void;
  'game:started': (data: { state: AuthoritativeGameState }) => void;
  'game:state': (data: { state: AuthoritativeGameState }) => void;
  'game:move-accepted': (data: { state: AuthoritativeGameState }) => void;
  'game:move-rejected': (data: { reason: string }) => void;
  'game:draw-offered': (data: { by: Color; playerName: string }) => void;
  'game:draw-declined': () => void;
  'game:ended': (data: { winner: Color | 'draw'; result: GameResult; reason: ResultReason; state: AuthoritativeGameState }) => void;
  'player:disconnected': (data: { color: Color; playerName: string; gracePeriodSeconds: number }) => void;
  'player:reconnected': (data: { color: Color; playerName: string }) => void;
  'game:rematch-requested': (data: { by: Color; playerName: string }) => void;
  'game:rematch-started': (data: { state: AuthoritativeGameState }) => void;
  'analysis:progress': (data: { current: number; total: number; percentage: number }) => void;
  'analysis:completed': (data: { summary: GameJudgeSummary }) => void;
  'analysis:failed': (data: { message: string }) => void;
}
