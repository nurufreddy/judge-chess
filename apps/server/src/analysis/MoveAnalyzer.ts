import { Chess } from 'chess.js';
import {
  AuthoritativeGameState,
  ClassificationBreakdown,
  GameJudgeSummary,
  MoveAnalysis
} from '@judge-chess/shared';
import { stockfishService } from './StockfishService.js';
import { MoveClassifier } from './MoveClassifier.js';
import { AccuracyCalculator } from './AccuracyCalculator.js';
import { config } from '../config.js';

export class MoveAnalyzer {
  public async analyzeGame(
    gameState: AuthoritativeGameState,
    onProgress?: (current: number, total: number, percentage: number) => void
  ): Promise<GameJudgeSummary> {
    const moves = gameState.moveHistory;
    const totalMoves = moves.length;

    if (totalMoves === 0) {
      return {
        gameId: gameState.gameId,
        whiteAccuracy: 100.0,
        blackAccuracy: 100.0,
        whiteBreakdown: this.emptyBreakdown(),
        blackBreakdown: this.emptyBreakdown(),
        moveOfTheGamePly: null,
        analyzedMoves: [],
        analysisDepth: config.stockfishDepth,
        completedAt: Date.now()
      };
    }

    const analyzedMoves: MoveAnalysis[] = [];
    const whiteLosses: number[] = [];
    const blackLosses: number[] = [];

    const whiteBreakdown = this.emptyBreakdown();
    const blackBreakdown = this.emptyBreakdown();

    let moveOfTheGamePly: number | null = null;
    let highestSwing = -1;
    let moveOfTheGameExplanation = '';

    for (let i = 0; i < totalMoves; i++) {
      const move = moves[i];

      // 1. Evaluate position before move
      const evalBefore = await stockfishService.evaluatePosition(
        move.fenBefore,
        config.stockfishDepth
      );

      // 2. Evaluate position after move
      const evalAfter = await stockfishService.evaluatePosition(
        move.fenAfter,
        config.stockfishDepth
      );

      // Convert engine best move UCI to SAN using chess.js
      let bestMoveSan = evalBefore.bestMoveUci;
      try {
        const tempChess = new Chess(move.fenBefore);
        const from = evalBefore.bestMoveUci.slice(0, 2);
        const to = evalBefore.bestMoveUci.slice(2, 4);
        const promotion =
          evalBefore.bestMoveUci.length > 4 ? evalBefore.bestMoveUci[4] : undefined;
        const res = tempChess.move({ from, to, promotion });
        if (res) {
          bestMoveSan = res.san;
        }
      } catch {
        // fallback to UCI string
      }

      // 3. Classify move
      const { classification, centipawnLoss } = MoveClassifier.classify({
        playerColor: move.playerColor,
        scoreBeforeCp: evalBefore.scoreCp,
        scoreAfterCp: evalAfter.scoreCp,
        mateBefore: evalBefore.mateIn,
        mateAfter: evalAfter.mateIn,
        playedUci: move.uci,
        bestMoveUci: evalBefore.bestMoveUci,
        isCapture: !!move.captured,
        isCheck: move.isCheck
      });

      // Track accuracy metrics
      if (move.playerColor === 'w') {
        whiteLosses.push(centipawnLoss);
        this.incrementBreakdown(whiteBreakdown, classification);
      } else {
        blackLosses.push(centipawnLoss);
        this.incrementBreakdown(blackBreakdown, classification);
      }

      // Check Move of the Game candidate:
      // Player increased their advantage significantly or played an Exceptional / Best tactical shot
      const perspectiveMultiplier = move.playerColor === 'w' ? 1 : -1;
      const scoreBeforeNormalized = (evalBefore.scoreCp ?? 0) * perspectiveMultiplier;
      const scoreAfterNormalized = (evalAfter.scoreCp ?? 0) * perspectiveMultiplier;
      const swing = scoreAfterNormalized - scoreBeforeNormalized;

      if (
        (classification === 'EXCEPTIONAL' || classification === 'BEST' || classification === 'GREAT') &&
        swing > highestSwing
      ) {
        highestSwing = swing;
        moveOfTheGamePly = move.ply;
        moveOfTheGameExplanation = `${move.san} was a decisive move that shifted the evaluation by +${(
          Math.max(0, swing) / 100
        ).toFixed(1)} pawns.`;
      }

      analyzedMoves.push({
        ply: move.ply,
        moveNumber: move.moveNumber,
        playerColor: move.playerColor,
        san: move.san,
        uci: move.uci,
        fenBefore: move.fenBefore,
        fenAfter: move.fenAfter,
        evalBefore,
        evalAfter,
        bestMoveUci: evalBefore.bestMoveUci,
        bestMoveSan,
        centipawnLoss,
        classification
      });

      if (onProgress) {
        const current = i + 1;
        const percentage = Math.round((current / totalMoves) * 100);
        onProgress(current, totalMoves, percentage);
      }
    }

    // Fallback move of the game if no big swing occurred
    if (moveOfTheGamePly === null && analyzedMoves.length > 0) {
      // Find the first Best or Great move
      const firstStrong = analyzedMoves.find(
        (m) => m.classification === 'EXCEPTIONAL' || m.classification === 'BEST' || m.classification === 'GREAT'
      );
      if (firstStrong) {
        moveOfTheGamePly = firstStrong.ply;
        moveOfTheGameExplanation = `A model ${firstStrong.classification.toLowerCase()} move that held maximum position precision.`;
      } else {
        moveOfTheGamePly = 0;
      }
    }

    // Mark isMoveOfGame on the chosen move
    if (moveOfTheGamePly !== null && analyzedMoves[moveOfTheGamePly]) {
      analyzedMoves[moveOfTheGamePly].isMoveOfGame = true;
    }

    const whiteAccuracy = AccuracyCalculator.calculate(whiteLosses);
    const blackAccuracy = AccuracyCalculator.calculate(blackLosses);

    return {
      gameId: gameState.gameId,
      whiteAccuracy,
      blackAccuracy,
      whiteBreakdown,
      blackBreakdown,
      moveOfTheGamePly,
      moveOfTheGameExplanation,
      analyzedMoves,
      analysisDepth: config.stockfishDepth,
      completedAt: Date.now()
    };
  }

  private emptyBreakdown(): ClassificationBreakdown {
    return {
      exceptional: 0,
      best: 0,
      great: 0,
      good: 0,
      inaccuracy: 0,
      mistake: 0,
      blunder: 0
    };
  }

  private incrementBreakdown(
    breakdown: ClassificationBreakdown,
    classification: string
  ): void {
    const key = classification.toLowerCase() as keyof ClassificationBreakdown;
    if (breakdown[key] !== undefined) {
      breakdown[key]++;
    }
  }
}

export const moveAnalyzer = new MoveAnalyzer();
