import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Socket } from "socket.io";
import { createSocketTestServer } from "@/socket/test/socket-test-harness";
import { waitForEvent, emitWithAck } from "@/socket/test/socket-helpers";
import { SocketEvents } from "@/socket/socket-events";

// ---- mocks ----
vi.mock("@/timer/game-store", () => ({
  getEngine: vi.fn(),
}));

vi.mock("@/db/games/actions/update-timer-state", () => ({
  updateTimerState: vi.fn(),
}));

vi.mock("@/timer/scheduler", () => ({
  cancelGameSchedule: vi.fn(),
  scheduleGame: vi.fn(),
}));

vi.mock("@/db/system/queries/find-login-session", () => ({
  findLoginSession: vi.fn(),
}));

import { getEngine } from "@/timer/game-store";
import { updateTimerState } from "@/db/games/actions/update-timer-state";
import { findLoginSession } from "@/db/system/queries/find-login-session";
import { registerPauseTimerHandler } from "./pause-timer.handler";
import { registerRequestStateHandler } from "./request-state.handler";
import { registerJoinGameHandler } from "@/socket/handlers/game/join-game/join-game.handler";
import { BridgeTimerEngine } from "@/timer/bridge-timer-engine";
import { TimerState } from "@/timer/timer-state";

describe("registerPauseTimerHandler (integration)", () => {
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

  async function joinTimerRoom(client: Parameters<typeof waitForEvent>[0]) {
    await new Promise<void>((resolve) => {
      client.emit(SocketEvents.JOIN_GAME, { gameId: "game-1" }, () =>
        resolve(),
      );
    });
    await emitWithAck(client, SocketEvents.REQUEST_STATE_TIMER, {
      gameId: "game-1",
      section: "A",
    });
  }

  it("pauses timer and broadcasts timer:sync to the section timer room", async () => {
    const timerState: TimerState = {
      version: 1,
      phase: "play",
      board: 1,
      round: 1,
      boardsPerRound: 3,
      totalRounds: 5,
      playDuration: 420,
      moveDuration: 60,
      isRunning: true,
      phaseStartedAt: Date.now() - 10000,
      remainingMs: null,
    };

    const engine = new BridgeTimerEngine(timerState);

    vi.mocked(getEngine).mockResolvedValue(engine);
    vi.mocked(updateTimerState).mockResolvedValue(undefined);

    const { client, close } = await createSocketTestServer((io) => {
      io.on("connection", (socket: Socket) => {
        registerJoinGameHandler(socket);
        registerRequestStateHandler(socket, io);
        registerPauseTimerHandler(socket, io);
      });
    });
    closeServer = close;

    await joinTimerRoom(client);

    const syncPromise = waitForEvent(client, "timer:sync");

    client.emit(SocketEvents.PAUSE_TIMER, {
      gameType: "PAIRS",
      gameId: "game-1",
      section: "A",
      directorToken: "test-token",
    });

    const syncPayload = await syncPromise;

    expect(syncPayload).toMatchObject({
      phase: "play",
      round: 1,
      isRunning: false,
      phaseStartedAt: null,
      section: "A",
    });
    expect(syncPayload).toHaveProperty("serverNow");
    expect((syncPayload as any).remainingMs).toBeGreaterThan(0);
  });

  it("non-director is silently rejected (no broadcast)", async () => {
    vi.mocked(findLoginSession).mockReturnValue(null as any);

    const { client, close } = await createSocketTestServer((io) => {
      io.on("connection", (socket: Socket) => {
        registerJoinGameHandler(socket);
        registerRequestStateHandler(socket, io);
        registerPauseTimerHandler(socket, io);
      });
    });
    closeServer = close;

    await joinTimerRoom(client);
    vi.mocked(getEngine).mockClear();

    const syncPromise = waitForEvent(client, "timer:sync", 500).catch(
      () => "timeout",
    );

    client.emit(SocketEvents.PAUSE_TIMER, {
      gameType: "PAIRS",
      gameId: "game-1",
      section: "A",
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
        registerRequestStateHandler(socket, io);
        registerPauseTimerHandler(socket, io);
      });
    });
    closeServer = close;

    await joinTimerRoom(client);

    const syncPromise = waitForEvent(client, "timer:sync", 500).catch(
      () => "timeout",
    );

    client.emit(SocketEvents.PAUSE_TIMER, {
      gameType: "PAIRS",
      gameId: "game-1",
      section: "A",
      directorToken: "test-token",
    });

    const result = await syncPromise;
    expect(result).toBe("timeout");
    expect(updateTimerState).not.toHaveBeenCalled();
  });
});
