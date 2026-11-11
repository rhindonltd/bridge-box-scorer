import { describe, it, expect, vi, beforeEach } from "vitest";
import { SocketEvents } from "@/socket/socket-events";

vi.mock("@/socket/middleware/participant-auth", () => ({
  validatePlayerToken: vi.fn(),
}));
vi.mock("@/db/games/queries/find-participant-secret", () => ({
  findSeatDeviceInfo: vi.fn(),
}));

import { validatePlayerToken } from "@/socket/middleware/participant-auth";
import { findSeatDeviceInfo } from "@/db/games/queries/find-participant-secret";
import { registerWatchSeatHandler } from "./watch-seat.handler";

function makeSocket() {
  return { data: {}, id: "test", on: vi.fn(), join: vi.fn() } as any;
}
function handlerFor(socket: any) {
  const call = socket.on.mock.calls.find(
    (c: any) => c[0] === SocketEvents.WATCH_SEAT,
  );
  return call![1] as (p: unknown, cb: (r: unknown) => void) => Promise<void>;
}

async function watch(payload: Record<string, unknown>) {
  const socket = makeSocket();
  registerWatchSeatHandler(socket, {} as any);
  const cb = vi.fn();
  await handlerFor(socket)({ gameId: "g1", seat: "A1NS", ...payload }, cb);
  return { socket, cb };
}

describe("registerWatchSeatHandler", () => {
  beforeEach(() => vi.clearAllMocks());

  it("joins the seat room and reports 'held' for the live token", async () => {
    vi.mocked(validatePlayerToken).mockResolvedValue(true);
    const { socket, cb } = await watch({ token: "good" });
    expect(socket.join).toHaveBeenCalledWith("game:g1:seat:A1NS");
    expect(cb).toHaveBeenCalledWith({
      success: true,
      data: { status: "held" },
    });
  });

  it("reports 'moved' (and does not join) for a stale token on an occupied seat", async () => {
    vi.mocked(validatePlayerToken).mockResolvedValue(false);
    vi.mocked(findSeatDeviceInfo).mockResolvedValue({
      secretKey: "new",
      standing: "ACTIVE",
    });
    const { socket, cb } = await watch({ token: "old" });
    expect(socket.join).not.toHaveBeenCalled();
    expect(cb).toHaveBeenCalledWith({
      success: true,
      data: { status: "moved" },
    });
  });

  it("does not call a withdrawn pair's rotated secret a move", async () => {
    vi.mocked(validatePlayerToken).mockResolvedValue(false);
    vi.mocked(findSeatDeviceInfo).mockResolvedValue({
      secretKey: "dead",
      standing: "WITHDRAWN",
    });
    const { cb } = await watch({ token: "old" });
    expect(cb).toHaveBeenCalledWith({
      success: true,
      data: { status: "unknown" },
    });
  });

  it("reports 'unknown' for a vacated seat or a missing token", async () => {
    vi.mocked(validatePlayerToken).mockResolvedValue(false);
    vi.mocked(findSeatDeviceInfo).mockResolvedValue(null);
    expect((await watch({ token: "old" })).cb).toHaveBeenCalledWith({
      success: true,
      data: { status: "unknown" },
    });
    expect((await watch({})).cb).toHaveBeenCalledWith({
      success: true,
      data: { status: "unknown" },
    });
  });
});
