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
  scheduleGame: vi.fn(),
}));

vi.mock("@/db/system/queries/find-login-session", () => ({
  findLoginSession: vi.fn(),
}));

import { getEngine } from "@/timer/game-store";
import { updateTimerState } from "@/db/games/actions/update-timer-state";
import { findLoginSession } from "@/db/system/queries/find-login-session";
import { registerStartTimerHandler } from "./start-timer.handler";
import { registerRequestStateHandler } from "./request-state.handler";
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

  /** Join the game and the section-A timer room (via requestState). */
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

  it("starts timer and broadcasts timer:sync to the section timer room", async () => {
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
        registerRequestStateHandler(socket, io);
        registerStartTimerHandler(socket, io);
      });
    });
    closeServer = close;

    await joinTimerRoom(client);

    const syncPromise = waitForEvent(client, "timer:sync");

    client.emit(SocketEvents.START_TIMER, {
      gameType: "PAIRS",
      gameId: "game-1",
      section: "A",
      directorToken: "test-token",
    });

    const syncPayload = await syncPromise;

    expect(syncPayload).toMatchObject({
      phase: "play",
      round: 1,
      isRunning: true,
      section: "A",
    });
    expect(syncPayload).toHaveProperty("serverNow");
    expect(syncPayload).toHaveProperty("phaseStartedAt");
  });

  it("does not reach a client watching a different section", async () => {
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
    vi.mocked(getEngine).mockResolvedValue(new BridgeTimerEngine(timerState));
    vi.mocked(updateTimerState).mockResolvedValue(undefined);

    const { client, close } = await createSocketTestServer((io) => {
      io.on("connection", (socket: Socket) => {
        registerJoinGameHandler(socket);
        registerRequestStateHandler(socket, io);
        registerStartTimerHandler(socket, io);
      });
    });
    closeServer = close;

    // Client watches section B.
    await new Promise<void>((resolve) => {
      client.emit(SocketEvents.JOIN_GAME, { gameId: "game-1" }, () =>
        resolve(),
      );
    });
    await emitWithAck(client, SocketEvents.REQUEST_STATE_TIMER, {
      gameId: "game-1",
      section: "B",
    });

    const syncPromise = waitForEvent(client, "timer:sync", 500).catch(
      () => "timeout",
    );

    // Section A is started; the B-watching client must not receive it.
    client.emit(SocketEvents.START_TIMER, {
      gameType: "PAIRS",
      gameId: "game-1",
      section: "A",
      directorToken: "test-token",
    });

    expect(await syncPromise).toBe("timeout");
  });

  it("non-director is silently rejected (no broadcast)", async () => {
    vi.mocked(findLoginSession).mockReturnValue(null as any);

    const { client, close } = await createSocketTestServer((io) => {
      io.on("connection", (socket: Socket) => {
        registerJoinGameHandler(socket);
        registerRequestStateHandler(socket, io);
        registerStartTimerHandler(socket, io);
      });
    });
    closeServer = close;

    await joinTimerRoom(client);
    // requestState (used to join the room) legitimately calls getEngine; reset
    // so we can assert the rejected START_TIMER never reaches it.
    vi.mocked(getEngine).mockClear();

    const syncPromise = waitForEvent(client, "timer:sync", 500).catch(
      () => "timeout",
    );

    client.emit(SocketEvents.START_TIMER, {
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
        registerStartTimerHandler(socket, io);
      });
    });
    closeServer = close;

    await joinTimerRoom(client);

    const syncPromise = waitForEvent(client, "timer:sync", 500).catch(
      () => "timeout",
    );

    client.emit(SocketEvents.START_TIMER, {
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
