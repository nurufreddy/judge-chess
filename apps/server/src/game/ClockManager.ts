import { ClockState, Color } from '@judge-chess/shared';

export interface ClockManagerOptions {
  initialMinutes: number;
  incrementSeconds: number;
  hasClock: boolean;
  onTimeout: (timedOutColor: Color) => void;
}

export class ClockManager {
  private hasClock: boolean;
  private whiteRemainingMs: number;
  private blackRemainingMs: number;
  private incrementMs: number;
  private activeColor: Color | null = null;
  private lastUpdateTimestamp: number = 0;
  private timeoutTimer: NodeJS.Timeout | null = null;
  private onTimeoutCallback: (timedOutColor: Color) => void;

  constructor(options: ClockManagerOptions) {
    this.hasClock = options.hasClock;
    this.whiteRemainingMs = options.initialMinutes * 60 * 1000;
    this.blackRemainingMs = options.initialMinutes * 60 * 1000;
    this.incrementMs = options.incrementSeconds * 1000;
    this.onTimeoutCallback = options.onTimeout;
  }

  public start(firstColor: Color = 'w'): void {
    if (!this.hasClock) return;
    this.activeColor = firstColor;
    this.lastUpdateTimestamp = Date.now();
    this.scheduleTimeoutCheck();
  }

  public onMove(playedByColor: Color): { whiteRemainingMs: number; blackRemainingMs: number; timeSpentMs: number } {
    if (!this.hasClock || !this.activeColor) {
      return { whiteRemainingMs: 0, blackRemainingMs: 0, timeSpentMs: 0 };
    }

    const now = Date.now();
    const elapsed = Math.max(0, now - this.lastUpdateTimestamp);

    if (playedByColor === 'w') {
      this.whiteRemainingMs = Math.max(0, this.whiteRemainingMs - elapsed + this.incrementMs);
    } else {
      this.blackRemainingMs = Math.max(0, this.blackRemainingMs - elapsed + this.incrementMs);
    }

    // Switch active turn
    this.activeColor = playedByColor === 'w' ? 'b' : 'w';
    this.lastUpdateTimestamp = now;

    this.scheduleTimeoutCheck();

    return {
      whiteRemainingMs: this.whiteRemainingMs,
      blackRemainingMs: this.blackRemainingMs,
      timeSpentMs: elapsed
    };
  }

  public pause(): void {
    if (!this.hasClock || !this.activeColor) return;
    const now = Date.now();
    const elapsed = Math.max(0, now - this.lastUpdateTimestamp);

    if (this.activeColor === 'w') {
      this.whiteRemainingMs = Math.max(0, this.whiteRemainingMs - elapsed);
    } else {
      this.blackRemainingMs = Math.max(0, this.blackRemainingMs - elapsed);
    }

    this.activeColor = null;
    this.clearTimer();
  }

  public resume(activeColor: Color): void {
    if (!this.hasClock) return;
    this.activeColor = activeColor;
    this.lastUpdateTimestamp = Date.now();
    this.scheduleTimeoutCheck();
  }

  public stop(): void {
    this.clearTimer();
    this.activeColor = null;
  }

  public getState(): ClockState {
    let whiteCurrent = this.whiteRemainingMs;
    let blackCurrent = this.blackRemainingMs;

    if (this.hasClock && this.activeColor) {
      const elapsed = Math.max(0, Date.now() - this.lastUpdateTimestamp);
      if (this.activeColor === 'w') {
        whiteCurrent = Math.max(0, whiteCurrent - elapsed);
      } else {
        blackCurrent = Math.max(0, blackCurrent - elapsed);
      }
    }

    return {
      hasClock: this.hasClock,
      whiteRemainingMs: whiteCurrent,
      blackRemainingMs: blackCurrent,
      lastUpdateTimestamp: this.lastUpdateTimestamp,
      activeColor: this.activeColor,
      incrementMs: this.incrementMs
    };
  }

  private scheduleTimeoutCheck(): void {
    this.clearTimer();
    if (!this.hasClock || !this.activeColor) return;

    const remaining = this.activeColor === 'w' ? this.whiteRemainingMs : this.blackRemainingMs;
    const targetColor = this.activeColor;

    this.timeoutTimer = setTimeout(() => {
      this.onTimeoutCallback(targetColor);
    }, Math.max(0, remaining));
  }

  private clearTimer(): void {
    if (this.timeoutTimer) {
      clearTimeout(this.timeoutTimer);
      this.timeoutTimer = null;
    }
  }
}
