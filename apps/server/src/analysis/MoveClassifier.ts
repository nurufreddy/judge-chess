import { Color, MoveClassification, CLASSIFICATION_THRESHOLDS } from '@judge-chess/shared';

export interface ClassifyInput {
  playerColor: Color;
  scoreBeforeCp: number | null; // From White's perspective (+ = White advantage)
  scoreAfterCp: number | null;  // From White's perspective
  mateBefore: number | null;    // White perspective
  mateAfter: number | null;     // White perspective
  playedUci: string;
  bestMoveUci: string;
  isCapture: boolean;
  isCheck: boolean;
}

export class MoveClassifier {
  /**
   * Classifies a chess move according to Judge Chess specifications.
   * Note: Evaluations are from White's perspective (+ White advantage, - Black advantage).
   */
  public static classify(input: ClassifyInput): { classification: MoveClassification; centipawnLoss: number } {
    const { playerColor, playedUci, bestMoveUci, isCapture } = input;

    // Convert scores to player's perspective:
    // Higher is always better for the player making the move
    const perspectiveMultiplier = playerColor === 'w' ? 1 : -1;

    const evalBefore = this.normalizeEvaluation(input.scoreBeforeCp, input.mateBefore, perspectiveMultiplier);
    const evalAfter = this.normalizeEvaluation(input.scoreAfterCp, input.mateAfter, perspectiveMultiplier);

    // Centipawn loss is how much the evaluation degraded from the player's perspective
    // e.g. If evaluation before was +200 and after was +150, loss is 50 cp.
    // If evaluation increased, loss is 0.
    const rawLoss = Math.max(0, evalBefore - evalAfter);
    const centipawnLoss = Math.round(rawLoss);

    // Exact engine match
    const isTopEngineMove = playedUci.toLowerCase() === bestMoveUci.toLowerCase();

    // 1. Check for EXCEPTIONAL move
    // High complexity, significant advantage maintained or gained, non-obvious sacrifice/tactic
    if (this.isExceptional(input, evalBefore, evalAfter, centipawnLoss, isTopEngineMove)) {
      return { classification: 'EXCEPTIONAL', centipawnLoss: 0 };
    }

    // 2. BEST move: Top engine choice or negligible loss (<= bestMaxLoss)
    if (isTopEngineMove || centipawnLoss <= CLASSIFICATION_THRESHOLDS.bestMaxLoss) {
      return { classification: 'BEST', centipawnLoss };
    }

    // 3. GREAT move: Very strong move with minimal loss (<= greatMaxLoss)
    if (centipawnLoss <= CLASSIFICATION_THRESHOLDS.greatMaxLoss) {
      return { classification: 'GREAT', centipawnLoss };
    }

    // 4. Position saturation adjustment:
    // If a player is already completely winning (+900) and plays a move that drops to +700,
    // they are still completely winning; downgrade severity from Blunder/Mistake to Good/Inaccuracy.
    if (evalBefore > 600 && evalAfter > 500) {
      if (centipawnLoss <= 150) {
        return { classification: 'GOOD', centipawnLoss };
      }
      return { classification: 'INACCURACY', centipawnLoss };
    }

    // 5. GOOD move: Solid move preserving position
    if (centipawnLoss <= CLASSIFICATION_THRESHOLDS.goodMaxLoss) {
      return { classification: 'GOOD', centipawnLoss };
    }

    // 6. INACCURACY: Noticeable drop in evaluation
    if (centipawnLoss <= CLASSIFICATION_THRESHOLDS.inaccuracyMaxLoss) {
      return { classification: 'INACCURACY', centipawnLoss };
    }

    // 7. MISTAKE: Significant drop
    if (centipawnLoss <= CLASSIFICATION_THRESHOLDS.mistakeMaxLoss) {
      return { classification: 'MISTAKE', centipawnLoss };
    }

    // 8. BLUNDER: Severe loss
    return { classification: 'BLUNDER', centipawnLoss };
  }

  /**
   * Normalizes centipawn and mate scores into a continuous numerical scale from player's perspective.
   */
  private static normalizeEvaluation(
    scoreCp: number | null,
    mateIn: number | null,
    perspectiveMultiplier: number
  ): number {
    if (mateIn !== null) {
      // Mate in N moves
      // Positive mate is winning, negative mate is losing
      const mateScore = mateIn > 0 ? 10000 - mateIn * 100 : -10000 - mateIn * 100;
      return mateScore * perspectiveMultiplier;
    }

    const cp = scoreCp ?? 0;
    // Cap extreme centipawn evaluations for stability
    const clampedCp = Math.max(-2500, Math.min(2500, cp));
    return clampedCp * perspectiveMultiplier;
  }

  /**
   * Exceptional move criteria:
   * 1. Top engine move
   * 2. Preserves or extends a high-tension advantage
   * 3. Non-ordinary tactical blow (e.g. piece sacrifice or decisive breakthrough)
   */
  private static isExceptional(
    input: ClassifyInput,
    evalBefore: number,
    evalAfter: number,
    centipawnLoss: number,
    isTopEngineMove: boolean
  ): boolean {
    if (!isTopEngineMove || centipawnLoss > 0) return false;

    // Position had critical tension (evalBefore between -100 and +300)
    // and move delivers a major swing (gain >= +180 cp or forces mate)
    const evalGain = evalAfter - evalBefore;
    if (evalGain >= 180 && evalBefore >= -100 && evalBefore <= 300) {
      return true;
    }

    if (input.mateAfter !== null && input.mateBefore === null) {
      // Found a forced mate that was previously not forced
      return true;
    }

    return false;
  }
}
