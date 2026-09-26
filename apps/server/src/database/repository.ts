import { pool, isPostgresAvailable } from './db.js';
import { AuthoritativeGameState, GameJudgeSummary } from '@judge-chess/shared';
import { v4 as uuidv4 } from 'uuid';

export interface StoredGameSummary {
  id: string;
  roomCode: string;
  whitePlayerName: string;
  blackPlayerName: string;
  winner: string | null;
  result: string | null;
  resultReason: string | null;
  finalFen: string;
  pgn: string;
  startedAt: number | null;
  endedAt: number | null;
  whiteAccuracy?: number;
  blackAccuracy?: number;
  hasAnalysis: boolean;
}

// In-memory persistent caches
const memoryGames: Map<string, AuthoritativeGameState> = new Map();
const memorySummaries: Map<string, GameJudgeSummary> = new Map();

export class GameRepository {
  public async saveGame(state: AuthoritativeGameState): Promise<void> {
    memoryGames.set(state.gameId, state);

    if (isPostgresAvailable && pool) {
      try {
        await pool.query(
          `
          INSERT INTO games (
            id, room_code, white_player_name, black_player_name,
            status, turn, winner, result, result_reason,
            final_fen, pgn, analysis_status, started_at, ended_at, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, to_timestamp($13/1000.0), to_timestamp($14/1000.0), to_timestamp($15/1000.0))
          ON CONFLICT (id) DO UPDATE SET
            status = EXCLUDED.status,
            winner = EXCLUDED.winner,
            result = EXCLUDED.result,
            result_reason = EXCLUDED.result_reason,
            final_fen = EXCLUDED.final_fen,
            pgn = EXCLUDED.pgn,
            analysis_status = EXCLUDED.analysis_status,
            ended_at = EXCLUDED.ended_at;
          `,
          [
            state.gameId,
            state.roomCode,
            state.whitePlayer?.name || 'White',
            state.blackPlayer?.name || 'Black',
            state.status,
            state.turn,
            state.winner,
            state.result,
            state.resultReason,
            state.fen,
            state.pgn,
            state.analysisStatus,
            state.startedAt || Date.now(),
            state.endedAt || Date.now(),
            state.createdAt
          ]
        );

        // Save moves
        for (const m of state.moveHistory) {
          await pool.query(
            `
            INSERT INTO moves (id, game_id, ply, move_number, player_color, san, uci, fen_before, fen_after)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            ON CONFLICT (id) DO NOTHING;
            `,
            [
              `${state.gameId}_${m.ply}`,
              state.gameId,
              m.ply,
              m.moveNumber,
              m.playerColor,
              m.san,
              m.uci,
              m.fenBefore,
              m.fenAfter
            ]
          );
        }
      } catch (err) {
        console.error('[Repository] Error saving game to PostgreSQL:', err);
      }
    }
  }

  public async saveAnalysis(summary: GameJudgeSummary): Promise<void> {
    memorySummaries.set(summary.gameId, summary);

    // Update in-memory game state if present
    const inMem = memoryGames.get(summary.gameId);
    if (inMem) {
      inMem.analysisStatus = 'completed';
    }

    if (isPostgresAvailable && pool) {
      try {
        await pool.query(
          `
          INSERT INTO game_analyses (id, game_id, white_accuracy, black_accuracy, move_of_game_ply, summary_json)
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (id) DO UPDATE SET
            white_accuracy = EXCLUDED.white_accuracy,
            black_accuracy = EXCLUDED.black_accuracy,
            summary_json = EXCLUDED.summary_json;
          `,
          [
            uuidv4(),
            summary.gameId,
            summary.whiteAccuracy,
            summary.blackAccuracy,
            summary.moveOfTheGamePly,
            JSON.stringify(summary)
          ]
        );

        await pool.query(`UPDATE games SET analysis_status = 'completed' WHERE id = $1;`, [summary.gameId]);
      } catch (err) {
        console.error('[Repository] Error saving analysis to PostgreSQL:', err);
      }
    }
  }

