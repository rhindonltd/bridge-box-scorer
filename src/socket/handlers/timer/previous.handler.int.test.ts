import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Socket } from "socket.io";
import { createSocketTestServer } from "@/socket/test/socket-test-harness";
import { waitForEvent, emitWithAck } from "@/socket/test/socket-helpers";
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
import { registerRequestStateHandler } from "./request-state.handler";
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
        registerJoinGameHandler(socket, io);
        registerRequestStateHandler(socket, io);
        registerPreviousHandler(socket, io);
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

    client.emit(SocketEvents.PREVIOUS_TIMER, {
      gameType: "PAIRS",
      gameId: "game-1",
      section: "A",
      directorToken: "test-token",
    });

    const sync = await syncPromise;
    expect(sync).toMatchObject(state);
    expect(engine.previousPhase).toHaveBeenCalled();
    expect(scheduleGame).toHaveBeenCalled();
  });

  it("rejects an invalid payload (no engine lookup)", async () => {
    const { client, close } = await createSocketTestServer((io) => {
      io.on("connection", (socket: Socket) => {
        registerPreviousHandler(socket, io);
      });
    });
    closeServer = close;

    // Missing gameId / directorToken fails the schema, so the handler is acked
    // an "Invalid request" failure and never looks up an engine.
    const res = await emitWithAck(client, SocketEvents.PREVIOUS_TIMER, {
      restart: 123,
    });

    expect(res).toEqual({ success: false, error: "Invalid request" });
    expect(getEngine).not.toHaveBeenCalled();
  });

  it("acks a generic failure when persistence fails (catch block)", async () => {
    const engine = {
      previousPhase: vi.fn(),
      restartPhase: vi.fn(),
      getState: vi.fn(() => ({ phase: "play" })),
    };
    vi.mocked(getEngine).mockResolvedValue(engine as any);
    vi.mocked(updateTimerState).mockRejectedValue(new Error("db down"));

    const { client, close } = await createSocketTestServer((io) => {
      io.on("connection", (socket: Socket) => {
        registerPreviousHandler(socket, io);
      });
    });
    closeServer = close;

    const res = await emitWithAck(client, SocketEvents.PREVIOUS_TIMER, {
      gameType: "PAIRS",
      gameId: "game-1",
      section: "A",
      directorToken: "test-token",
    });

    expect(res).toEqual({ success: false, error: "Internal error" });
    expect(scheduleGame).not.toHaveBeenCalled();
  });
});
