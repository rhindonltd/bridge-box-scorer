import { describe, it, expect, vi, beforeEach } from "vitest";
import { SocketEvents } from "@/socket/socket-events";

vi.mock("@/socket/middleware/participant-auth", () => ({
  assertPlayer: vi.fn(),
}));
vi.mock("@/db/system/actions/create-seat-transfer-code", () => ({
  createSeatTransferCode: vi.fn(),
}));
vi.mock("@/db/system/queries/validate-seat-transfer-code", () => ({
  validateAndClaimSeatTransferCode: vi.fn(),
}));

import { assertPlayer } from "@/socket/middleware/participant-auth";
import { createSeatTransferCode } from "@/db/system/actions/create-seat-transfer-code";
import { validateAndClaimSeatTransferCode } from "@/db/system/queries/validate-seat-transfer-code";
import { registerSeatTransferHandlers } from "./seat-transfer.handler";

function makeSocket() {
  return { data: {}, id: "test", on: vi.fn() } as any;
}
function makeIo() {
  return { to: vi.fn(() => ({ emit: vi.fn() })) } as any;
}
function handlerFor(socket: any, event: string) {
  const call = socket.on.mock.calls.find((c: any) => c[0] === event);
  return call![1] as (payload: unknown, cb: (r: unknown) => void) => Promise<void>;
}

describe("registerSeatTransferHandlers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(assertPlayer).mockResolvedValue(true);
  });

  it("registers both transfer events", () => {
    const socket = makeSocket();
    registerSeatTransferHandlers(socket, makeIo());
    const events = socket.on.mock.calls.map((c: any) => c[0]);
    expect(events).toContain(SocketEvents.CREATE_SEAT_TRANSFER);
    expect(events).toContain(SocketEvents.CLAIM_SEAT_TRANSFER);
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

      expect(assertPlayer).toHaveBeenCalledWith("g1", "A1NS", "tok", cb);
      expect(createSeatTransferCode).toHaveBeenCalledWith("g1", "A1NS");
      expect(cb).toHaveBeenCalledWith({
        success: true,
        data: { code: "ABC234" },
      });
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

      expect(cb).toHaveBeenCalledWith({ success: false, error: "boom" });
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
      });
      const socket = makeSocket();
      registerSeatTransferHandlers(socket, makeIo());
      const cb = vi.fn();

      await handlerFor(socket, SocketEvents.CLAIM_SEAT_TRANSFER)(
        { code: "ABC234" },
        cb,
      );

      // Claiming is not player-authed — the code is the credential.
      expect(assertPlayer).not.toHaveBeenCalled();
      expect(validateAndClaimSeatTransferCode).toHaveBeenCalledWith("ABC234");
      expect(cb).toHaveBeenCalledWith({
        success: true,
        data: { gameId: "g1", seat: "A1NS", token: "new-token" },
      });
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

      expect(cb).toHaveBeenCalledWith({ success: false, error: "db down" });
      errSpy.mockRestore();
    });
  });
});
