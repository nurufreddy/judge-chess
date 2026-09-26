import { Chess } from 'chess.js';
import { v4 as uuidv4 } from 'uuid';
import {
  AuthoritativeGameState,
  Color,
  GameResult,
  GameStatus,
  MoveRecord,
  PlayerInfo,
  ResultReason,
  TIME_CONTROL_PRESETS
} from '@judge-chess/shared';
import { ClockManager } from './ClockManager.js';
import { config } from '../config.js';

export interface PlayerSession {
  id: string;
  socketId: string;
  name: string;
  color: Color;
  isReady: boolean;
  isConnected: boolean;
  reconnectToken: string;
  joinedAt: number;
}

export class GameRoom {
  public readonly gameId: string;
  public readonly roomCode: string;
  public status: GameStatus = 'waiting';

  private chess: Chess;
  private clockManager: ClockManager;
  private timeControlId: string;
  private preferredColor: 'w' | 'b' | 'random';

  private players: Map<string, PlayerSession> = new Map(); // socketId -> session
  private playerSessionsById: Map<string, PlayerSession> = new Map(); // playerId -> session
  private reconnectTokenMap: Map<string, string> = new Map(); // reconnectToken -> playerId

  private moveHistory: MoveRecord[] = [];
  private drawOfferedBy: Color | null = null;
  private rematchRequestedBy: Color | null = null;

  public winner: Color | 'draw' | null = null;
  public result: GameResult = null;
  public resultReason: ResultReason | null = null;
  public analysisStatus: 'none' | 'analyzing' | 'completed' | 'failed' = 'none';

  public createdAt: number;
  public startedAt: number | null = null;
  public endedAt: number | null = null;

  private disconnectTimers: Map<string, NodeJS.Timeout> = new Map();
  private onGameEndCallback?: (room: GameRoom) => void;

  constructor(
    roomCode: string,
    preferredColor: 'w' | 'b' | 'random' = 'random',
    timeControlId: string = '5m',
    onGameEnd?: (room: GameRoom) => void
  ) {
    this.gameId = uuidv4();
    this.roomCode = roomCode;
    this.chess = new Chess();
    this.createdAt = Date.now();
    this.preferredColor = preferredColor;
    this.timeControlId = timeControlId;
    this.onGameEndCallback = onGameEnd;

    const preset = TIME_CONTROL_PRESETS.find((p) => p.id === timeControlId) || TIME_CONTROL_PRESETS[3]; // default 5m

    this.clockManager = new ClockManager({
      hasClock: preset.hasClock,
      initialMinutes: preset.initialMinutes,
      incrementSeconds: preset.incrementSeconds,
      onTimeout: (timedOutColor: Color) => {
        this.handleTimeout(timedOutColor);
      }
    });
  }

  public addPlayer(
    socketId: string,
    name: string
  ): { ok: boolean; player?: PlayerSession; error?: string } {
    if (this.playerSessionsById.size >= 2) {
      return { ok: false, error: 'This game is already full.' };
    }

    if (this.status === 'ended') {
      return { ok: false, error: 'The game has already ended.' };
    }

    let assignedColor: Color;
    if (this.playerSessionsById.size === 0) {
      // First player (Host)
      if (this.preferredColor === 'w') {
        assignedColor = 'w';
      } else if (this.preferredColor === 'b') {
        assignedColor = 'b';
      } else {
        assignedColor = Math.random() < 0.5 ? 'w' : 'b';
      }
    } else {
      // Second player receives remaining color
      const existing = Array.from(this.playerSessionsById.values())[0];
      assignedColor = existing.color === 'w' ? 'b' : 'w';
    }

    const playerId = uuidv4();
    const reconnectToken = uuidv4();

    const session: PlayerSession = {
      id: playerId,
      socketId,
      name: name.trim() || (assignedColor === 'w' ? 'White Player' : 'Black Player'),
      color: assignedColor,
      isReady: true, // Host is ready by default
      isConnected: true,
      reconnectToken,
      joinedAt: Date.now()
    };

    this.players.set(socketId, session);
    this.playerSessionsById.set(playerId, session);
    this.reconnectTokenMap.set(reconnectToken, playerId);

    if (this.playerSessionsById.size === 2) {
      this.status = 'ready';
    }

    return { ok: true, player: session };
  }

  public reconnectPlayer(
    socketId: string,
    playerId: string,
    reconnectToken: string
  ): { ok: boolean; session?: PlayerSession; error?: string } {
    const verifiedPlayerId = this.reconnectTokenMap.get(reconnectToken);
    if (!verifiedPlayerId || verifiedPlayerId !== playerId) {
      return { ok: false, error: 'Invalid or expired reconnect token.' };
    }

    const session = this.playerSessionsById.get(playerId);
    if (!session) {
      return { ok: false, error: 'Player session not found.' };
    }

    // Cancel disconnection timer if running
    const timer = this.disconnectTimers.get(playerId);
    if (timer) {
      clearTimeout(timer);
      this.disconnectTimers.delete(playerId);
    }

    // Remove old socket mapping
    this.players.delete(session.socketId);

    // Update socket mapping
    session.socketId = socketId;
    session.isConnected = true;
    this.players.set(socketId, session);

    return { ok: true, session };
  }

