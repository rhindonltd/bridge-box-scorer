import { describe, it, expect, vi, beforeEach } from "vitest";
import { SocketEvents } from "@/socket/socket-events";

vi.mock("@/socket/middleware/participant-auth", () => ({
  assertPlayer: vi.fn(),
}));
vi.mock("@/db/games", () => ({ getDb: vi.fn() }));
vi.mock("@/db/games/queries/get-board-status", () => ({
  getBoardStatus: vi.fn(),
}));
vi.mock("@/db/games/actions/delete-submissions", () => ({
  deleteSideSubmission: vi.fn(),
}));

import { assertPlayer } from "@/socket/middleware/participant-auth";
import { getDb } from "@/db/games";
import { getBoardStatus } from "@/db/games/queries/get-board-status";
import { deleteSideSubmission } from "@/db/games/actions/delete-submissions";
import { registerWithdrawSubmissionHandler } from "./withdraw-submission.handler";

function makeSocket() {
  return { data: {}, id: "test", on: vi.fn() } as any;
}
function makeIo() {
  return { to: vi.fn(() => ({ emit: vi.fn() })) } as any;
}
function getHandler(socket: any) {
  const call = socket.on.mock.calls.find(
    (c: any) => c[0] === SocketEvents.WITHDRAW_SUBMISSION,
  );
  return call![1] as (
    payload: unknown,
    cb: (r: unknown) => void,
  ) => Promise<void>;
}

const payload = {
  gameId: "g1",
  seat: "A3EW",
  token: "tok",
  roundNumber: 2,
  tableNumber: 3,
  boardNumber: 5,
};

describe("registerWithdrawSubmissionHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(assertPlayer).mockResolvedValue(true);
    vi.mocked(getDb).mockResolvedValue({} as never);
    vi.mocked(getBoardStatus).mockResolvedValue("PENDING_CONFIRMATION");
    vi.mocked(deleteSideSubmission).mockResolvedValue(undefined as never);
  });

  it("deletes only the caller's side while the board is unconfirmed", async () => {
    const socket = makeSocket();
    registerWithdrawSubmissionHandler(socket, makeIo());
    const cb = vi.fn();

    await getHandler(socket)(payload, cb);

    expect(assertPlayer).toHaveBeenCalledWith(
      "g1",
      "A3EW",
      "tok",
      expect.any(Function),
    );
    expect(deleteSideSubmission).toHaveBeenCalledWith("g1", "A", 3, 2, "EW");
    expect(cb).toHaveBeenCalledWith({ success: true, data: undefined });
  });

  it("does nothing when the token isn't authorised", async () => {
    vi.mocked(assertPlayer).mockResolvedValue(false);
    const socket = makeSocket();
    registerWithdrawSubmissionHandler(socket, makeIo());

    await getHandler(socket)(payload, vi.fn());

    expect(deleteSideSubmission).not.toHaveBeenCalled();
  });

  it("refuses once the board is confirmed", async () => {
    vi.mocked(getBoardStatus).mockResolvedValue("CONFIRMED");
    const socket = makeSocket();
    registerWithdrawSubmissionHandler(socket, makeIo());
    const cb = vi.fn();

    await getHandler(socket)(payload, cb);

    expect(deleteSideSubmission).not.toHaveBeenCalled();
    expect(cb).toHaveBeenCalledWith({
      success: false,
      error: expect.stringContaining("already been confirmed"),
    });
  });

  it("rejects an invalid payload", async () => {
    const socket = makeSocket();
    registerWithdrawSubmissionHandler(socket, makeIo());
    const cb = vi.fn();

    await getHandler(socket)({ gameId: "g1" }, cb);

    expect(deleteSideSubmission).not.toHaveBeenCalled();
    expect(cb).toHaveBeenCalledWith(
      expect.objectContaining({ success: false }),
    );
  });
});
