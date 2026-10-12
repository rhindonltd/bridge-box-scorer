import { describe, it, expect, vi, beforeEach } from "vitest";
import { SocketEvents } from "@/socket/socket-events";

// ---- mocks ----

vi.mock("@/db/games/actions/handover-seat", () => ({
  handoverSeat: vi.fn(),
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

import { handoverSeat } from "@/db/games/actions/handover-seat";
import { assertDirector } from "@/socket/middleware/director-auth";
import { broadcastParticipants } from "@/socket/broadcast/participant-broadcast";
import { broadcastLeaderboardChanged } from "@/socket/handlers/results/broadcast-results";
import { getDb } from "@/db/games";
import { registerHandoverSeatHandler } from "./handover-seat";

function makeSocket() {
  return { data: {}, id: "s", on: vi.fn() };
}
function makeIo() {
  return { to: vi.fn(() => ({ emit: vi.fn() })) };
}

function handlerFor() {
  const socket = makeSocket();
  registerHandoverSeatHandler(socket as any, makeIo() as any);
  const [event, fn] = socket.on.mock.calls[0];
  return { event, fn };
}

const validPayload = {
  gameId: "g1",
  directorToken: "tok",
  seat: "A1NS",
  realPair: {
    player1: { firstName: "Real", lastName: "One" },
    player2: { firstName: "Real", lastName: "Two" },
  },
  treatment: "PENALISED",
  finePercent: 10,
};

describe("registerHandoverSeatHandler (unit)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getDb).mockResolvedValue({} as any);
    vi.mocked(assertDirector).mockReturnValue(true);
    vi.mocked(handoverSeat).mockResolvedValue({ ok: true });
  });

  it("registers on the HANDOVER_SEAT event", () => {
    const { event } = handlerFor();
    expect(event).toBe(SocketEvents.HANDOVER_SEAT);
  });

  it("hands over a seat and fans out participants + leaderboard", async () => {
    const { fn } = handlerFor();
    const cb = vi.fn();
    await fn(validPayload, cb);

    expect(handoverSeat).toHaveBeenCalled();
    expect(broadcastParticipants).toHaveBeenCalledWith("g1", expect.anything());
    expect(broadcastLeaderboardChanged).toHaveBeenCalledWith(
      expect.anything(),
      "g1",
    );
    // The ack carries the minted device secret.
    expect(cb).toHaveBeenCalledWith({
      success: true,
      data: { key: expect.any(String) },
    });
  });

  it("rejects when the director token is not valid", async () => {
    vi.mocked(assertDirector).mockReturnValue(false);
    const { fn } = handlerFor();
    const cb = vi.fn();
    await fn(validPayload, cb);

    expect(handoverSeat).not.toHaveBeenCalled();
    expect(broadcastParticipants).not.toHaveBeenCalled();
  });

  it("returns a failure when the action rejects (e.g. no pair seated)", async () => {
    vi.mocked(handoverSeat).mockResolvedValue({
      ok: false,
      error: "No pair is seated there to hand over from.",
    });
    const { fn } = handlerFor();
    const cb = vi.fn();
    await fn(validPayload, cb);

    expect(cb).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: "No pair is seated there to hand over from.",
      }),
    );
    expect(broadcastParticipants).not.toHaveBeenCalled();
    expect(broadcastLeaderboardChanged).not.toHaveBeenCalled();
  });

  it("rejects when the same EBU number is entered for both players", async () => {
    const { fn } = handlerFor();
    const cb = vi.fn();
    await fn(
      {
        ...validPayload,
        realPair: {
          player1: { firstName: "A", lastName: "B", nationalId: "12345" },
          player2: { firstName: "C", lastName: "D", nationalId: "12345" },
        },
      },
      cb,
    );

    expect(cb).toHaveBeenCalledWith(
      expect.objectContaining({ success: false }),
    );
    expect(handoverSeat).not.toHaveBeenCalled();
  });
});
