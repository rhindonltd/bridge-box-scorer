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
import { registerPreviousHandler } from "./previous.handler";
import { registerJoinGameHandler } from "@/socket/handlers/game/join-game/join-game.handler";

describe("registerPreviousHandler (integration)", () => {
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

  it("steps to the previous phase, persists, broadcasts and reschedules", async () => {
    const state = { phase: "move", round: 2 };
    const engine = {
      previousPhase: vi.fn(),
      restartPhase: vi.fn(),
      getState: vi.fn(() => state),
    };
    vi.mocked(getEngine).mockResolvedValue(engine as any);
    vi.mocked(updateTimerState).mockResolvedValue(undefined);

    const { client, close } = await createSocketTestServer((io) => {
      io.on("connection", (socket: Socket) => {
        registerJoinGameHandler(socket);
        registerPreviousHandler(socket, io);
      });
    });
    closeServer = close;

    await new Promise<void>((resolve) => {
      client.emit(SocketEvents.JOIN_GAME, { gameId: "game-1" }, () => resolve());
    });

    const syncPromise = waitForEvent(client, "timer:sync");

    client.emit(SocketEvents.PREVIOUS_TIMER, {
      gameType: "PAIRS",
      gameId: "game-1",
      directorToken: "test-token",
    });

    const sync = await syncPromise;
    expect(sync).toMatchObject(state);
    expect(engine.previousPhase).toHaveBeenCalled();
    expect(scheduleGame).toHaveBeenCalled();
  });

  it("ignores an invalid payload (no engine lookup)", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const { client, close } = await createSocketTestServer((io) => {
      io.on("connection", (socket: Socket) => {
        registerPreviousHandler(socket, io);
      });
    });
    closeServer = close;

    // Missing gameId / directorToken fails the schema.
    client.emit(SocketEvents.PREVIOUS_TIMER, { restart: 123 });

    await vi.waitFor(() =>
      expect(warnSpy).toHaveBeenCalledWith(
        "Invalid PREVIOUS_TIMER payload:",
        expect.any(String),
      ),
    );
    expect(getEngine).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it("logs and swallows an error when persistence fails (catch block)", async () => {
    const engine = {
      previousPhase: vi.fn(),
      restartPhase: vi.fn(),
      getState: vi.fn(() => ({ phase: "play" })),
    };
    vi.mocked(getEngine).mockResolvedValue(engine as any);
    vi.mocked(updateTimerState).mockRejectedValue(new Error("db down"));
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const { client, close } = await createSocketTestServer((io) => {
      io.on("connection", (socket: Socket) => {
        registerPreviousHandler(socket, io);
      });
    });
    closeServer = close;

    client.emit(SocketEvents.PREVIOUS_TIMER, {
      gameType: "PAIRS",
      gameId: "game-1",
      directorToken: "test-token",
    });

    await vi.waitFor(() =>
      expect(errSpy).toHaveBeenCalledWith(
        "Failed to step timer back for game game-1:",
        expect.any(Error),
      ),
    );
    expect(scheduleGame).not.toHaveBeenCalled();
    errSpy.mockRestore();
  });
});
