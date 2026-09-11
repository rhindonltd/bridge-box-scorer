import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetIO = vi.fn();
vi.mock("@/socket/websocket", () => ({ getIO: () => mockGetIO() }));

import { Rooms } from "@/socket/rooms";
import { SocketEvents } from "@/socket/socket-events";
import { buildConfiguredTimerState } from "@/timer/timer-state";
import { broadcastTimerConfigSaved } from "./timer-broadcast";

function fakeIo() {
  const emits: { room: string; event: string; payload: any }[] = [];
  const io = {
    to: (room: string) => ({
      emit: (event: string, payload: unknown) =>
        emits.push({ room, event, payload }),
    }),
  };
  return { io, emits };
}

const state = buildConfiguredTimerState({
  boardsPerRound: 2,
  totalRounds: 4,
  playDuration: 420,
  moveDuration: 60,
});

describe("broadcastTimerConfigSaved", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("emits timer:sync for the section to that section's timer room", () => {
    const { io, emits } = fakeIo();

    broadcastTimerConfigSaved("g1", "A", state, io as never);

    expect(emits).toHaveLength(1);
    expect(emits[0].room).toBe(Rooms.timer("g1", "A"));
    expect(emits[0].event).toBe(SocketEvents.TIMER_SYNC);
    expect(emits[0].payload).toMatchObject({
      section: "A",
      totalRounds: 4,
      playDuration: 420,
      isRunning: false,
      phase: null,
    });
    expect(typeof emits[0].payload.serverNow).toBe("number");
    expect(mockGetIO).not.toHaveBeenCalled();
  });

  it("falls back to getIO() when no io is passed", () => {
    const { io, emits } = fakeIo();
    mockGetIO.mockReturnValue(io);

    broadcastTimerConfigSaved("g1", "A", state);

    expect(mockGetIO).toHaveBeenCalled();
    expect(emits).toHaveLength(1);
  });

  it("no-ops when there is no server", () => {
    mockGetIO.mockReturnValue(null);
    expect(() => broadcastTimerConfigSaved("g1", "A", state)).not.toThrow();
  });
});
