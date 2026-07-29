import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Socket } from "socket.io";
import { createSocketTestServer } from "@/socket/test/socket-test-harness";
import { waitForEvent } from "@/socket/test/socket-helpers";
import { SocketEvents } from "@/socket/socket-events";

// ---- mocks ----
vi.mock("@/timer/game-store", () => ({
  getEngine: vi.fn(),
}));

vi.mock("@/db/games/shared/actions/update-timer-state", () => ({
  updateTimerState: vi.fn(),
}));

vi.mock("@/timer/scheduler", () => ({
  scheduleGame: vi.fn(),
}));

vi.mock("@/db/system/queries/find-login-session", () => ({
  findLoginSession: vi.fn(),
}));

import { getEngine } from "@/timer/game-store";
import { updateTimerState } from "@/db/games/shared/actions/update-timer-state";
import { registerUpdateConfigHandler } from "./update-config.handler";
import { registerJoinGameHandler } from "@/socket/handlers/game/join-game/join-game.handler";
import { BridgeTimerEngine } from "@/timer/bridge-timer-engine";
import { TimerState } from "@/timer/timer-state";

describe("registerUpdateConfigHandler (integration)", () => {
  let closeServer: () => Promise<void>;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await closeServer?.();
  });

  it("updates config and broadcasts timer:sync with new values", async () => {
    const timerState: TimerState = {
      version: 1,
      phase: "play",
      board: 1,
      round: 1,
      boardsPerRound: 3,
      totalRounds: 5,
      playDuration: 420,
      moveDuration: 60,
      isRunning: false,
      phaseStartedAt: null,
      remainingMs: 420000,
    };

    const engine = new BridgeTimerEngine(timerState);

    vi.mocked(getEngine).mockResolvedValue(engine);
    vi.mocked(updateTimerState).mockResolvedValue(undefined);

    const { client, close } = await createSocketTestServer((io) => {
      io.on("connection", (socket: Socket) => {
        socket.data.isDirector = true;
        registerJoinGameHandler(socket);
        registerUpdateConfigHandler(socket, io);
      });
    });
    closeServer = close;

    await new Promise<void>((resolve) => {
      client.emit(SocketEvents.JOIN_GAME, { gameId: "game-1" }, () => resolve());
    });

    const syncPromise = waitForEvent(client, "timer:sync");

    client.emit(SocketEvents.UPDATE_CONFIG_TIMER, {
      gameType: "PAIRS",
      gameId: "game-1",
      boardsPerRound: 4,
      totalRounds: 7,
      playDuration: 480,
      moveDuration: 90,
    });

    const syncPayload = await syncPromise;

    expect(syncPayload).toMatchObject({
      boardsPerRound: 4,
      totalRounds: 7,
      playDuration: 480,
      moveDuration: 90,
    });
    expect(syncPayload).toHaveProperty("serverNow");
  });

  it("non-director is silently rejected (no broadcast)", async () => {
    const { client, close } = await createSocketTestServer((io) => {
      io.on("connection", (socket: Socket) => {
        socket.data.isDirector = false;
        registerJoinGameHandler(socket);
        registerUpdateConfigHandler(socket, io);
      });
    });
    closeServer = close;

    await new Promise<void>((resolve) => {
      client.emit(SocketEvents.JOIN_GAME, { gameId: "game-1" }, () => resolve());
    });

    const syncPromise = waitForEvent(client, "timer:sync", 500).catch(
      () => "timeout",
    );

    client.emit(SocketEvents.UPDATE_CONFIG_TIMER, {
      gameType: "PAIRS",
      gameId: "game-1",
      boardsPerRound: 4,
      totalRounds: 7,
      playDuration: 480,
      moveDuration: 90,
    });

    const result = await syncPromise;
    expect(result).toBe("timeout");
    expect(getEngine).not.toHaveBeenCalled();
  });

  it("no-op when engine not found (no broadcast)", async () => {
    vi.mocked(getEngine).mockResolvedValue(null);

    const { client, close } = await createSocketTestServer((io) => {
      io.on("connection", (socket: Socket) => {
        socket.data.isDirector = true;
        registerJoinGameHandler(socket);
        registerUpdateConfigHandler(socket, io);
      });
    });
    closeServer = close;

    await new Promise<void>((resolve) => {
      client.emit(SocketEvents.JOIN_GAME, { gameId: "game-1" }, () => resolve());
    });

    const syncPromise = waitForEvent(client, "timer:sync", 500).catch(
      () => "timeout",
    );

    client.emit(SocketEvents.UPDATE_CONFIG_TIMER, {
      gameType: "PAIRS",
      gameId: "game-1",
      boardsPerRound: 4,
      totalRounds: 7,
      playDuration: 480,
      moveDuration: 90,
    });

    const result = await syncPromise;
    expect(result).toBe("timeout");
    expect(updateTimerState).not.toHaveBeenCalled();
  });
});
