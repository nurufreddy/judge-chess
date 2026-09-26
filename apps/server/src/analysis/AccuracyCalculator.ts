/**
 * Judge Chess Accuracy Metric
 *
 * Formula:
 * For each move i with centipawn loss L_i:
 *   q_i = exp(-0.0055 * L_i)
 *
 * Accuracy = (100 / N) * sum(q_i)
 *
 * Characteristics:
 * - 0 cp loss -> 100%
 * - 10 cp loss -> ~94.6%
 * - 40 cp loss -> ~80.2%
 * - 120 cp loss -> ~51.7%
 * - 250 cp loss -> ~25.3%
 * - 500+ cp loss -> < 6%
 * - Bounded strictly between 0.0% and 100.0%
 */
export class AccuracyCalculator {
  public static calculate(centipawnLosses: number[]): number {
    if (!centipawnLosses || centipawnLosses.length === 0) {
      return 100.0;
    }

    const DECAY_FACTOR = 0.0055;
    let totalQuality = 0;

    for (const loss of centipawnLosses) {
      const clampedLoss = Math.max(0, loss);
      const quality = Math.exp(-DECAY_FACTOR * clampedLoss);
      totalQuality += quality;
    }

    const rawAccuracy = (totalQuality / centipawnLosses.length) * 100;
    const boundedAccuracy = Math.min(100.0, Math.max(0.0, rawAccuracy));

    return Math.round(boundedAccuracy * 10) / 10;
  }
}