  public handleDisconnect(socketId: string): { disconnectedColor: Color; playerName: string } | null {
    const session = this.players.get(socketId);
    if (!session) return null;

    session.isConnected = false;

    // If game is actively playing, give grace period before forfeit
    if (this.status === 'playing') {
      const timer = setTimeout(() => {
        if (!session.isConnected && this.status === 'playing') {
          // Player abandoned
          const winnerColor = session.color === 'w' ? 'b' : 'w';
          this.endGame(winnerColor, winnerColor === 'w' ? '1-0' : '0-1', 'abandonment');
        }
      }, config.reconnectGracePeriodMs);

      this.disconnectTimers.set(session.id, timer);
    }

    return { disconnectedColor: session.color, playerName: session.name };
  }

  public setPlayerReady(playerId: string, isReady: boolean): boolean {
    const session = this.playerSessionsById.get(playerId);
    if (!session) return false;

    session.isReady = isReady;

    // If both ready and 2 players, auto-start
    if (this.playerSessionsById.size === 2) {
      const allReady = Array.from(this.playerSessionsById.values()).every((p) => p.isReady);
      if (allReady && this.status !== 'playing') {
        this.startGame();
      }
    }

    return true;
  }

  public startGame(): boolean {
    if (this.playerSessionsById.size !== 2) return false;
    this.status = 'playing';
    this.startedAt = Date.now();
    this.clockManager.start('w');
    return true;
  }

  public makeMove(
    socketId: string,
    from: string,
    to: string,
    promotion?: string
  ): { ok: boolean; error?: string } {
    if (this.status !== 'playing') {
      return { ok: false, error: 'Game is not currently active.' };
    }

    const session = this.players.get(socketId);
    if (!session) {
      return { ok: false, error: 'Unauthorized player.' };
    }

    const turn = this.chess.turn() as Color;
    if (session.color !== turn) {
      return { ok: false, error: 'Not your turn.' };
    }

    try {
      const fenBefore = this.chess.fen();
      const res = this.chess.move({
        from,
        to,
        promotion: promotion || 'q'
      });

      if (!res) {
        return { ok: false, error: 'Illegal move.' };
      }

      // Update clocks authoritatively
      const clockUpdate = this.clockManager.onMove(turn);

      // Record move
      const ply = this.moveHistory.length;
      const record: MoveRecord = {
        ply,
        moveNumber: Math.floor(ply / 2) + 1,
        playerColor: res.color as Color,
        from: res.from,
        to: res.to,
        promotion: res.promotion,
        san: res.san,
        uci: `${res.from}${res.to}${res.promotion || ''}`,
        fenBefore,
        fenAfter: this.chess.fen(),
        captured: res.captured,
        isCheck: this.chess.isCheck(),
        isCheckmate: this.chess.isCheckmate(),
        timestamp: Date.now(),
        timeSpentMs: clockUpdate.timeSpentMs
      };

      this.moveHistory.push(record);
      // Reset any active draw offers on move
      this.drawOfferedBy = null;

      // Check game termination conditions
      if (this.chess.isCheckmate()) {
        const winner = turn;
        this.endGame(winner, winner === 'w' ? '1-0' : '0-1', 'checkmate');
      } else if (this.chess.isStalemate()) {
        this.endGame('draw', '1/2-1/2', 'stalemate');
      } else if (this.chess.isThreefoldRepetition()) {
        this.endGame('draw', '1/2-1/2', 'threefold_repetition');
      } else if (this.chess.isInsufficientMaterial()) {
        this.endGame('draw', '1/2-1/2', 'insufficient_material');
      } else if (this.chess.isDraw()) {
        this.endGame('draw', '1/2-1/2', 'fifty_move_rule');
      }

      return { ok: true };
    } catch {
      return { ok: false, error: 'Illegal move attempted.' };
    }
  }

  public offerDraw(socketId: string): { ok: boolean; color?: Color; playerName?: string; error?: string } {
    if (this.status !== 'playing') return { ok: false, error: 'Game is not playing.' };
    const session = this.players.get(socketId);
    if (!session) return { ok: false, error: 'Player not found.' };

    this.drawOfferedBy = session.color;
    return { ok: true, color: session.color, playerName: session.name };
  }

  public acceptDraw(socketId: string): boolean {
    if (this.status !== 'playing' || !this.drawOfferedBy) return false;
    const session = this.players.get(socketId);
    if (!session || session.color === this.drawOfferedBy) return false;

    this.endGame('draw', '1/2-1/2', 'draw_agreement');
    return true;
  }

  public declineDraw(socketId: string): boolean {
    if (this.status !== 'playing' || !this.drawOfferedBy) return false;
    const session = this.players.get(socketId);
    if (!session || session.color === this.drawOfferedBy) return false;

    this.drawOfferedBy = null;
    return true;
  }

