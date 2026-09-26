import { spawn, ChildProcess } from 'child_process';
import fs from 'fs';
import { EngineEvaluation } from '@judge-chess/shared';
import { config } from '../config.js';

export class StockfishService {
  private binaryPath: string | null = null;

  constructor() {
    this.findStockfishBinary();
  }

  private findStockfishBinary(): void {
    const candidates = [
      process.env.STOCKFISH_PATH,
      '/opt/homebrew/bin/stockfish',
      '/usr/local/bin/stockfish',
      '/usr/bin/stockfish',
      'stockfish'
    ].filter(Boolean) as string[];

    for (const p of candidates) {
      if (fs.existsSync(p)) {
        this.binaryPath = p;
        console.log(`[Stockfish] Found engine binary at: ${p}`);
        return;
      }
    }

    // Try finding via PATH
    this.binaryPath = 'stockfish';
  }

  public async evaluatePosition(
    fen: string,
    depth: number = config.stockfishDepth
  ): Promise<EngineEvaluation> {
    return new Promise((resolve) => {
      let proc: ChildProcess | null = null;
      let isDone = false;

      let bestMoveUci = '';
      let scoreCp: number | null = null;
      let mateIn: number | null = null;
      let evaluatedDepth = depth;
      let pv: string[] = [];

      // Determine who is to move from FEN so we normalize to White's perspective (+ = White, - = Black)
      const fenParts = fen.trim().split(' ');
      const sideToMove = fenParts[1] || 'w';

      const cleanup = () => {
        if (proc && !proc.killed) {
          try {
            proc.stdin?.write('quit\n');
            proc.kill();
          } catch {
            // ignore
          }
        }
      };

      const finish = () => {
        if (isDone) return;
        isDone = true;
        cleanup();

        // Normalize score from White's perspective:
        // Stockfish reports score from the perspective of the side to move!
        // If sideToMove === 'b', we flip the sign so positive is always White advantage.
        let normalizedCp = scoreCp;
        let normalizedMate = mateIn;

        if (sideToMove === 'b') {
          if (normalizedCp !== null) normalizedCp = -normalizedCp;
          if (normalizedMate !== null) normalizedMate = -normalizedMate;
        }

        resolve({
          scoreCp: normalizedCp,
          mateIn: normalizedMate,
          depth: evaluatedDepth,
          bestMoveUci: bestMoveUci || '0000',
          pv
        });
      };

      // Set safety timeout (4000ms max per position)
      const timeout = setTimeout(() => {
        console.warn(`[Stockfish] Evaluation timed out for position: ${fen}`);
        finish();
      }, 4000);

      try {
        proc = spawn(this.binaryPath || 'stockfish', [], {
          stdio: ['pipe', 'pipe', 'pipe']
        });

        proc.on('error', (err) => {
          console.warn('[Stockfish] Engine spawn error:', err.message);
          clearTimeout(timeout);
          finish();
        });

        let outputBuffer = '';

        proc.stdout?.on('data', (chunk) => {
          outputBuffer += chunk.toString();
          const lines = outputBuffer.split('\n');
          outputBuffer = lines.pop() || '';

          for (const rawLine of lines) {
            const line = rawLine.trim();
            if (!line) continue;

            // Parse: info depth 14 score cp 32 pv e2e4 c7c5 ...
            if (line.startsWith('info') && line.includes('score')) {
              const tokens = line.split(/\s+/);

              const depthIdx = tokens.indexOf('depth');
              if (depthIdx !== -1 && tokens[depthIdx + 1]) {
                evaluatedDepth = parseInt(tokens[depthIdx + 1], 10);
              }

              const scoreIdx = tokens.indexOf('score');
              if (scoreIdx !== -1 && tokens[scoreIdx + 1]) {
                const type = tokens[scoreIdx + 1]; // 'cp' or 'mate'
                const val = parseInt(tokens[scoreIdx + 2], 10);

                if (type === 'cp') {
                  scoreCp = isNaN(val) ? 0 : val;
                  mateIn = null;
                } else if (type === 'mate') {
                  mateIn = isNaN(val) ? 1 : val;
                  scoreCp = null;
                }
              }

              const pvIdx = tokens.indexOf('pv');
              if (pvIdx !== -1) {
                pv = tokens.slice(pvIdx + 1);
                if (pv.length > 0 && !bestMoveUci) {
                  bestMoveUci = pv[0];
                }
              }
            }

            // Parse: bestmove e2e4 ponder e7e5
            if (line.startsWith('bestmove')) {
              const tokens = line.split(/\s+/);
              if (tokens[1] && tokens[1] !== '(none)') {
                bestMoveUci = tokens[1];
              }
              clearTimeout(timeout);
              finish();
              return;
            }
          }
        });

        // Initialize and send commands
        proc.stdin?.write('uci\n');
        proc.stdin?.write('isready\n');
        proc.stdin?.write(`position fen ${fen}\n`);
        proc.stdin?.write(`go depth ${depth}\n`);
      } catch (err) {
        console.warn('[Stockfish] Failed to execute Stockfish:', err);
        clearTimeout(timeout);
        finish();
      }
    });
  }
}

export const stockfishService = new StockfishService();
