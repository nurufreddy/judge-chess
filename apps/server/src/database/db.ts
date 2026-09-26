import pg from 'pg';
import { config } from '../config.js';

const { Pool } = pg;

export let pool: pg.Pool | null = null;
export let isPostgresAvailable = false;

export async function initDatabase(): Promise<void> {
  if (!config.databaseUrl) {
    console.log('[Database] No DATABASE_URL provided. Running in high-performance memory storage mode.');
    return;
  }

  try {
    pool = new Pool({
      connectionString: config.databaseUrl,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined
    });

    // Test connection
    const client = await pool.connect();
    console.log('[Database] Connected to PostgreSQL successfully.');

    // Initialize tables
    await client.query(`
      CREATE TABLE IF NOT EXISTS players (
        id VARCHAR(64) PRIMARY KEY,
        display_name VARCHAR(128) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS games (
        id VARCHAR(64) PRIMARY KEY,
        room_code VARCHAR(16) NOT NULL,
        white_player_name VARCHAR(128),
        black_player_name VARCHAR(128),
        status VARCHAR(32) NOT NULL,
        turn VARCHAR(8) NOT NULL,
        winner VARCHAR(16),
        result VARCHAR(16),
        result_reason VARCHAR(64),
        final_fen TEXT NOT NULL,
        pgn TEXT,
        analysis_status VARCHAR(32) DEFAULT 'none',
        started_at TIMESTAMP WITH TIME ZONE,
        ended_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS moves (
        id VARCHAR(64) PRIMARY KEY,
        game_id VARCHAR(64) REFERENCES games(id) ON DELETE CASCADE,
        ply INT NOT NULL,
        move_number INT NOT NULL,
        player_color VARCHAR(4) NOT NULL,
        san VARCHAR(16) NOT NULL,
        uci VARCHAR(16) NOT NULL,
        fen_before TEXT NOT NULL,
        fen_after TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS game_analyses (
        id VARCHAR(64) PRIMARY KEY,
        game_id VARCHAR(64) REFERENCES games(id) ON DELETE CASCADE,
        white_accuracy NUMERIC(5,2) NOT NULL,
        black_accuracy NUMERIC(5,2) NOT NULL,
        move_of_game_ply INT,
        summary_json JSONB NOT NULL,
        completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    client.release();
    isPostgresAvailable = true;
    console.log('[Database] Schema verified and ready.');
  } catch (err) {
    console.warn('[Database] PostgreSQL connection failed. Falling back to memory storage mode.', err);
    pool = null;
    isPostgresAvailable = false;
  }
}
