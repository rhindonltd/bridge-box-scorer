import { describe, it, expect, vi, beforeEach } from "vitest";
import { SocketEvents } from "@/socket/socket-events";

vi.mock("@/db/game-index/queries/find-game-by-id", () => ({
  findGameById: vi.fn(),
}));

vi.mock("@/db/games/pairs/actions/delete-participant", () => ({
  deleteParticipant: vi.fn(),
}));

vi.mock("@/db/games/pairs/queries/find-pairs", () => ({
  findPairs: vi.fn(),
}));

vi.mock("@/db/system/queries/find-login-session", () => ({
  findLoginSession: vi.fn(),
}));

import { findGameById } from "@/db/game-index/queries/find-game-by-id";
import { deleteParticipant as deletePair } from "@/db/games/pairs/actions/delete-participant";
import { findPairs } from "@/db/games/pairs/queries/find-pairs";
import { findLoginSession } from "@/db/system/queries/find-login-session";
import { registerEvictParticipantHandler } from "./evict-participant.handler";

function makeSocket() {
  return { data: {}, id: "test", on: vi.fn() } as any;
}

function makeIo() {
  const emit = vi.fn();
  return { to: vi.fn(() => ({ emit })), _emit: emit } as any;
}

describe("registerEvictParticipantHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(findLoginSession).mockReturnValue({
      token: "test-token",
      role: "DIRECTOR",
      gameId: "g1",
    } as any);
  });

  it("registers handler on EVICT_PARTICIPANT event", () => {
    const socket = makeSocket();
    registerEvictParticipantHandler(socket, makeIo());
    expect(socket.on).toHaveBeenCalledWith(
      SocketEvents.EVICT_PARTICIPANT,
      expect.any(Function),
    );
  });

  it("evicts a PAIRS participant and broadcasts updated list", async () => {
    vi.mocked(findGameById).mockResolvedValue({
      gameId: "g1",
      gameType: "PAIRS",
    } as any);
    vi.mocked(deletePair).mockResolvedValue(undefined);
    vi.mocked(findPairs).mockResolvedValue([]);

    const socket = makeSocket();
    const io = makeIo();
    registerEvictParticipantHandler(socket, io);

    const handler = socket.on.mock.calls[0][1];
    const cb = vi.fn();
    await handler({ gameId: "g1", seat: "2NS", directorToken: "test-token" }, cb);

    expect(deletePair).toHaveBeenCalledWith("g1", "2NS");
    expect(io._emit).toHaveBeenCalledWith(
      SocketEvents.PARTICIPANTS,
      { participants: [] },
    );
    expect(cb).toHaveBeenCalledWith({ success: true });
  });

  it("rejects non-directors", async () => {
    vi.mocked(findLoginSession).mockReturnValue(null as any);

    const socket = makeSocket();
    const io = makeIo();
    registerEvictParticipantHandler(socket, io);

    const handler = socket.on.mock.calls[0][1];
    const cb = vi.fn();
    await handler({ gameId: "g1", seat: "1NS", directorToken: "bad-token" }, cb);

    expect(cb).toHaveBeenCalledWith({ success: false, error: "Unauthorized" });
    expect(findGameById).not.toHaveBeenCalled();
  });

  it("returns error for invalid payload", async () => {
    const socket = makeSocket();
    const io = makeIo();
    registerEvictParticipantHandler(socket, io);

    const handler = socket.on.mock.calls[0][1];
    const cb = vi.fn();
    await handler({ gameId: "" }, cb);

    expect(cb).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, error: "Invalid payload" }),
    );
  });

  it("returns error when game not found", async () => {
    vi.mocked(findLoginSession).mockReturnValue({
      token: "test-token",
      role: "DIRECTOR",
      gameId: "nonexistent",
    } as any);
    vi.mocked(findGameById).mockResolvedValue(null);

    const socket = makeSocket();
    const io = makeIo();
    registerEvictParticipantHandler(socket, io);

    const handler = socket.on.mock.calls[0][1];
    const cb = vi.fn();
    await handler({ gameId: "nonexistent", seat: "1NS", directorToken: "test-token" }, cb);

    expect(cb).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, error: "Game not found" }),
    );
  });

  it("returns internal server error when deleteParticipant throws", async () => {
    vi.mocked(findGameById).mockResolvedValue({
      gameId: "g1",
      gameType: "PAIRS",
    } as any);
    vi.mocked(deletePair).mockRejectedValue(new Error("DB failure"));

    const socket = makeSocket();
    const io = makeIo();
    registerEvictParticipantHandler(socket, io);

    const handler = socket.on.mock.calls[0][1];
    const cb = vi.fn();
    await handler({ gameId: "g1", seat: "2NS", directorToken: "test-token" }, cb);

    expect(cb).toHaveBeenCalledWith({
      success: false,
      error: "Internal server error",
    });
  });
});
