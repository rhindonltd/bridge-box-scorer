import { describe, it, expect, vi } from "vitest";
import { makeTimerBroadcaster, buildTimerSyncPayload } from "./broadcast-timer";
import { Rooms } from "@/socket/rooms";
import { SocketEvents } from "@/socket/socket-events";
import type { TimerState } from "@/timer/timer-state";

function state(): TimerState {
  return {
    version: 1,
    phase: "play",
    board: 1,
    round: 1,
    boardsPerRound: 3,
    totalRounds: 8,
    playDuration: 420,
    moveDuration: 60,
    breaks: [],
    isRunning: true,
    phaseStartedAt: Date.now(),
    remainingMs: null,
    breakDurationMs: null,
  };
}

describe("buildTimerSyncPayload", () => {
  it("includes the section and serverNow", () => {
    const payload = buildTimerSyncPayload("B", state());
    expect(payload.section).toBe("B");
    expect(payload).toHaveProperty("serverNow");
    expect(payload).toHaveProperty("breakProblems");
    expect(payload.phase).toBe("play");
  });
});

describe("makeTimerBroadcaster", () => {
  it("emits TIMER_SYNC to the section's timer room with section in the payload", () => {
    const emit = vi.fn();
    const to = vi.fn(() => ({ emit }));
    const io = { to } as never;

    const broadcast = makeTimerBroadcaster(io);
    broadcast("g1", "B", state());

    expect(to).toHaveBeenCalledWith(Rooms.timer("g1", "B"));
    expect(emit).toHaveBeenCalledWith(
      SocketEvents.TIMER_SYNC,
      expect.objectContaining({ section: "B" }),
    );
  });

  it("routes different sections to different rooms", () => {
    const emit = vi.fn();
    const to = vi.fn(() => ({ emit }));
    const io = { to } as never;

    const broadcast = makeTimerBroadcaster(io);
    broadcast("g1", "A", state());
    broadcast("g1", "B", state());

    expect(to).toHaveBeenNthCalledWith(1, Rooms.timer("g1", "A"));
    expect(to).toHaveBeenNthCalledWith(2, Rooms.timer("g1", "B"));
  });
});
