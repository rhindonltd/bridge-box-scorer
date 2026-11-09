import { describe, it, expect, vi, beforeEach } from "vitest";
import { SocketEvents } from "@/socket/socket-events";

vi.mock("@/socket/middleware/participant-auth", () => ({
  assertPlayer: vi.fn(),
}));
vi.mock("@/socket/middleware/director-auth", () => ({
  assertDirector: vi.fn(),
}));
vi.mock("@/socket/broadcast/participant-broadcast", () => ({
  broadcastParticipants: vi.fn(),
}));
vi.mock("@/socket/handlers/results/broadcast-results", () => ({
  broadcastLeaderboardChanged: vi.fn(),
}));
vi.mock("@/db/game-index/queries/find-game-by-id", () => ({
  findGameById: vi.fn(),
}));
vi.mock("@/db/system/actions/create-seat-transfer-code", () => ({
  createSeatTransferCode: vi.fn(),
}));
vi.mock("@/db/system/queries/validate-seat-transfer-code", () => ({
  validateAndClaimSeatTransferCode: vi.fn(),
  inspectSeatTransferCode: vi.fn(),
}));

import { assertPlayer } from "@/socket/middleware/participant-auth";
import { assertDirector } from "@/socket/middleware/director-auth";
import { broadcastParticipants } from "@/socket/broadcast/participant-broadcast";
import { broadcastLeaderboardChanged } from "@/socket/handlers/results/broadcast-results";
import { findGameById } from "@/db/game-index/queries/find-game-by-id";
import { createSeatTransferCode } from "@/db/system/actions/create-seat-transfer-code";
import {
  validateAndClaimSeatTransferCode,
  inspectSeatTransferCode,
} from "@/db/system/queries/validate-seat-transfer-code";
import { registerSeatTransferHandlers } from "./seat-transfer.handler";

function makeSocket() {
  return { data: {}, id: "test", on: vi.fn(), join: vi.fn() } as any;
}
function makeIo() {
  // Capture the per-room emit so a test can assert what was broadcast.
  const emit = vi.fn();
  return { to: vi.fn(() => ({ emit })), __emit: emit } as any;
}
function handlerFor(socket: any, event: string) {
  const call = socket.on.mock.calls.find((c: any) => c[0] === event);
  return call![1] as (
    payload: unknown,
    cb: (r: unknown) => void,
  ) => Promise<void>;
}

