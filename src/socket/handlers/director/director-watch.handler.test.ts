import { describe, it, expect, vi, beforeEach } from "vitest";
import { SocketEvents } from "@/socket/socket-events";

vi.mock("@/socket/middleware/director-auth", () => ({
  validateDirectorToken: vi.fn(),
}));
const sessions: Record<string, { createdAt: string | null }> = {};
vi.mock("@/db/system/queries/find-login-session", () => ({
  findLoginSession: (token: string) => sessions[token] ?? null,
}));
vi.mock("@/socket/broadcast/director-alerts", () => ({
  recentAlertsFor: vi.fn(() => [{ id: "a1" }]),
}));

import { validateDirectorToken } from "@/socket/middleware/director-auth";
import { recentAlertsFor } from "@/socket/broadcast/director-alerts";
import { registerDirectorWatchHandler } from "./director-watch.handler";
import { registerDirectorHandlers } from "./director.handlers";

function makeSocket(rooms: string[] = []) {
  return {
    id: "s1",
    rooms: new Set(["s1", ...rooms]),
    on: vi.fn(),
    join: vi.fn(),
    leave: vi.fn(),
  } as any;
}

async function watch(socket: any, payload: unknown) {
  registerDirectorWatchHandler(socket, {} as any);
  const handler = socket.on.mock.calls.find(
    (c: any) => c[0] === SocketEvents.DIRECTOR_WATCH,
  )![1];
  const cb = vi.fn();
  await handler(payload, cb);
  return cb;
}

describe("director:watch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(validateDirectorToken).mockImplementation(
      (token, gameId) => token === `tok-${gameId}`,
    );
  });

  it("joins the rooms for each valid token and returns recent alerts", async () => {
    const socket = makeSocket();
    const cb = await watch(socket, {
      directors: [
        { gameId: "g1", directorToken: "tok-g1" },
        { gameId: "g2", directorToken: "bad" },
        { gameId: "g1", directorToken: "tok-g1" },
      ],
    });
    expect(socket.join).toHaveBeenCalledWith("directors:all");
    expect(socket.join).toHaveBeenCalledWith("directors:game:g1");
    expect(socket.join).not.toHaveBeenCalledWith("directors:game:g2");
    // No recorded creation time: replay from the start.
    expect(recentAlertsFor).toHaveBeenCalledWith([{ gameId: "g1", since: 0 }]);
    expect(cb).toHaveBeenCalledWith({
      success: true,
      data: { gameIds: ["g1"], alerts: [{ id: "a1" }] },
    });
  });

  it("leaves its old director rooms first, and joins none without a valid token", async () => {
    const socket = makeSocket([
      "directors:all",
      "directors:game:g9",
      "game:g9",
    ]);
    const cb = await watch(socket, {
      directors: [{ gameId: "g9", directorToken: "stale" }],
    });
    expect(socket.leave).toHaveBeenCalledWith("directors:all");
    expect(socket.leave).toHaveBeenCalledWith("directors:game:g9");
    expect(socket.leave).not.toHaveBeenCalledWith("game:g9");
    expect(socket.join).not.toHaveBeenCalled();
    expect(cb).toHaveBeenCalledWith({
      success: true,
      data: { gameIds: [], alerts: [] },
    });
  });

  it("rejects a malformed payload", async () => {
    const cb = await watch(makeSocket(), { directors: "nope" });
    expect(cb).toHaveBeenCalledWith({
      success: false,
      error: "Invalid request",
    });
  });

  it("is registered by the director handlers", () => {
    const socket = makeSocket();
    registerDirectorHandlers(socket, {} as any);
    expect(socket.on).toHaveBeenCalledWith(
      SocketEvents.DIRECTOR_WATCH,
      expect.any(Function),
    );
  });

  it("replays only from when the device became a director", async () => {
    sessions["tok-g1"] = { createdAt: "2026-11-20T19:00:00.000Z" };
    sessions["tok-g1b"] = { createdAt: "2026-11-20T18:00:00.000Z" };
    vi.mocked(validateDirectorToken).mockReturnValue(true);
    try {
      await watch(makeSocket(), {
        directors: [
          { gameId: "g1", directorToken: "tok-g1" },
          // A second, older token for the same game wins.
          { gameId: "g1", directorToken: "tok-g1b" },
        ],
      });
      expect(recentAlertsFor).toHaveBeenCalledWith([
        { gameId: "g1", since: Date.parse("2026-11-20T18:00:00.000Z") },
      ]);
    } finally {
      delete sessions["tok-g1"];
      delete sessions["tok-g1b"];
    }
  });
});
