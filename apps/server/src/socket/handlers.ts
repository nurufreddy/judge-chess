import { Server, Socket } from 'socket.io';
import {
  ClientToServerEvents,
  ServerToClientEvents,
  CreateRoomPayload,
  JoinRoomPayload,
  MakeMovePayload,
  ReconnectSessionPayload
} from '@judge-chess/shared';
import { gameManager } from '../game/GameManager.js';
import { GameRoom } from '../game/GameRoom.js';
import { gameRepository } from '../database/repository.js';
import { moveAnalyzer } from '../analysis/MoveAnalyzer.js';

export function registerSocketHandlers(
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  socket: Socket<ClientToServerEvents, ServerToClientEvents>
) {
  // 1. Create Room
  socket.on('room:create', (payload: CreateRoomPayload, callback) => {
    try {
      const room = gameManager.createRoom(
        payload.preferredColor,
        payload.timeControlId,
        async (endedRoom) => {
          // Callback when game ends
          const finalState = endedRoom.getAuthoritativeState();
          await gameRepository.saveGame(finalState);
          io.to(endedRoom.roomCode).emit('game:ended', {
            winner: endedRoom.winner || 'draw',
            result: endedRoom.result,
            reason: endedRoom.resultReason!,
            state: finalState
          });

          // Automatically trigger Stockfish post-game analysis
          triggerAnalysisForRoom(io, endedRoom);
        }
      );

      const addResult = room.addPlayer(socket.id, payload.playerName);
      if (!addResult.ok || !addResult.player) {
        callback({ ok: false, error: addResult.error || 'Failed to create room' });
        return;
      }

      gameManager.registerSocket(socket.id, room.roomCode);
      socket.join(room.roomCode);

      const state = room.getAuthoritativeState();
      socket.emit('room:created', {
        roomCode: room.roomCode,
        playerId: addResult.player.id,
        reconnectToken: addResult.player.reconnectToken,
        state
      });

      callback({
        ok: true,
        roomCode: room.roomCode,
        playerId: addResult.player.id,
        reconnectToken: addResult.player.reconnectToken
      });
    } catch (err: any) {
      console.error('[Socket] room:create error:', err);
      callback({ ok: false, error: err.message || 'Server error' });
    }
  });

  // 2. Join Room
  socket.on('room:join', (payload: JoinRoomPayload, callback) => {
    try {
      const room = gameManager.getRoom(payload.roomCode);
      if (!room) {
        callback({ ok: false, error: 'Room not found.' });
        return;
      }

      const addResult = room.addPlayer(socket.id, payload.playerName);
      if (!addResult.ok || !addResult.player) {
        callback({ ok: false, error: addResult.error || 'Failed to join room.' });
        return;
      }

      gameManager.registerSocket(socket.id, room.roomCode);
      socket.join(room.roomCode);

      const state = room.getAuthoritativeState();
      // Broadcast updated room state to all players in the room
      io.to(room.roomCode).emit('room:updated', { state });

      // If both ready and game started
      if (room.status === 'playing') {
        io.to(room.roomCode).emit('game:started', { state });
      }

      callback({
        ok: true,
        playerId: addResult.player.id,
        reconnectToken: addResult.player.reconnectToken
      });
    } catch (err: any) {
      console.error('[Socket] room:join error:', err);
      callback({ ok: false, error: err.message || 'Server error' });
    }
  });

  // 3. Player Ready
  socket.on('player:ready', ({ roomCode, isReady }) => {
    const room = gameManager.getRoom(roomCode);
    if (!room) return;

    const player = room.getPlayerBySocket(socket.id);
    if (!player) return;

    room.setPlayerReady(player.id, isReady);
    const state = room.getAuthoritativeState();
    io.to(room.roomCode).emit('room:updated', { state });

    if (room.status === 'playing') {
      io.to(room.roomCode).emit('game:started', { state });
    }
  });

  // 4. Force Start Game (if host clicks start)
  socket.on('game:start', ({ roomCode }) => {
    const room = gameManager.getRoom(roomCode);
    if (!room) return;
    if (room.status !== 'playing') {
      const started = room.startGame();
      if (started) {
        const state = room.getAuthoritativeState();
        io.to(room.roomCode).emit('game:started', { state });
      }
    }
  });

  // 5. Authoritative Move
  socket.on('game:move', (payload: MakeMovePayload, callback) => {
    const room = gameManager.getRoom(payload.roomCode);
    if (!room) {
      callback?.({ ok: false, error: 'Room not found.' });
      return;
    }

    const res = room.makeMove(socket.id, payload.from, payload.to, payload.promotion);
    if (!res.ok) {
      socket.emit('game:move-rejected', { reason: res.error || 'Illegal move' });
      callback?.({ ok: false, error: res.error });
      return;
    }

    const state = room.getAuthoritativeState();
    // Broadcast state to all players in the room
    io.to(room.roomCode).emit('game:move-accepted', { state });
    callback?.({ ok: true });
  });

  // 6. Draw Management
  socket.on('game:offer-draw', ({ roomCode }) => {
    const room = gameManager.getRoom(roomCode);
    if (!room) return;
    const res = room.offerDraw(socket.id);
    if (res.ok && res.color) {
      socket.to(room.roomCode).emit('game:draw-offered', {
        by: res.color,
        playerName: res.playerName || 'Opponent'
      });
    }
  });

  socket.on('game:accept-draw', ({ roomCode }) => {
    const room = gameManager.getRoom(roomCode);
    if (!room) return;
    room.acceptDraw(socket.id);
  });

  socket.on('game:decline-draw', ({ roomCode }) => {
    const room = gameManager.getRoom(roomCode);
    if (!room) return;
    room.declineDraw(socket.id);
    socket.to(room.roomCode).emit('game:draw-declined');
  });

  // 7. Resign
  socket.on('game:resign', ({ roomCode }) => {
    const room = gameManager.getRoom(roomCode);
    if (!room) return;
    room.resign(socket.id);
  });

  // 8. Rematch
  socket.on('game:request-rematch', ({ roomCode }) => {
    const room = gameManager.getRoom(roomCode);
    if (!room) return;
    const res = room.requestRematch(socket.id);
    if (res.ok && res.color) {
      socket.to(room.roomCode).emit('game:rematch-requested', {
        by: res.color,
        playerName: res.playerName || 'Opponent'
      });
    }
  });

  socket.on('game:accept-rematch', ({ roomCode }) => {
    const room = gameManager.getRoom(roomCode);
    if (!room) return;
    const accepted = room.acceptRematch(socket.id);
    if (accepted) {
      const state = room.getAuthoritativeState();
      io.to(room.roomCode).emit('game:rematch-started', { state });
    }
  });

  // 9. Manual / Retry Analysis Request
  socket.on('game:request-analysis', ({ roomCode }) => {
    const room = gameManager.getRoom(roomCode);
    if (!room || room.status !== 'ended') return;
    triggerAnalysisForRoom(io, room);
  });

  // 10. Reconnection (Section 24)
  socket.on('session:reconnect', (payload: ReconnectSessionPayload, callback) => {
    try {
      const room = gameManager.getRoom(payload.roomCode);
      if (!room) {
        callback({ ok: false, error: 'Room not found.' });
        return;
      }

      const res = room.reconnectPlayer(socket.id, payload.playerId, payload.reconnectToken);
      if (!res.ok || !res.session) {
        callback({ ok: false, error: res.error || 'Failed to reconnect session.' });
        return;
      }

      gameManager.registerSocket(socket.id, room.roomCode);
      socket.join(room.roomCode);

      const state = room.getAuthoritativeState();

      // Notify opponent of reconnection
      socket.to(room.roomCode).emit('player:reconnected', {
        color: res.session.color,
        playerName: res.session.name
      });

      callback({ ok: true, state });
    } catch (err: any) {
      console.error('[Socket] session:reconnect error:', err);
      callback({ ok: false, error: err.message || 'Server error' });
    }
  });

  // 11. Disconnect
  socket.on('disconnect', () => {
    const room = gameManager.getRoomBySocket(socket.id);
    if (!room) return;

    gameManager.unregisterSocket(socket.id);
    const disResult = room.handleDisconnect(socket.id);

    if (disResult) {
      socket.to(room.roomCode).emit('player:disconnected', {
        color: disResult.disconnectedColor,
        playerName: disResult.playerName,
        gracePeriodSeconds: 60
      });
    }
  });
}

function triggerAnalysisForRoom(io: Server<ClientToServerEvents, ServerToClientEvents>, room: GameRoom) {
  room.analysisStatus = 'analyzing';
  const state = room.getAuthoritativeState();

  // Run analysis in background
  moveAnalyzer
    .analyzeGame(state, (current, total, percentage) => {
      io.to(room.roomCode).emit('analysis:progress', { current, total, percentage });
    })
    .then(async (summary) => {
      room.analysisStatus = 'completed';
      await gameRepository.saveAnalysis(summary);
      io.to(room.roomCode).emit('analysis:completed', { summary });
    })
    .catch((err) => {
      console.error('[Analysis] Analysis failed for room', room.roomCode, err);
      room.analysisStatus = 'failed';
      io.to(room.roomCode).emit('analysis:failed', {
        message: 'Analysis could not be completed. You can retry anytime.'
      });
    });
}
