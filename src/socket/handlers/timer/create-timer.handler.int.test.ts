import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Socket } from "socket.io";
import { createSocketTestServer } from "@/socket/test/socket-test-harness";
import { waitForEvent } from "@/socket/test/socket-helpers";
import { SocketEvents } from "@/socket/socket-events";

// ---- mocks ----
vi.mock("@/timer/game-store", () => ({
  createEngine: vi.fn(),
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

import { createEngine } from "@/timer/game-store";
import { updateTimerState } from "@/db/games/shared/actions/update-timer-state";
import { findLoginSession } from "@/db/system/queries/find-login-session";
import { registerCreateTimerHandler } from "./create-timer.handler";
import { registerJoinGameHandler } from "@/socket/handlers/game/join-game/join-game.handler";
import { BridgeTimerEngine } from "@/timer/bridge-timer-engine";
import { TimerState } from "@/timer/timer-state";

describe("registerCreateTimerHandler (integration)", () => {
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

  it("creates timer and broadcasts timer:sync to the game room", async () => {
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

    vi.mocked(createEngine).mockResolvedValue(engine);
    vi.mocked(updateTimerState).mockResolvedValue(undefined);

    const { client, close } = await createSocketTestServer((io) => {
      io.on("connection", (socket: Socket) => {
        registerJoinGameHandler(socket);
        registerCreateTimerHandler(socket, io);
      });
    });
    closeServer = close;

    // Join the game room first so we receive the broadcast
    await new Promise<void>((resolve) => {
      client.emit(SocketEvents.JOIN_GAME, { gameId: "game-1" }, () =>
        resolve(),
      );
    });

    const syncPromise = waitForEvent(client, "timer:sync");

    client.emit(SocketEvents.CREATE_TIMER, {
      gameType: "PAIRS",
      gameId: "game-1",
      directorToken: "test-token",
      boardsPerRound: 3,
      totalRounds: 5,
      playDuration: 420,
      moveDuration: 60,
    });

    const syncPayload = await syncPromise;

    expect(syncPayload).toMatchObject({
      phase: "play",
      round: 1,
      boardsPerRound: 3,
      totalRounds: 5,
      playDuration: 420,
      moveDuration: 60,
      isRunning: false,
    });
    expect(syncPayload).toHaveProperty("serverNow");
  });

  it("non-director is silently rejected (no broadcast)", async () => {
    vi.mocked(findLoginSession).mockReturnValue(null as any);

    const { client, close } = await createSocketTestServer((io) => {
      io.on("connection", (socket: Socket) => {
        registerJoinGameHandler(socket);
        registerCreateTimerHandler(socket, io);
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

    client.emit(SocketEvents.CREATE_TIMER, {
      gameType: "PAIRS",
      gameId: "game-1",
      directorToken: "bad-token",
      boardsPerRound: 3,
      totalRounds: 5,
      playDuration: 420,
      moveDuration: 60,
    });

    const result = await syncPromise;
    expect(result).toBe("timeout");
    expect(createEngine).not.toHaveBeenCalled();
  });
});
