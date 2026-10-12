import { describe, it, expect, vi, beforeEach } from "vitest";
import { SocketEvents } from "@/socket/socket-events";

// ---- mocks ----

vi.mock("@/db/games/actions/withdraw-participant", () => ({
  withdrawParticipant: vi.fn(),
}));

vi.mock("@/socket/middleware/director-auth", () => ({
  assertDirector: vi.fn(),
}));

vi.mock("@/socket/broadcast/participant-broadcast", () => ({
  broadcastParticipants: vi.fn(),
}));

vi.mock("@/socket/handlers/results/broadcast-results", () => ({
  broadcastLeaderboardChanged: vi.fn(),
}));

vi.mock("@/db/games", () => ({
  getDb: vi.fn(),
}));

import { withdrawParticipant } from "@/db/games/actions/withdraw-participant";
import { assertDirector } from "@/socket/middleware/director-auth";
import { broadcastParticipants } from "@/socket/broadcast/participant-broadcast";
import { broadcastLeaderboardChanged } from "@/socket/handlers/results/broadcast-results";
import { getDb } from "@/db/games";
import { registerSetParticipantStandingHandler } from "./set-participant-standing";

function makeSocket() {
  return { data: {}, id: "s", on: vi.fn() };
}
function makeIo() {
  return { to: vi.fn(() => ({ emit: vi.fn() })) };
}

/** Register the handler and return the (payload, cb) entry point it bound. */
function handlerFor() {
  const socket = makeSocket();
  registerSetParticipantStandingHandler(socket as any, makeIo() as any);
  const [event, fn] = socket.on.mock.calls[0];
  return { event, fn };
}

describe("registerSetParticipantStandingHandler (unit)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getDb).mockResolvedValue({} as any);
    vi.mocked(assertDirector).mockReturnValue(true);
    vi.mocked(withdrawParticipant).mockResolvedValue(true);
  });

  it("registers on the SET_PARTICIPANT_STANDING event", () => {
    const { event } = handlerFor();
    expect(event).toBe(SocketEvents.SET_PARTICIPANT_STANDING);
  });

  it("withdraws a pair and fans out participants + leaderboard", async () => {
    const { fn } = handlerFor();
    const cb = vi.fn();

    await fn(
      {
        gameId: "g1",
        directorToken: "tok",
        seat: "A1NS",
        change: {
          standing: "WITHDRAWN",
          withdrawnInRound: 2,
          treatment: "PENALISED",
          finePercent: 10,
        },
      },
      cb,
    );

    expect(withdrawParticipant).toHaveBeenCalledWith("g1", "A1NS", {
      standing: "WITHDRAWN",
      withdrawnInRound: 2,
      treatment: "PENALISED",
      finePercent: 10,
    });
    expect(broadcastParticipants).toHaveBeenCalled();
    expect(broadcastLeaderboardChanged).toHaveBeenCalled();
    expect(cb).toHaveBeenCalledWith({ success: true, data: null });
  });

  it("rejects when the director token is not valid (no mutation, no broadcast)", async () => {
    vi.mocked(assertDirector).mockReturnValue(false);
    const { fn } = handlerFor();
    const cb = vi.fn();

    await fn(
      {
        gameId: "g1",
        directorToken: "bad",
        seat: "A1NS",
        change: { standing: "ACTIVE" },
      },
      cb,
    );

    expect(withdrawParticipant).not.toHaveBeenCalled();
    expect(broadcastParticipants).not.toHaveBeenCalled();
    expect(broadcastLeaderboardChanged).not.toHaveBeenCalled();
  });

  it("fails when no contestant is seated at the seat", async () => {
    vi.mocked(withdrawParticipant).mockResolvedValue(false);
    const { fn } = handlerFor();
    const cb = vi.fn();

    await fn(
      {
        gameId: "g1",
        directorToken: "tok",
        seat: "Z9NS",
        change: { standing: "ACTIVE" },
      },
      cb,
    );

    expect(cb).toHaveBeenCalledWith(
      expect.objectContaining({ success: false }),
    );
    expect(broadcastParticipants).not.toHaveBeenCalled();
  });
});
