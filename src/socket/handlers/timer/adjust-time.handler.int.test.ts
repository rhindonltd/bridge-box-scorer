import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Socket } from "socket.io";
import { createSocketTestServer } from "@/socket/test/socket-test-harness";
import { waitForEvent } from "@/socket/test/socket-helpers";
import { SocketEvents } from "@/socket/socket-events";

vi.mock("@/timer/game-store", () => ({
  getEngine: vi.fn(),
}));

vi.mock("@/db/games/actions/update-timer-state", () => ({
  updateTimerState: vi.fn(),
}));

vi.mock("@/timer/scheduler", () => ({
  scheduleGame: vi.fn(),
}));

vi.mock("@/db/system/queries/find-login-session", () => ({
  findLoginSession: vi.fn(),
}));

import { getEngine } from "@/timer/game-store";
import { updateTimerState } from "@/db/games/actions/update-timer-state";
import { scheduleGame } from "@/timer/scheduler";
import { findLoginSession } from "@/db/system/queries/find-login-session";
import { registerAdjustTimeHandler } from "./adjust-time.handler";
import { registerRequestStateHandler } from "./request-state.handler";
import { registerJoinGameHandler } from "@/socket/handlers/game/join-game/join-game.handler";
import { emitWithAck } from "@/socket/test/socket-helpers";

describe("registerAdjustTimeHandler (integration)", () => {
  let closeServer: () => Promise<void>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(findLoginSession).mockReturnValue({
      token: "test-token",
      role: "DIRECTOR",
      gameId: "game-1",
    } as any);
  });

  afterEach(async () => {
    await closeServer?.();
  });

  it("adjusts time, persists, broadcasts timer:sync and reschedules", async () => {
    const state = { phase: "play", remainingMs: 300_000 };
    const engine = {
      adjustTime: vi.fn(),
      getState: vi.fn(() => state),
    };
    vi.mocked(getEngine).mockResolvedValue(engine as any);
    vi.mocked(updateTimerState).mockResolvedValue(undefined);

    const { client, close } = await createSocketTestServer((io) => {
      io.on("connection", (socket: Socket) => {
        registerJoinGameHandler(socket);
        registerRequestStateHandler(socket, io);
        registerAdjustTimeHandler(socket, io);
      });
    });
    closeServer = close;

    await new Promise<void>((resolve) => {
      client.emit(SocketEvents.JOIN_GAME, { gameId: "game-1" }, () => resolve());
    });
    await emitWithAck(client, SocketEvents.REQUEST_STATE_TIMER, {
      gameId: "game-1",
      section: "A",
    });

    const syncPromise = waitForEvent(client, "timer:sync");

    client.emit(SocketEvents.ADJUST_TIME_TIMER, {
      gameType: "PAIRS",
      gameId: "game-1",
      section: "A",
      directorToken: "test-token",
      deltaSeconds: 30,
    });

    const sync = await syncPromise;
    expect(sync).toMatchObject(state);
    expect(engine.adjustTime).toHaveBeenCalledWith(30_000, false);
    expect(scheduleGame).toHaveBeenCalled();
  });

  it("does nothing when the engine is missing", async () => {
    vi.mocked(getEngine).mockResolvedValue(null);

    const { client, close } = await createSocketTestServer((io) => {
      io.on("connection", (socket: Socket) => {
        registerAdjustTimeHandler(socket, io);
      });
    });
    closeServer = close;

    client.emit(SocketEvents.ADJUST_TIME_TIMER, {
      gameType: "PAIRS",
      gameId: "game-1",
      section: "A",
      directorToken: "test-token",
      deltaSeconds: 30,
    });

    await vi.waitFor(() => expect(getEngine).toHaveBeenCalled());
    expect(updateTimerState).not.toHaveBeenCalled();
    expect(scheduleGame).not.toHaveBeenCalled();
  });

  it("logs and swallows an error when persistence fails (catch block)", async () => {
    const engine = {
      adjustTime: vi.fn(),
      getState: vi.fn(() => ({ phase: "play" })),
    };
    vi.mocked(getEngine).mockResolvedValue(engine as any);
    vi.mocked(updateTimerState).mockRejectedValue(new Error("db down"));
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const { client, close } = await createSocketTestServer((io) => {
      io.on("connection", (socket: Socket) => {
        registerAdjustTimeHandler(socket, io);
      });
    });
    closeServer = close;

    client.emit(SocketEvents.ADJUST_TIME_TIMER, {
      gameType: "PAIRS",
      gameId: "game-1",
      section: "A",
      directorToken: "test-token",
      deltaSeconds: 30,
    });

    // Give the async handler time to hit the catch.
    await vi.waitFor(() =>
      expect(errSpy).toHaveBeenCalledWith(
        "Failed to adjust timer time for game game-1:",
        expect.any(Error),
      ),
    );

    // The scheduler is never reached once persistence throws.
    expect(scheduleGame).not.toHaveBeenCalled();
    errSpy.mockRestore();
  });
});
