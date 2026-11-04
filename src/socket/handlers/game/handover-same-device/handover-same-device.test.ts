import { describe, it, expect, vi, beforeEach } from "vitest";
import { SocketEvents } from "@/socket/socket-events";

// ---- mocks ----

vi.mock("@/db/games/actions/handover-seat", () => ({
  handoverSeat: vi.fn(),
}));

vi.mock("@/socket/middleware/participant-auth", () => ({
  assertPlayer: vi.fn(),
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

vi.mock("@/db/game-index/queries/is-teams-game", () => ({
  isTeamsGame: vi.fn(),
}));

import { handoverSeat } from "@/db/games/actions/handover-seat";
import { isTeamsGame } from "@/db/game-index/queries/is-teams-game";
import { assertPlayer } from "@/socket/middleware/participant-auth";
import { broadcastParticipants } from "@/socket/broadcast/participant-broadcast";
import { broadcastLeaderboardChanged } from "@/socket/handlers/results/broadcast-results";
import { getDb } from "@/db/games";
import { registerHandoverSameDeviceHandler } from "./handover-same-device";

function makeSocket() {
  return { data: {}, id: "s", on: vi.fn() };
}
function makeIo() {
  return { to: vi.fn(() => ({ emit: vi.fn() })) };
}

function handlerFor() {
  const socket = makeSocket();
  registerHandoverSameDeviceHandler(socket as any, makeIo() as any);
  const [event, fn] = socket.on.mock.calls[0];
  return { event, fn };
}

const validPayload = {
  gameId: "g1",
  seat: "A1NS",
  token: "seat-tok",
  realPair: {
    player1: { firstName: "Real", lastName: "One" },
    player2: { firstName: "Real", lastName: "Two" },
  },
};

describe("registerHandoverSameDeviceHandler (unit)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getDb).mockResolvedValue({} as any);
    vi.mocked(assertPlayer).mockResolvedValue(true);
    vi.mocked(handoverSeat).mockResolvedValue({ ok: true });
    vi.mocked(isTeamsGame).mockResolvedValue(false);
  });

  it("tells the engine whether this is a teams game (for the team pair cap)", async () => {
    const { fn } = handlerFor();

    vi.mocked(isTeamsGame).mockResolvedValue(true);
    await fn(validPayload, vi.fn());
    expect(isTeamsGame).toHaveBeenCalledWith("g1");
    expect(vi.mocked(handoverSeat).mock.calls[0][1]).toMatchObject({
      teamsGame: true,
    });
  });

  it("registers on the HANDOVER_SAME_DEVICE event", () => {
    const { event } = handlerFor();
    expect(event).toBe(SocketEvents.HANDOVER_SAME_DEVICE);
  });

  it("player-auths the seat, hands over with no treatment, and returns the new key", async () => {
    const { fn } = handlerFor();
    const cb = vi.fn();
    await fn(validPayload, cb);

    // Authenticated with the device's seat token (not a director token).
    expect(assertPlayer).toHaveBeenCalledWith(
      "g1",
      "A1NS",
      "seat-tok",
      expect.anything(),
    );
    // Options are deferred — the handler passes no options (the director
    // sets them later on the Substitutions screen).
    expect(handoverSeat).toHaveBeenCalledWith(
      "g1",
      expect.objectContaining({
        seat: "A1NS",
        secretKey: expect.any(String),
      }),
    );
    expect(broadcastParticipants).toHaveBeenCalledWith("g1", expect.anything());
    expect(broadcastLeaderboardChanged).toHaveBeenCalledWith(
      expect.anything(),
      "g1",
    );
    // The ack carries the minted device secret for THIS device to store.
    expect(cb).toHaveBeenCalledWith({
      success: true,
      data: { key: expect.any(String) },
    });
  });

  it("rejects when the device does not own the seat", async () => {
    vi.mocked(assertPlayer).mockResolvedValue(false);
    const { fn } = handlerFor();
    const cb = vi.fn();
    await fn(validPayload, cb);

    expect(handoverSeat).not.toHaveBeenCalled();
    expect(broadcastParticipants).not.toHaveBeenCalled();
  });

  it("returns a failure when the handover engine rejects", async () => {
    vi.mocked(handoverSeat).mockResolvedValue({
      ok: false,
      error: "This seat has already had a handover.",
    });
    const { fn } = handlerFor();
    const cb = vi.fn();
    await fn(validPayload, cb);

    expect(cb).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: "This seat has already had a handover.",
      }),
    );
    expect(broadcastParticipants).not.toHaveBeenCalled();
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
