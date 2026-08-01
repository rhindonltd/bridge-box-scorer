import { BridgeTimerEngine } from "./bridge-timer-engine";

export class BridgeTimerService {
  private interval: NodeJS.Timeout | null = null;

  constructor(
    private engine: BridgeTimerEngine,
    private broadcast: () => void,
  ) {}

  start() {
    if (this.interval) return;

    this.interval = setInterval(() => {
      const state = this.engine.getState();

      if (!state.isRunning || !state.phaseStartedAt) return;

      const elapsed = (Date.now() - state.phaseStartedAt) / 1000;

      const duration =
        state.phase === "move" ? state.moveDuration : state.playDuration;

      if (elapsed >= duration) {
        this.engine.nextPhase();
        this.broadcast();
      }
    }, 200);
  }

  stop() {
    if (this.interval) clearInterval(this.interval);
    this.interval = null;
  }
}
