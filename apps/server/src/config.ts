import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  corsOrigin: process.env.CORS_ORIGIN || '*',
  databaseUrl: process.env.DATABASE_URL || '',
  stockfishDepth: parseInt(process.env.STOCKFISH_DEPTH || '14', 10),
  reconnectGracePeriodMs: 60 * 1000 // 60 seconds
};
