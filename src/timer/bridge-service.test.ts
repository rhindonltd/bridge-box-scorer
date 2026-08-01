import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { BridgeTimerService } from "./bridge-service";

describe("BridgeTimerService", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function createMockEngine(state: any) {
    return {
      getState: vi.fn(() => state),
      nextPhase: vi.fn(),
    } as any;
  }

  it("calls engine.nextPhase and broadcast when play duration is exceeded", () => {
    const engine = createMockEngine({
      isRunning: true,
      phase: "play",
      phaseStartedAt: Date.now() - 8 * 60 * 1000,
      playDuration: 7 * 60,
      moveDuration: 2 * 60,
    });
    const broadcast = vi.fn();

    const service = new BridgeTimerService(engine, broadcast);
    service.start();

    vi.advanceTimersByTime(200);

    expect(engine.nextPhase).toHaveBeenCalled();
    expect(broadcast).toHaveBeenCalled();

    service.stop();
  });

  it("does not call nextPhase when elapsed < duration", () => {
    const engine = createMockEngine({
      isRunning: true,
      phase: "play",
      phaseStartedAt: Date.now() - 3 * 60 * 1000,
      playDuration: 7 * 60,
      moveDuration: 2 * 60,
    });
    const broadcast = vi.fn();

    const service = new BridgeTimerService(engine, broadcast);
    service.start();

    vi.advanceTimersByTime(200);

    expect(engine.nextPhase).not.toHaveBeenCalled();
    expect(broadcast).not.toHaveBeenCalled();

    service.stop();
  });

  it("does nothing when timer is not running", () => {
    const engine = createMockEngine({
      isRunning: false,
      phase: "play",
      phaseStartedAt: Date.now() - 10 * 60 * 1000,
      playDuration: 7 * 60,
      moveDuration: 2 * 60,
    });
    const broadcast = vi.fn();

    const service = new BridgeTimerService(engine, broadcast);
    service.start();

    vi.advanceTimersByTime(200);

    expect(engine.nextPhase).not.toHaveBeenCalled();

    service.stop();
  });

  it("does nothing when phaseStartedAt is null", () => {
    const engine = createMockEngine({
      isRunning: true,
      phase: "play",
      phaseStartedAt: null,
      playDuration: 7 * 60,
      moveDuration: 2 * 60,
    });
    const broadcast = vi.fn();

    const service = new BridgeTimerService(engine, broadcast);
    service.start();

    vi.advanceTimersByTime(200);

    expect(engine.nextPhase).not.toHaveBeenCalled();

    service.stop();
  });

  it("uses moveDuration when phase is move", () => {
    const engine = createMockEngine({
      isRunning: true,
      phase: "move",
      phaseStartedAt: Date.now() - 3 * 60 * 1000,
      playDuration: 7 * 60,
      moveDuration: 2 * 60,
    });
    const broadcast = vi.fn();

    const service = new BridgeTimerService(engine, broadcast);
    service.start();

    vi.advanceTimersByTime(200);

    expect(engine.nextPhase).toHaveBeenCalled();
    expect(broadcast).toHaveBeenCalled();

    service.stop();
  });

  it("does not start a second interval if already running", () => {
    const engine = createMockEngine({
      isRunning: true,
      phase: "play",
      phaseStartedAt: Date.now() - 8 * 60 * 1000,
      playDuration: 7 * 60,
      moveDuration: 2 * 60,
    });
    const broadcast = vi.fn();

    const service = new BridgeTimerService(engine, broadcast);
    service.start();
    service.start(); // second call should be a no-op

    vi.advanceTimersByTime(200);

    // nextPhase should only be called once per tick, not twice
    expect(engine.nextPhase).toHaveBeenCalledTimes(1);

    service.stop();
  });

  it("stop clears interval so no further ticks occur", () => {
    const engine = createMockEngine({
      isRunning: true,
      phase: "play",
      phaseStartedAt: Date.now() - 8 * 60 * 1000,
      playDuration: 7 * 60,
      moveDuration: 2 * 60,
    });
    const broadcast = vi.fn();

    const service = new BridgeTimerService(engine, broadcast);
    service.start();
    service.stop();

    vi.advanceTimersByTime(1000);

    expect(engine.nextPhase).not.toHaveBeenCalled();
  });

  it("stop is safe to call when no interval is running", () => {
    const engine = createMockEngine({
      isRunning: false,
      phase: "play",
      phaseStartedAt: null,
      playDuration: 420,
      moveDuration: 60,
    });
    const broadcast = vi.fn();

    const service = new BridgeTimerService(engine, broadcast);

    // Should not throw
    service.stop();
  });
});