  public async getGame(gameId: string): Promise<AuthoritativeGameState | null> {
    const mem = memoryGames.get(gameId);
    if (mem) return mem;

    if (isPostgresAvailable && pool) {
      try {
        const res = await pool.query(`SELECT * FROM games WHERE id = $1;`, [gameId]);
        if (res.rows.length === 0) return null;
        const row = res.rows[0];

        const movesRes = await pool.query(
          `SELECT * FROM moves WHERE game_id = $1 ORDER BY ply ASC;`,
          [gameId]
        );

        return {
          gameId: row.id,
          roomCode: row.room_code,
          status: row.status,
          fen: row.final_fen,
          pgn: row.pgn || '',
          turn: row.turn,
          moveHistory: movesRes.rows.map((m: any) => ({
            ply: m.ply,
            moveNumber: m.move_number,
            playerColor: m.player_color,
            from: m.uci.slice(0, 2),
            to: m.uci.slice(2, 4),
            promotion: m.uci.length > 4 ? m.uci[4] : undefined,
            san: m.san,
            uci: m.uci,
            fenBefore: m.fen_before,
            fenAfter: m.fen_after,
            isCheck: false,
            isCheckmate: false,
            timestamp: new Date(m.created_at).getTime()
          })),
          whitePlayer: {
            id: 'w',
            name: row.white_player_name || 'White',
            color: 'w',
            isReady: true,
            isConnected: false,
            joinedAt: 0
          },
          blackPlayer: {
            id: 'b',
            name: row.black_player_name || 'Black',
            color: 'b',
            isReady: true,
            isConnected: false,
            joinedAt: 0
          },
          clocks: {
            hasClock: false,
            whiteRemainingMs: 0,
            blackRemainingMs: 0,
            lastUpdateTimestamp: 0,
            activeColor: null,
            incrementMs: 0
          },
          winner: row.winner,
          result: row.result,
          resultReason: row.result_reason,
          drawOfferedBy: null,
          rematchRequestedBy: null,
          analysisStatus: row.analysis_status,
          createdAt: new Date(row.created_at).getTime(),
          startedAt: row.started_at ? new Date(row.started_at).getTime() : null,
          endedAt: row.ended_at ? new Date(row.ended_at).getTime() : null
        };
      } catch (err) {
        console.error('[Repository] Error loading game from PostgreSQL:', err);
      }
    }

    return null;
  }

  public async getAnalysis(gameId: string): Promise<GameJudgeSummary | null> {
    const mem = memorySummaries.get(gameId);
    if (mem) return mem;

    if (isPostgresAvailable && pool) {
      try {
        const res = await pool.query(
          `SELECT summary_json FROM game_analyses WHERE game_id = $1 ORDER BY completed_at DESC LIMIT 1;`,
          [gameId]
        );
        if (res.rows.length > 0) {
          return res.rows[0].summary_json as GameJudgeSummary;
        }
      } catch (err) {
        console.error('[Repository] Error loading analysis from PostgreSQL:', err);
      }
    }

    return null;
  }

  public async getRecentGames(limit: number = 20): Promise<StoredGameSummary[]> {
    if (isPostgresAvailable && pool) {
      try {
        const res = await pool.query(
          `
          SELECT g.*, a.white_accuracy, a.black_accuracy
          FROM games g
          LEFT JOIN game_analyses a ON g.id = a.game_id
          ORDER BY g.created_at DESC
          LIMIT $1;
          `,
          [limit]
        );

        return res.rows.map((row: any) => ({
          id: row.id,
          roomCode: row.room_code,
          whitePlayerName: row.white_player_name || 'White',
          blackPlayerName: row.black_player_name || 'Black',
          winner: row.winner,
          result: row.result,
          resultReason: row.result_reason,
          finalFen: row.final_fen,
          pgn: row.pgn || '',
          startedAt: row.started_at ? new Date(row.started_at).getTime() : null,
          endedAt: row.ended_at ? new Date(row.ended_at).getTime() : null,
          whiteAccuracy: row.white_accuracy ? parseFloat(row.white_accuracy) : undefined,
          blackAccuracy: row.black_accuracy ? parseFloat(row.black_accuracy) : undefined,
          hasAnalysis: row.analysis_status === 'completed'
        }));
      } catch (err) {
        console.error('[Repository] Error fetching recent games from PostgreSQL:', err);
      }
    }

    // Fallback to memory games
    const games = Array.from(memoryGames.values())
      .filter((g) => g.status === 'ended')
      .sort((a, b) => (b.endedAt || b.createdAt) - (a.endedAt || a.createdAt))
      .slice(0, limit);

    return games.map((g) => {
      const summary = memorySummaries.get(g.gameId);
      return {
        id: g.gameId,
        roomCode: g.roomCode,
        whitePlayerName: g.whitePlayer?.name || 'White',
        blackPlayerName: g.blackPlayer?.name || 'Black',
        winner: g.winner,
        result: g.result,
        resultReason: g.resultReason,
        finalFen: g.fen,
        pgn: g.pgn,
        startedAt: g.startedAt,
        endedAt: g.endedAt,
        whiteAccuracy: summary?.whiteAccuracy,
        blackAccuracy: summary?.blackAccuracy,
        hasAnalysis: !!summary
      };
    });
  }
}

export const gameRepository = new GameRepository();
