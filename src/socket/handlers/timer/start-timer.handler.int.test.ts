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
import { updateTimerState } from "@/db/games/actions/update-timer-state";
import { findLoginSession } from "@/db/system/queries/find-login-session";
import { registerStartTimerHandler } from "./start-timer.handler";
import { registerJoinGameHandler } from "@/socket/handlers/game/join-game/join-game.handler";
import { BridgeTimerEngine } from "@/timer/bridge-timer-engine";
import { TimerState } from "@/timer/timer-state";

describe("registerStartTimerHandler (integration)", () => {
  let closeServer: () => Promise<void>;

  beforeEach(() => {
    vi.clearAllMocks();
    // Default: valid director session
    vi.mocked(findLoginSession).mockReturnValue({
      token: "test-token",
      role: "DIRECTOR",
      gameId: "game-1",
    } as any);
  });

  afterEach(async () => {
    await closeServer?.();
  });

  it("starts timer and broadcasts timer:sync to the game room", async () => {
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
        registerJoinGameHandler(socket);
        registerStartTimerHandler(socket, io);
      });
    });
    closeServer = close;

    await new Promise<void>((resolve) => {
      client.emit(SocketEvents.JOIN_GAME, { gameId: "game-1" }, () =>
        resolve(),
      );
    });

    const syncPromise = waitForEvent(client, "timer:sync");

    client.emit(SocketEvents.START_TIMER, {
      gameType: "PAIRS",
      gameId: "game-1",
      directorToken: "test-token",
    });

    const syncPayload = await syncPromise;

    expect(syncPayload).toMatchObject({
      phase: "play",
      round: 1,
      isRunning: true,
    });
    expect(syncPayload).toHaveProperty("serverNow");
    expect(syncPayload).toHaveProperty("phaseStartedAt");
  });

  it("non-director is silently rejected (no broadcast)", async () => {
    vi.mocked(findLoginSession).mockReturnValue(null as any);

    const { client, close } = await createSocketTestServer((io) => {
      io.on("connection", (socket: Socket) => {
        registerJoinGameHandler(socket);
        registerStartTimerHandler(socket, io);
      });
    });
    closeServer = close;

    await new Promise<void>((resolve) => {
      client.emit(SocketEvents.JOIN_GAME, { gameId: "game-1" }, () =>
        resolve(),
      );
    });

    const syncPromise = waitForEvent(client, "timer:sync", 500).catch(
      () => "timeout",
    );

    client.emit(SocketEvents.START_TIMER, {
      gameType: "PAIRS",
      gameId: "game-1",
      directorToken: "bad-token",
    });

    const result = await syncPromise;
    expect(result).toBe("timeout");
    expect(getEngine).not.toHaveBeenCalled();
  });

  it("no-op when engine not found (no broadcast)", async () => {
    vi.mocked(getEngine).mockResolvedValue(null);

    const { client, close } = await createSocketTestServer((io) => {
      io.on("connection", (socket: Socket) => {
        registerJoinGameHandler(socket);
        registerStartTimerHandler(socket, io);
      });
    });
    closeServer = close;

    await new Promise<void>((resolve) => {
      client.emit(SocketEvents.JOIN_GAME, { gameId: "game-1" }, () =>
        resolve(),
      );
    });

    const syncPromise = waitForEvent(client, "timer:sync", 500).catch(
      () => "timeout",
    );

    client.emit(SocketEvents.START_TIMER, {
      gameType: "PAIRS",
      gameId: "game-1",
      directorToken: "test-token",
    });

    const result = await syncPromise;
    expect(result).toBe("timeout");
    expect(updateTimerState).not.toHaveBeenCalled();
  });
});
