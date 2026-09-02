import { describe, it, expect, vi, beforeEach } from "vitest";
import { SocketEvents } from "@/socket/socket-events";

// ---- mocks ----

vi.mock("@/db/game-index/actions/set-selected-movement", () => ({
  setSelectedMovement: vi.fn(async () => {}),
}));

vi.mock("@/db/game-index/queries/find-game-by-id", () => ({
  findGameById: vi.fn(async () => ({ gameId: "g1" })),
}));

vi.mock("@/db/system/queries/find-login-session", () => ({
  findLoginSession: vi.fn(),
}));

import { setSelectedMovement } from "@/db/game-index/actions/set-selected-movement";
import { findLoginSession } from "@/db/system/queries/find-login-session";
import { registerSelectMovementHandler } from "./select-movement.handler";

function makeDirectorSocket() {
  return {
    data: {},
    id: "test-socket",
    on: vi.fn(),
  };
}

function makeIo() {
  const emit = vi.fn();
  const io = { to: vi.fn(() => ({ emit })) };
  return { io, emit };
}

describe("registerSelectMovementHandler (unit)", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default: valid director session
    vi.mocked(findLoginSession).mockReturnValue({
      token: "test-token",
      role: "DIRECTOR",
      gameId: "g1",
    } as any);
  });

  it("registers handler on SELECT_MOVEMENT event", () => {
    const socket = makeDirectorSocket();
    const { io } = makeIo();
    registerSelectMovementHandler(socket as any, io as any);
    expect(socket.on).toHaveBeenCalledWith(
      SocketEvents.SELECT_MOVEMENT,
      expect.any(Function),
    );
  });

  it("rejects when directorToken is invalid", async () => {
    vi.mocked(findLoginSession).mockReturnValue(null as any);

    const socket = makeDirectorSocket();
    const { io } = makeIo();
    registerSelectMovementHandler(socket as any, io as any);

    const handler = socket.on.mock.calls[0][1];
    const cb = vi.fn();

    await handler(
      { gameId: "g1", type: "PAIRS", id: 1, directorToken: "bad-token" },
      cb,
    );

    expect(cb).toHaveBeenCalledWith({ success: false, error: "Unauthorized" });
    expect(setSelectedMovement).not.toHaveBeenCalled();
  });

  it("persists a SPEC selection and does not materialize", async () => {
    const socket = makeDirectorSocket();
    const { io, emit } = makeIo();
    registerSelectMovementHandler(socket as any, io as any);

    const handler = socket.on.mock.calls[0][1];
    const cb = vi.fn();

    await handler(
      {
        gameId: "g1",
        type: "PAIRS",
        id: 5,
        boardsPerRound: 3,
        directorToken: "test-token",
      },
      cb,
    );

    expect(setSelectedMovement).toHaveBeenCalledWith("g1", {
      source: "SPEC",
      specId: 5,
      boardsPerRound: 3,
    });
    expect(emit).toHaveBeenCalledWith(
      SocketEvents.GAME_UPDATED,
      expect.objectContaining({ game: expect.any(Object) }),
    );
    expect(cb).toHaveBeenCalledWith({ success: true });
  });

  it("persists a MITCHELL selection", async () => {
    const socket = makeDirectorSocket();
    const { io } = makeIo();
    registerSelectMovementHandler(socket as any, io as any);

    const handler = socket.on.mock.calls[0][1];
    const cb = vi.fn();

    const mitchell = { tables: 3, rounds: 3, boardsPerRound: 2 };

    await handler(
      {
        gameId: "g1",
        type: "PAIRS",
        mitchell,
        directorToken: "test-token",
      },
      cb,
    );

    expect(setSelectedMovement).toHaveBeenCalledWith("g1", {
      source: "MITCHELL",
      mitchell,
    });
    expect(cb).toHaveBeenCalledWith({ success: true });
  });

  it("re-selecting overwrites the previous selection", async () => {
    const socket = makeDirectorSocket();
    const { io } = makeIo();
    registerSelectMovementHandler(socket as any, io as any);

    const handler = socket.on.mock.calls[0][1];
    const cb = vi.fn();

    await handler(
      {
        gameId: "g1",
        type: "PAIRS",
        id: 1,
        boardsPerRound: 2,
        directorToken: "test-token",
      },
      cb,
    );
    await handler(
      {
        gameId: "g1",
        type: "PAIRS",
        id: 2,
        boardsPerRound: 3,
        directorToken: "test-token",
      },
      cb,
    );

    expect(setSelectedMovement).toHaveBeenNthCalledWith(1, "g1", {
      source: "SPEC",
      specId: 1,
      boardsPerRound: 2,
    });
    expect(setSelectedMovement).toHaveBeenNthCalledWith(2, "g1", {
      source: "SPEC",
      specId: 2,
      boardsPerRound: 3,
    });
  });

  it("returns error when a SPEC id is given without boards per round", async () => {
    const socket = makeDirectorSocket();
    const { io } = makeIo();
    registerSelectMovementHandler(socket as any, io as any);

    const handler = socket.on.mock.calls[0][1];
    const cb = vi.fn();

    await handler(
      { gameId: "g1", type: "PAIRS", id: 1, directorToken: "test-token" },
      cb,
    );

    expect(cb).toHaveBeenCalledWith({
      success: false,
      error: "No boards per round specified",
    });
    expect(setSelectedMovement).not.toHaveBeenCalled();
  });

  it("returns success: false when persisting throws", async () => {
    const socket = makeDirectorSocket();
    const { io } = makeIo();
    registerSelectMovementHandler(socket as any, io as any);

    const handler = socket.on.mock.calls[0][1];
    const cb = vi.fn();

    vi.mocked(setSelectedMovement).mockRejectedValueOnce(new Error("db fail"));

    await handler(
      {
        gameId: "g1",
        type: "PAIRS",
        id: 1,
        boardsPerRound: 2,
        directorToken: "test-token",
      },
      cb,
    );

    expect(cb).toHaveBeenCalledWith({ success: false });
  });

  it("returns error when no movement specified (no id and no mitchell)", async () => {
    const socket = makeDirectorSocket();
    const { io } = makeIo();
    registerSelectMovementHandler(socket as any, io as any);

    const handler = socket.on.mock.calls[0][1];
    const cb = vi.fn();

    await handler(
      { gameId: "g1", type: "PAIRS", directorToken: "test-token" },
      cb,
    );

    expect(cb).toHaveBeenCalledWith({
      success: false,
      error: "No movement specified",
    });
    expect(setSelectedMovement).not.toHaveBeenCalled();
  });

  it("does not throw when cb is undefined and no movement specified", async () => {
    const socket = makeDirectorSocket();
    const { io } = makeIo();
    registerSelectMovementHandler(socket as any, io as any);

    const handler = socket.on.mock.calls[0][1];

    await expect(
      handler(
        { gameId: "g1", type: "PAIRS", directorToken: "test-token" },
        undefined,
      ),
    ).resolves.not.toThrow();

    expect(setSelectedMovement).not.toHaveBeenCalled();
  });
});
