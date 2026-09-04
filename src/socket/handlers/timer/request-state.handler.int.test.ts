import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Socket } from "socket.io";
import { createSocketTestServer } from "@/socket/test/socket-test-harness";
import { emitWithAck } from "@/socket/test/socket-helpers";
import { SocketEvents } from "@/socket/socket-events";

// Real engine + game store so requestState reads the actual created state;
// only the DB, scheduler and auth are mocked.
vi.mock("@/db/games/actions/update-timer-state", () => ({
  updateTimerState: vi.fn(),
}));

vi.mock("@/db/games/queries/find-timer-state", () => ({
  findTimerState: vi.fn(),
}));

vi.mock("@/timer/scheduler", () => ({
  scheduleGame: vi.fn(),
  cancelGameSchedule: vi.fn(),
}));

vi.mock("@/db/system/queries/find-login-session", () => ({
  findLoginSession: vi.fn(),
}));

import { updateTimerState } from "@/db/games/actions/update-timer-state";
import { findLoginSession } from "@/db/system/queries/find-login-session";
import { registerCreateTimerHandler } from "./create-timer.handler";
import { registerRequestStateHandler } from "./request-state.handler";

/** Small delay to let a fire-and-forget emit be processed server-side. */
function tick(ms = 100) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe("registerRequestStateHandler (integration)", () => {
  let closeServer: () => Promise<void>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(updateTimerState).mockResolvedValue(undefined);
    vi.mocked(findLoginSession).mockReturnValue({
      token: "test-token",
      role: "DIRECTOR",
      gameId: "game-rs",
    } as any);
  });

  afterEach(async () => {
    await closeServer?.();
  });

  it("acks a success response with null data when no timer exists", async () => {
    const { client, close } = await createSocketTestServer((io) => {
      io.on("connection", (socket: Socket) => {
        registerRequestStateHandler(socket, io);
      });
    });
    closeServer = close;

    const response: any = await emitWithAck(
      client,
      SocketEvents.REQUEST_STATE_TIMER,
      { gameId: "game-rs" },
    );

    expect(response).toEqual({ success: true, data: null });
  });

  it("acks the current snapshot after the timer is created", async () => {
    const { client, close } = await createSocketTestServer((io) => {
      io.on("connection", (socket: Socket) => {
        registerCreateTimerHandler(socket, io);
        registerRequestStateHandler(socket, io);
      });
    });
    closeServer = close;

    // CREATE_TIMER is fire-and-forget (no ack); emit then let it process.
    client.emit(SocketEvents.CREATE_TIMER, {
      gameType: "PAIRS",
      gameId: "game-rs",
      directorToken: "test-token",
      boardsPerRound: 3,
      totalRounds: 5,
      playDuration: 420,
      moveDuration: 60,
    });
    await tick();

    const response: any = await emitWithAck(
      client,
      SocketEvents.REQUEST_STATE_TIMER,
      { gameId: "game-rs" },
    );

    expect(response.success).toBe(true);
    expect(response.data).toMatchObject({
      phase: "play",
      round: 1,
      totalRounds: 5,
      playDuration: 420,
      isRunning: false,
    });
    expect(response.data).toHaveProperty("serverNow");
    expect(response.data).toHaveProperty("breakProblems");
  });
});