  public resign(socketId: string): { ok: boolean; winner?: Color; error?: string } {
    if (this.status !== 'playing') return { ok: false, error: 'Game is not playing.' };
    const session = this.players.get(socketId);
    if (!session) return { ok: false, error: 'Player not found.' };

    const winner = session.color === 'w' ? 'b' : 'w';
    this.endGame(winner, winner === 'w' ? '1-0' : '0-1', 'resignation');
    return { ok: true, winner };
  }

  private handleTimeout(timedOutColor: Color): void {
    if (this.status !== 'playing') return;

    // Check if opponent has sufficient material to mate
    const opponentColor = timedOutColor === 'w' ? 'b' : 'w';
    // If opponent has insufficient material to deliver mate, it's a draw by timeout vs insufficient material
    const isOpponentInsufficient = this.chess.isInsufficientMaterial();

    if (isOpponentInsufficient) {
      this.endGame('draw', '1/2-1/2', 'insufficient_material');
    } else {
      this.endGame(opponentColor, opponentColor === 'w' ? '1-0' : '0-1', 'timeout');
    }
  }

  public requestRematch(socketId: string): { ok: boolean; color?: Color; playerName?: string; error?: string } {
    if (this.status !== 'ended') return { ok: false, error: 'Game has not ended.' };
    const session = this.players.get(socketId);
    if (!session) return { ok: false, error: 'Player not found.' };

    this.rematchRequestedBy = session.color;
    return { ok: true, color: session.color, playerName: session.name };
  }

  public acceptRematch(socketId: string): boolean {
    if (this.status !== 'ended' || !this.rematchRequestedBy) return false;
    const session = this.players.get(socketId);
    if (!session || session.color === this.rematchRequestedBy) return false;

    // Reset game for rematch: switch player colors
    this.resetForRematch();
    return true;
  }

  private resetForRematch(): void {
    // Swap colors
    const playersList = Array.from(this.playerSessionsById.values());
    if (playersList.length === 2) {
      const p1 = playersList[0];
      const p2 = playersList[1];
      const tempColor = p1.color;
      p1.color = p2.color;
      p2.color = tempColor;
    }

    this.chess = new Chess();
    this.moveHistory = [];
    this.winner = null;
    this.result = null;
    this.resultReason = null;
    this.drawOfferedBy = null;
    this.rematchRequestedBy = null;
    this.analysisStatus = 'none';
    this.startedAt = Date.now();
    this.endedAt = null;

    const preset = TIME_CONTROL_PRESETS.find((p) => p.id === this.timeControlId) || TIME_CONTROL_PRESETS[3];
    this.clockManager = new ClockManager({
      hasClock: preset.hasClock,
      initialMinutes: preset.initialMinutes,
      incrementSeconds: preset.incrementSeconds,
      onTimeout: (timedOutColor: Color) => {
        this.handleTimeout(timedOutColor);
      }
    });

    this.status = 'playing';
    this.clockManager.start('w');
  }

  private endGame(winner: Color | 'draw', result: GameResult, reason: ResultReason): void {
    this.status = 'ended';
    this.winner = winner;
    this.result = result;
    this.resultReason = reason;
    this.endedAt = Date.now();
    this.clockManager.stop();

    // Clear any disconnect timers
    this.disconnectTimers.forEach((timer) => clearTimeout(timer));
    this.disconnectTimers.clear();

    if (this.onGameEndCallback) {
      this.onGameEndCallback(this);
    }
  }

  public getAuthoritativeState(): AuthoritativeGameState {
    let whitePlayer: PlayerInfo | null = null;
    let blackPlayer: PlayerInfo | null = null;

    for (const p of this.playerSessionsById.values()) {
      const info: PlayerInfo = {
        id: p.id,
        name: p.name,
        color: p.color,
        isReady: p.isReady,
        isConnected: p.isConnected,
        joinedAt: p.joinedAt
      };
      if (p.color === 'w') {
        whitePlayer = info;
      } else {
        blackPlayer = info;
      }
    }

    return {
      gameId: this.gameId,
      roomCode: this.roomCode,
      status: this.status,
      fen: this.chess.fen(),
      pgn: this.chess.pgn(),
      turn: this.chess.turn() as Color,
      moveHistory: [...this.moveHistory],
      whitePlayer,
      blackPlayer,
      clocks: this.clockManager.getState(),
      winner: this.winner,
      result: this.result,
      resultReason: this.resultReason,
      drawOfferedBy: this.drawOfferedBy,
      rematchRequestedBy: this.rematchRequestedBy,
      analysisStatus: this.analysisStatus,
      createdAt: this.createdAt,
      startedAt: this.startedAt,
      endedAt: this.endedAt
    };
  }

  public getPlayerBySocket(socketId: string): PlayerSession | undefined {
    return this.players.get(socketId);
  }

  public getPlayers(): PlayerSession[] {
    return Array.from(this.playerSessionsById.values());
  }
}
