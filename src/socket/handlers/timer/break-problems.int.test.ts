import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Socket } from "socket.io";
import { createSocketTestServer } from "@/socket/test/socket-test-harness";
import { waitForEvent } from "@/socket/test/socket-helpers";
import { SocketEvents } from "@/socket/socket-events";

// Use the REAL engine + game store so validateStateBreaks runs on real state;
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
import { registerJoinGameHandler } from "@/socket/handlers/game/join-game/join-game.handler";
import { emitWithAck } from "@/socket/test/socket-helpers";

describe("timer break-problem broadcast (integration)", () => {
  let closeServer: () => Promise<void>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(updateTimerState).mockResolvedValue(undefined);
    vi.mocked(findLoginSession).mockReturnValue({
      token: "test-token",
      role: "DIRECTOR",
      gameId: "game-bp",
    } as any);
  });

  afterEach(async () => {
    await closeServer?.();
  });

  it("broadcasts an empty breakProblems array for a valid duration break", async () => {
    const { client, close } = await createSocketTestServer((io) => {
      io.on("connection", (socket: Socket) => {
        registerJoinGameHandler(socket);
        registerRequestStateHandler(socket, io);
        registerCreateTimerHandler(socket, io);
      });
    });
    closeServer = close;

    await new Promise<void>((resolve) => {
      client.emit(SocketEvents.JOIN_GAME, { gameId: "game-bp" }, () =>
        resolve(),
      );
    });
    await emitWithAck(client, SocketEvents.REQUEST_STATE_TIMER, {
      gameId: "game-bp",
      section: "A",
    });

    const syncPromise = waitForEvent(client, "timer:sync");

    client.emit(SocketEvents.CREATE_TIMER, {
      gameType: "PAIRS",
      gameId: "game-bp",
      section: "A",
      directorToken: "test-token",
      boardsPerRound: 3,
      totalRounds: 3,
      playDuration: 420,
      moveDuration: 60,
      breaks: [{ afterRound: 1, mode: "duration", durationSeconds: 600 }],
    });

    const payload = (await syncPromise) as { breakProblems?: unknown[] };
    expect(payload.breakProblems).toEqual([]);
  });

  it("broadcasts a breakProblem when a resume-time break resumes before play can finish", async () => {
    const { client, close } = await createSocketTestServer((io) => {
      io.on("connection", (socket: Socket) => {
        registerJoinGameHandler(socket);
        registerRequestStateHandler(socket, io);
        registerCreateTimerHandler(socket, io);
      });
    });
    closeServer = close;

    await new Promise<void>((resolve) => {
      client.emit(SocketEvents.JOIN_GAME, { gameId: "game-bp" }, () =>
        resolve(),
      );
    });
    await emitWithAck(client, SocketEvents.REQUEST_STATE_TIMER, {
      gameId: "game-bp",
      section: "A",
    });

    const syncPromise = waitForEvent(client, "timer:sync");

    // Round 1 play is 420s, but the break after round 1 is set to resume only
    // 10s from now — impossible, so it must be flagged.
    client.emit(SocketEvents.CREATE_TIMER, {
      gameType: "PAIRS",
      gameId: "game-bp",
      section: "A",
      directorToken: "test-token",
      boardsPerRound: 3,
      totalRounds: 3,
      playDuration: 420,
      moveDuration: 60,
      breaks: [
        { afterRound: 1, mode: "resumeTime", resumeAtMs: Date.now() + 10_000 },
      ],
    });

    const payload = (await syncPromise) as {
      breakProblems?: Array<{ afterRound: number; overrunMs: number }>;
    };
    expect(payload.breakProblems).toHaveLength(1);
    expect(payload.breakProblems![0].afterRound).toBe(1);
    expect(payload.breakProblems![0].overrunMs).toBeGreaterThan(0);
  });
});
