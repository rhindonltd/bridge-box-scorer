import { describe, it, expect, vi, beforeEach } from "vitest";
import { SocketEvents } from "@/socket/socket-events";

vi.mock("@/db/games", () => ({ getDb: vi.fn() }));
vi.mock("@/db/game-index/queries/find-game-by-id", () => ({
  findGameById: vi.fn(),
}));
vi.mock("@/db/games/queries/is-game-started", () => ({
  isGameStarted: vi.fn(),
}));
vi.mock("@/db/games/actions/record-withdrawal", () => ({
  recordWithdrawal: vi.fn(),
}));
vi.mock("@/services/resolve-play-state", () => ({
  resolvePlayState: vi.fn(),
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

import { getDb } from "@/db/games";
import { findGameById } from "@/db/game-index/queries/find-game-by-id";
import { isGameStarted } from "@/db/games/queries/is-game-started";
import { recordWithdrawal } from "@/db/games/actions/record-withdrawal";
import { resolvePlayState } from "@/services/resolve-play-state";
import { assertPlayer } from "@/socket/middleware/participant-auth";
import { broadcastParticipants } from "@/socket/broadcast/participant-broadcast";
import { registerWithdrawPairHandler } from "./withdraw-pair";

function handlerFor() {
  const socket = { data: {}, id: "s", on: vi.fn() };
  const emit = vi.fn();
  const io = { to: vi.fn(() => ({ emit })) };
  registerWithdrawPairHandler(socket as never, io as never);
  const [event, fn] = socket.on.mock.calls[0];
  return { event, fn, io, emit };
}

const payload = { gameId: "g1", seat: "A1NS", token: "tok" };

describe("registerWithdrawPairHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(assertPlayer).mockResolvedValue(true);
    vi.mocked(findGameById).mockResolvedValue({
      gameId: "g1",
      gameType: "PAIRS",
      eventFormat: "STANDARD",
    } as never);
    vi.mocked(isGameStarted).mockResolvedValue(true);
    vi.mocked(getDb).mockResolvedValue({} as never);
    vi.mocked(resolvePlayState).mockResolvedValue({
      assignmentId: "A1NS",
      side: "NS",
      rounds: [{ roundNumber: 1 }, { roundNumber: 2 }],
      phase: {
        kind: "round",
        roundIndex: 1,
        position: { at: "entering", boardNumber: 3 },
      },
    } as never);
    vi.mocked(recordWithdrawal).mockResolvedValue({
      ok: true,
      absentBoards: 2,
    });
  });

  it("registers on WITHDRAW_PAIR", () => {
    expect(handlerFor().event).toBe(SocketEvents.WITHDRAW_PAIR);
  });

  it("withdraws from the round the pair is on and tells every device its schedule changed", async () => {
    const { fn, io, emit } = handlerFor();
    const cb = vi.fn();
    await fn(payload, cb);

    expect(assertPlayer).toHaveBeenCalledWith(
      "g1",
      "A1NS",
      "tok",
      expect.any(Function),
    );
    expect(recordWithdrawal).toHaveBeenCalledWith("g1", "A1NS", 2);
    expect(cb).toHaveBeenCalledWith({ success: true, data: null });
    expect(io.to).toHaveBeenCalledWith("game:g1");
    expect(emit).toHaveBeenCalledWith(SocketEvents.SCHEDULE_CHANGED, {
      gameId: "g1",
    });
    expect(broadcastParticipants).toHaveBeenCalled();
  });

  it("does nothing for a device that does not hold the seat", async () => {
    vi.mocked(assertPlayer).mockResolvedValue(false);
    const { fn } = handlerFor();
    await fn(payload, vi.fn());
    expect(recordWithdrawal).not.toHaveBeenCalled();
  });

  it("is not available for a teams or Swiss event", async () => {
    for (const game of [
      { gameType: "TEAMS", eventFormat: "STANDARD" },
      { gameType: "PAIRS", eventFormat: "SWISS" },
    ]) {
      vi.mocked(findGameById).mockResolvedValue(game as never);
      const { fn } = handlerFor();
      const cb = vi.fn();
      await fn(payload, cb);
      expect(cb).toHaveBeenCalledWith(
        expect.objectContaining({ success: false }),
      );
    }
    expect(recordWithdrawal).not.toHaveBeenCalled();
  });

  it("rejects before the game has started", async () => {
    vi.mocked(isGameStarted).mockResolvedValue(false);
    const { fn } = handlerFor();
    const cb = vi.fn();
    await fn(payload, cb);
    expect(cb).toHaveBeenCalledWith(
      expect.objectContaining({ success: false }),
    );
    expect(recordWithdrawal).not.toHaveBeenCalled();
  });

  it("rejects when the pair has nothing left to play", async () => {
    vi.mocked(resolvePlayState).mockResolvedValue({
      rounds: [],
      phase: { kind: "complete" },
    } as never);
    const { fn } = handlerFor();
    const cb = vi.fn();
    await fn(payload, cb);
    expect(cb).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: "There are no boards left for this pair to play.",
      }),
    );
  });

  it("relays the action's reason when it rejects", async () => {
    vi.mocked(recordWithdrawal).mockResolvedValue({
      ok: false,
      error: "This pair has already withdrawn.",
    });
    const { fn } = handlerFor();
    const cb = vi.fn();
    await fn(payload, cb);
    expect(cb).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: "This pair has already withdrawn.",
      }),
    );
    expect(broadcastParticipants).not.toHaveBeenCalled();
  });
});
