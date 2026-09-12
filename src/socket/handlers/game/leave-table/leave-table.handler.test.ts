import { describe, it, expect, vi, beforeEach } from "vitest";
import { SocketEvents } from "@/socket/socket-events";

vi.mock("@/socket/middleware/participant-auth", () => ({
  assertPlayer: vi.fn(),
}));
vi.mock("@/db/games/queries/is-game-started", () => ({
  isGameStarted: vi.fn(),
}));
vi.mock("@/db/games/actions/delete-participant", () => ({
  deleteParticipant: vi.fn(),
}));
vi.mock("@/socket/broadcast/participant-broadcast", () => ({
  broadcastParticipants: vi.fn(),
}));

import { assertPlayer } from "@/socket/middleware/participant-auth";
import { isGameStarted } from "@/db/games/queries/is-game-started";
import { deleteParticipant } from "@/db/games/actions/delete-participant";
import { broadcastParticipants } from "@/socket/broadcast/participant-broadcast";
import { registerLeaveTableHandler } from "./leave-table.handler";

function makeSocket() {
  return { data: {}, id: "test", on: vi.fn() } as any;
}
function makeIo() {
  return { to: vi.fn(() => ({ emit: vi.fn() })) } as any;
}

function getHandler(socket: any) {
  const call = socket.on.mock.calls.find(
    (c: any) => c[0] === SocketEvents.LEAVE_TABLE,
  );
  return call![1] as (payload: unknown, cb: (r: unknown) => void) => Promise<void>;
}

describe("registerLeaveTableHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: authorised, not started.
    vi.mocked(assertPlayer).mockResolvedValue(true);
    vi.mocked(isGameStarted).mockResolvedValue(false);
    vi.mocked(deleteParticipant).mockResolvedValue(undefined as never);
    vi.mocked(broadcastParticipants).mockResolvedValue(undefined);
  });

  it("registers a handler for LEAVE_TABLE", () => {
    const socket = makeSocket();
    registerLeaveTableHandler(socket, makeIo());
    const events = socket.on.mock.calls.map((c: any) => c[0]);
    expect(events).toContain(SocketEvents.LEAVE_TABLE);
  });

  it("deletes the participant and broadcasts when authorised and not started", async () => {
    const socket = makeSocket();
    const io = makeIo();
    registerLeaveTableHandler(socket, io);
    const cb = vi.fn();

    await getHandler(socket)(
      { gameId: "g1", seat: "A1NS", token: "tok" },
      cb,
    );

    expect(assertPlayer).toHaveBeenCalledWith("g1", "A1NS", "tok", cb);
    expect(deleteParticipant).toHaveBeenCalledWith("g1", "A1NS");
    expect(broadcastParticipants).toHaveBeenCalledWith("g1", io);
    expect(cb).toHaveBeenCalledWith({ success: true });
  });

  it("does nothing when the player token is not authorised", async () => {
    vi.mocked(assertPlayer).mockResolvedValue(false);
    const socket = makeSocket();
    registerLeaveTableHandler(socket, makeIo());
    const cb = vi.fn();

    await getHandler(socket)(
      { gameId: "g1", seat: "A1NS", token: "bad" },
      cb,
    );

    expect(deleteParticipant).not.toHaveBeenCalled();
    expect(broadcastParticipants).not.toHaveBeenCalled();
    // assertPlayer itself is responsible for the error callback.
  });

  it("refuses to leave once the game has started", async () => {
    vi.mocked(isGameStarted).mockResolvedValue(true);
    const socket = makeSocket();
    registerLeaveTableHandler(socket, makeIo());
    const cb = vi.fn();

    await getHandler(socket)(
      { gameId: "g1", seat: "A1NS", token: "tok" },
      cb,
    );

    expect(deleteParticipant).not.toHaveBeenCalled();
    expect(broadcastParticipants).not.toHaveBeenCalled();
    expect(cb).toHaveBeenCalledWith({
      success: false,
      error: expect.stringContaining("already started"),
    });
  });

  it("returns an error when deletion throws", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(deleteParticipant).mockRejectedValue(new Error("db error"));
    const socket = makeSocket();
    registerLeaveTableHandler(socket, makeIo());
    const cb = vi.fn();

    await getHandler(socket)(
      { gameId: "g1", seat: "A1NS", token: "tok" },
      cb,
    );

    expect(cb).toHaveBeenCalledWith({
      success: false,
      error: "db error",
    });
    errSpy.mockRestore();
  });
});