describe("registerSeatTransferHandlers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(assertPlayer).mockResolvedValue(true);
  });

  it("registers the transfer events", () => {
    const socket = makeSocket();
    registerSeatTransferHandlers(socket, makeIo());
    const events = socket.on.mock.calls.map((c: any) => c[0]);
    expect(events).toContain(SocketEvents.CREATE_SEAT_TRANSFER);
    expect(events).toContain(SocketEvents.CLAIM_SEAT_TRANSFER);
    expect(events).toContain(SocketEvents.INSPECT_SEAT_TRANSFER);
  });

  describe("CREATE_SEAT_TRANSFER", () => {
    it("mints a code for an authorised seat", async () => {
      vi.mocked(createSeatTransferCode).mockResolvedValue("ABC234");
      const socket = makeSocket();
      registerSeatTransferHandlers(socket, makeIo());
      const cb = vi.fn();

      await handlerFor(socket, SocketEvents.CREATE_SEAT_TRANSFER)(
        { gameId: "g1", seat: "A1NS", token: "tok" },
        cb,
      );

      expect(assertPlayer).toHaveBeenCalledWith(
        "g1",
        "A1NS",
        "tok",
        expect.any(Function),
      );
      // Defaults to a plain change-device code when no kind is supplied.
      expect(createSeatTransferCode).toHaveBeenCalledWith(
        "g1",
        "A1NS",
        "CHANGE_DEVICE",
      );
      // Joins the seat room so this (old) device is notified on takeover.
      expect(socket.join).toHaveBeenCalledWith("game:g1:seat:A1NS");
      expect(cb).toHaveBeenCalledWith({
        success: true,
        data: { code: "ABC234" },
      });
    });

    it("mints a HANDOVER code when the payload asks for one", async () => {
      vi.mocked(createSeatTransferCode).mockResolvedValue("HAND01");
      const socket = makeSocket();
      registerSeatTransferHandlers(socket, makeIo());
      const cb = vi.fn();

      await handlerFor(socket, SocketEvents.CREATE_SEAT_TRANSFER)(
        { gameId: "g1", seat: "A1NS", token: "tok", kind: "HANDOVER" },
        cb,
      );

      expect(createSeatTransferCode).toHaveBeenCalledWith(
        "g1",
        "A1NS",
        "HANDOVER",
      );
    });

    it("mints a REINSTATE code on the DIRECTOR's authority, not a seat token", async () => {
      vi.mocked(assertDirector).mockReturnValue(true);
      vi.mocked(createSeatTransferCode).mockResolvedValue("BACK01");
      const socket = makeSocket();
      registerSeatTransferHandlers(socket, makeIo());
      const cb = vi.fn();

      await handlerFor(socket, SocketEvents.CREATE_SEAT_TRANSFER)(
        {
          gameId: "g1",
          seat: "A1NS",
          directorToken: "dir-tok",
          kind: "REINSTATE",
        },
        cb,
      );

      expect(assertDirector).toHaveBeenCalledWith(
        "dir-tok",
        "g1",
        expect.any(Function),
      );
      // The withdrawn seat's own token is dead, so it is never consulted.
      expect(assertPlayer).not.toHaveBeenCalled();
      expect(createSeatTransferCode).toHaveBeenCalledWith(
        "g1",
        "A1NS",
        "REINSTATE",
      );
      expect(cb).toHaveBeenCalledWith({
        success: true,
        data: { code: "BACK01" },
      });
      // The director's device must NOT be signed out when the code is claimed,
      // so it does not join the seat room.
      expect(socket.join).not.toHaveBeenCalled();
    });

    it("lets the DIRECTOR mint a CHANGE_DEVICE code for a pair whose device died", async () => {
      vi.mocked(assertDirector).mockReturnValue(true);
      vi.mocked(createSeatTransferCode).mockResolvedValue("MOVE01");
      const socket = makeSocket();
      registerSeatTransferHandlers(socket, makeIo());
      const cb = vi.fn();

      await handlerFor(socket, SocketEvents.CREATE_SEAT_TRANSFER)(
        {
          gameId: "g1",
          seat: "A1NS",
          token: "",
          directorToken: "dir-tok",
          kind: "CHANGE_DEVICE",
        },
        cb,
      );

      expect(assertPlayer).not.toHaveBeenCalled();
      expect(createSeatTransferCode).toHaveBeenCalledWith(
        "g1",
        "A1NS",
        "CHANGE_DEVICE",
      );
      expect(cb).toHaveBeenCalledWith({
        success: true,
        data: { code: "MOVE01" },
      });
      // The director's device must not be signed out when the code is claimed.
      expect(socket.join).not.toHaveBeenCalled();
    });

    it("refuses a director CHANGE_DEVICE mint without a valid director token", async () => {
      vi.mocked(assertDirector).mockReturnValue(false);
      const socket = makeSocket();
      registerSeatTransferHandlers(socket, makeIo());

      await handlerFor(socket, SocketEvents.CREATE_SEAT_TRANSFER)(
        {
          gameId: "g1",
          seat: "A1NS",
          token: "",
          directorToken: "bad",
          kind: "CHANGE_DEVICE",
        },
        vi.fn(),
      );

      expect(createSeatTransferCode).not.toHaveBeenCalled();
    });

    it("refuses a REINSTATE mint without a valid director token", async () => {
      vi.mocked(assertDirector).mockReturnValue(false);
      const socket = makeSocket();
      registerSeatTransferHandlers(socket, makeIo());

      await handlerFor(socket, SocketEvents.CREATE_SEAT_TRANSFER)(
        { gameId: "g1", seat: "A1NS", token: "tok", kind: "REINSTATE" },
        vi.fn(),
      );

      expect(createSeatTransferCode).not.toHaveBeenCalled();
    });

    it("still requires the seat token (not the director's) for a plain transfer", async () => {
      vi.mocked(assertPlayer).mockResolvedValue(false);
      const socket = makeSocket();
      registerSeatTransferHandlers(socket, makeIo());

      await handlerFor(socket, SocketEvents.CREATE_SEAT_TRANSFER)(
        { gameId: "g1", seat: "A1NS", directorToken: "dir-tok" },
        vi.fn(),
      );

      expect(assertDirector).not.toHaveBeenCalled();
      expect(createSeatTransferCode).not.toHaveBeenCalled();
    });

    it("does nothing when the seat token is not authorised", async () => {
      vi.mocked(assertPlayer).mockResolvedValue(false);
      const socket = makeSocket();
      registerSeatTransferHandlers(socket, makeIo());
      const cb = vi.fn();

      await handlerFor(socket, SocketEvents.CREATE_SEAT_TRANSFER)(
        { gameId: "g1", seat: "A1NS", token: "bad" },
        cb,
      );

      expect(createSeatTransferCode).not.toHaveBeenCalled();
    });

    it("returns an error when minting throws", async () => {
      const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      vi.mocked(createSeatTransferCode).mockRejectedValue(new Error("boom"));
      const socket = makeSocket();
      registerSeatTransferHandlers(socket, makeIo());
      const cb = vi.fn();

      await handlerFor(socket, SocketEvents.CREATE_SEAT_TRANSFER)(
        { gameId: "g1", seat: "A1NS", token: "tok" },
        cb,
      );

      expect(cb).toHaveBeenCalledWith({
        success: false,
        error: "Internal error",
      });
      errSpy.mockRestore();
    });
  });

  describe("CLAIM_SEAT_TRANSFER", () => {
    it("returns the rotated token + seat on a valid code (no auth)", async () => {
      vi.mocked(validateAndClaimSeatTransferCode).mockResolvedValue({
        valid: true,
        gameId: "g1",
        seat: "A1NS",
        token: "new-token",
        isHandover: false,
        rosterChanged: false,
      });
      const socket = makeSocket();
      const io = makeIo();
      registerSeatTransferHandlers(socket, io);
      const cb = vi.fn();

      await handlerFor(socket, SocketEvents.CLAIM_SEAT_TRANSFER)(
        { code: "ABC234" },
        cb,
      );

      // Claiming is not player-authed — the code is the credential.
      expect(assertPlayer).not.toHaveBeenCalled();
      expect(validateAndClaimSeatTransferCode).toHaveBeenCalledWith(
        "ABC234",
        undefined,
      );
      // Notifies the old device (in the seat room) that it has been signed out.
      expect(io.to).toHaveBeenCalledWith("game:g1:seat:A1NS");
      expect(io.__emit).toHaveBeenCalledWith(SocketEvents.SEAT_TAKEN_OVER, {
        gameId: "g1",
        seat: "A1NS",
      });
      expect(cb).toHaveBeenCalledWith({
        success: true,
        data: {
          gameId: "g1",
          seat: "A1NS",
          token: "new-token",
          isHandover: false,
        },
      });
    });

    it("passes the arriving pair through for a handover claim", async () => {
      vi.mocked(validateAndClaimSeatTransferCode).mockResolvedValue({
        valid: true,
        gameId: "g1",
        seat: "A1NS",
        token: "new-token",
        isHandover: true,
        rosterChanged: true,
      });
      const realPair = {
        player1: { firstName: "Real", lastName: "One" },
        player2: { firstName: "Real", lastName: "Two" },
      };
      const socket = makeSocket();
      const io = makeIo();
      registerSeatTransferHandlers(socket, io);
      const cb = vi.fn();

      await handlerFor(socket, SocketEvents.CLAIM_SEAT_TRANSFER)(
        { code: "HAND01", realPair },
        cb,
      );

      expect(validateAndClaimSeatTransferCode).toHaveBeenCalledWith(
        "HAND01",
        realPair,
      );
      // The stand-in's old device is signed out for a handover too.
      expect(io.__emit).toHaveBeenCalledWith(SocketEvents.SEAT_TAKEN_OVER, {
        gameId: "g1",
        seat: "A1NS",
      });
      expect(cb).toHaveBeenCalledWith({
        success: true,
        data: {
          gameId: "g1",
          seat: "A1NS",
          token: "new-token",
          isHandover: true,
        },
      });
    });

    it("does not broadcast a refresh for a plain change-device claim", async () => {
      vi.mocked(validateAndClaimSeatTransferCode).mockResolvedValue({
        valid: true,
        gameId: "g1",
        seat: "A1NS",
        token: "new-token",
        isHandover: false,
        rosterChanged: false,
      });
      const socket = makeSocket();
      registerSeatTransferHandlers(socket, makeIo());

      await handlerFor(socket, SocketEvents.CLAIM_SEAT_TRANSFER)(
        { code: "ABC234" },
        vi.fn(),
      );

      expect(broadcastParticipants).not.toHaveBeenCalled();
      expect(broadcastLeaderboardChanged).not.toHaveBeenCalled();
    });

    it("refreshes the schedule, participants and leaderboard when a claim changes the roster (handover / reinstate)", async () => {
      vi.mocked(validateAndClaimSeatTransferCode).mockResolvedValue({
        valid: true,
        gameId: "g1",
        seat: "A1NS",
        token: "new-token",
        isHandover: false,
        rosterChanged: true,
      });
      vi.mocked(findGameById).mockResolvedValue({ gameId: "g1" } as never);
      const socket = makeSocket();
      const io = makeIo();
      registerSeatTransferHandlers(socket, io);

      await handlerFor(socket, SocketEvents.CLAIM_SEAT_TRANSFER)(
        { code: "BACK01" },
        vi.fn(),
      );

      // Opponents who were told to move on re-read their schedule, and the
      // Pairs screen / live leaderboard catch up without a reload.
      expect(io.to).toHaveBeenCalledWith("game:g1");
      expect(io.__emit).toHaveBeenCalledWith(SocketEvents.SCHEDULE_CHANGED, {
        gameId: "g1",
      });
      expect(io.__emit).toHaveBeenCalledWith(SocketEvents.GAME_UPDATED, {
        game: { gameId: "g1" },
      });
      expect(broadcastParticipants).toHaveBeenCalledWith("g1", io);
      expect(broadcastLeaderboardChanged).toHaveBeenCalledWith(io, "g1");
    });

    it("relays the reason for an invalid code", async () => {
      vi.mocked(validateAndClaimSeatTransferCode).mockResolvedValue({
        valid: false,
        error: "Code has expired",
      });
      const socket = makeSocket();
      registerSeatTransferHandlers(socket, makeIo());
      const cb = vi.fn();

      await handlerFor(socket, SocketEvents.CLAIM_SEAT_TRANSFER)(
        { code: "OLD222" },
        cb,
      );

      expect(cb).toHaveBeenCalledWith({
        success: false,
        error: "Code has expired",
      });
    });

    it("returns an error when validation throws", async () => {
      const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      vi.mocked(validateAndClaimSeatTransferCode).mockRejectedValue(
        new Error("db down"),
      );
      const socket = makeSocket();
      registerSeatTransferHandlers(socket, makeIo());
      const cb = vi.fn();

      await handlerFor(socket, SocketEvents.CLAIM_SEAT_TRANSFER)(
        { code: "ABC234" },
        cb,
      );

      expect(cb).toHaveBeenCalledWith({
        success: false,
        error: "Internal error",
      });
      errSpy.mockRestore();
    });
  });

  describe("INSPECT_SEAT_TRANSFER", () => {
    it("reports isHandover without consuming the code (no auth)", async () => {
      vi.mocked(inspectSeatTransferCode).mockResolvedValue({
        valid: true,
        gameId: "g1",
        seat: "A1NS",
        isHandover: true,
      });
      const socket = makeSocket();
      registerSeatTransferHandlers(socket, makeIo());
      const cb = vi.fn();

      await handlerFor(socket, SocketEvents.INSPECT_SEAT_TRANSFER)(
        { code: "HAND01" },
        cb,
      );

      expect(assertPlayer).not.toHaveBeenCalled();
      expect(inspectSeatTransferCode).toHaveBeenCalledWith("HAND01");
      expect(cb).toHaveBeenCalledWith({
        success: true,
        data: { gameId: "g1", seat: "A1NS", isHandover: true },
      });
    });

    it("relays the reason for an invalid code", async () => {
      vi.mocked(inspectSeatTransferCode).mockResolvedValue({
        valid: false,
        error: "Invalid code",
      });
      const socket = makeSocket();
      registerSeatTransferHandlers(socket, makeIo());
      const cb = vi.fn();

      await handlerFor(socket, SocketEvents.INSPECT_SEAT_TRANSFER)(
        { code: "ZZZZZZ" },
        cb,
      );

      expect(cb).toHaveBeenCalledWith({
        success: false,
        error: "Invalid code",
      });
    });
  });
});
