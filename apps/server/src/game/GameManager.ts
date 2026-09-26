import { GameRoom } from './GameRoom.js';

export class GameManager {
  private rooms: Map<string, GameRoom> = new Map(); // roomCode -> GameRoom
  private socketToRoomCode: Map<string, string> = new Map(); // socketId -> roomCode

  constructor() {
    // Run cleanup every 10 minutes
    setInterval(() => {
      this.cleanupStaleRooms();
    }, 10 * 60 * 1000);
  }

  public generateRoomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 32 characters, no 0/O/1/I
    let code = '';
    do {
      code = '';
      for (let i = 0; i < 5; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
    } while (this.rooms.has(code));

    return code;
  }

  public createRoom(
    preferredColor: 'w' | 'b' | 'random' = 'random',
    timeControlId: string = '5m',
    onGameEnd?: (room: GameRoom) => void
  ): GameRoom {
    const roomCode = this.generateRoomCode();
    const room = new GameRoom(roomCode, preferredColor, timeControlId, onGameEnd);
    this.rooms.set(roomCode, room);
    return room;
  }

  public getRoom(roomCode: string): GameRoom | undefined {
    return this.rooms.get(roomCode.trim().toUpperCase());
  }

  public registerSocket(socketId: string, roomCode: string): void {
    this.socketToRoomCode.set(socketId, roomCode.trim().toUpperCase());
  }

  public unregisterSocket(socketId: string): void {
    this.socketToRoomCode.delete(socketId);
  }

  public getRoomBySocket(socketId: string): GameRoom | undefined {
    const roomCode = this.socketToRoomCode.get(socketId);
    if (!roomCode) return undefined;
    return this.rooms.get(roomCode);
  }

  public cleanupStaleRooms(): void {
    const now = Date.now();
    const ONE_HOUR = 60 * 60 * 1000;
    const FOUR_HOURS = 4 * ONE_HOUR;

    for (const [code, room] of this.rooms.entries()) {
      // Abandoned waiting room older than 1 hour
      if (room.status === 'waiting' && now - room.createdAt > ONE_HOUR) {
        this.rooms.delete(code);
      }
      // Completed room older than 4 hours
      else if (room.status === 'ended' && room.endedAt && now - room.endedAt > FOUR_HOURS) {
        this.rooms.delete(code);
      }
    }
  }

  public getAllRooms(): GameRoom[] {
    return Array.from(this.rooms.values());
  }
}

export const gameManager = new GameManager();
