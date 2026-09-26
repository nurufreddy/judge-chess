import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { ClientToServerEvents, ServerToClientEvents } from '@judge-chess/shared';
import { config } from './config.js';
import { initDatabase } from './database/db.js';
import { registerSocketHandlers } from './socket/handlers.js';
import { gameRepository } from './database/repository.js';
import { gameManager } from './game/GameManager.js';

const app = express();
const server = http.createServer(app);

app.use(cors({ origin: '*' }));
app.use(express.json());

// Health Check
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    app: 'Judge Chess Server',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString()
  });
});

// REST API: Get Game by ID
app.get('/api/games/:gameId', async (req, res) => {
  try {
    const game = await gameRepository.getGame(req.params.gameId);
    if (!game) {
      res.status(404).json({ error: 'Game not found.' });
      return;
    }
    res.json(game);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// REST API: Get Game Analysis by ID
app.get('/api/analysis/:gameId', async (req, res) => {
  try {
    const analysis = await gameRepository.getAnalysis(req.params.gameId);
    if (!analysis) {
      res.status(404).json({ error: 'Analysis not found.' });
      return;
    }
    res.json(analysis);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// REST API: Get Recent Games History
app.get('/api/history', async (_req, res) => {
  try {
    const games = await gameRepository.getRecentGames(30);
    res.json({ games });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// REST API: Get active room by code (for quick validation)
app.get('/api/rooms/:roomCode', (req, res) => {
  const room = gameManager.getRoom(req.params.roomCode);
  if (!room) {
    res.status(404).json({ error: 'Room not found.' });
    return;
  }
  res.json(room.getAuthoritativeState());
});

// Socket.io Server Setup
const io = new Server<ClientToServerEvents, ServerToClientEvents>(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  },
  pingTimeout: 20000,
  pingInterval: 10000
});

io.on('connection', (socket) => {
  registerSocketHandlers(io, socket);
});

// Start Server
async function startServer() {
  await initDatabase();

  server.listen(config.port, '0.0.0.0', () => {
    console.log(`[Judge Chess] Realtime server listening on port ${config.port}`);
  });
}

startServer().catch((err) => {
  console.error('[Judge Chess] Fatal server initialization error:', err);
  process.exit(1);
});
