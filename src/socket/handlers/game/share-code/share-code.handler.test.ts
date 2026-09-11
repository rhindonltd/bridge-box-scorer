import { describe, it, expect, vi, beforeEach } from "vitest";
import { SocketEvents } from "@/socket/socket-events";

vi.mock("@/db/system/queries/validate-share-code", () => ({
  validateAndClaimShareCode: vi.fn(),
}));

vi.mock("@/db/system/actions/create-login-session", () => ({
  createLoginSession: vi.fn(),
}));

import { validateAndClaimShareCode } from "@/db/system/queries/validate-share-code";
import { createLoginSession } from "@/db/system/actions/create-login-session";
import { registerShareCodeHandlers } from "./share-code.handler";

function makeSocket() {
  return { data: {}, id: "test", on: vi.fn() } as any;
}

function makeIo() {
  return { to: vi.fn(() => ({ emit: vi.fn() })) } as any;
}

describe("registerShareCodeHandlers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("registers a handler for the claim event", () => {
    const socket = makeSocket();
    registerShareCodeHandlers(socket, makeIo());

    const events = socket.on.mock.calls.map((c: any) => c[0]);
    expect(events).toContain(SocketEvents.CLAIM_DIRECTOR_CODE);
  });

  describe("CLAIM_DIRECTOR_CODE", () => {
    it("claims a valid code and returns a director token", async () => {
      vi.mocked(validateAndClaimShareCode).mockResolvedValue({
        valid: true,
        gameId: "g1",
      });
      vi.mocked(createLoginSession).mockResolvedValue(undefined);

      const socket = makeSocket();
      registerShareCodeHandlers(socket, makeIo());

      const handler = socket.on.mock.calls.find(
        (c: any) => c[0] === SocketEvents.CLAIM_DIRECTOR_CODE,
      )![1];

      const cb = vi.fn();
      await handler({ code: "K7M2PX" }, cb);

      expect(validateAndClaimShareCode).toHaveBeenCalledWith("K7M2PX");
      expect(createLoginSession).toHaveBeenCalledWith(
        expect.objectContaining({ gameId: "g1", role: "DIRECTOR" }),
      );
      expect(cb).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          gameId: "g1",
          directorToken: expect.any(String),
        }),
      );
    });

    it("rejects an invalid code", async () => {
      vi.mocked(validateAndClaimShareCode).mockResolvedValue({
        valid: false,
        error: "Invalid code",
      });

      const socket = makeSocket();
      registerShareCodeHandlers(socket, makeIo());

      const handler = socket.on.mock.calls.find(
        (c: any) => c[0] === SocketEvents.CLAIM_DIRECTOR_CODE,
      )![1];

      const cb = vi.fn();
      await handler({ code: "BADCODE" }, cb);

      expect(cb).toHaveBeenCalledWith({
        success: false,
        error: "Invalid code",
      });
      expect(createLoginSession).not.toHaveBeenCalled();
    });

    it("rejects an expired code", async () => {
      vi.mocked(validateAndClaimShareCode).mockResolvedValue({
        valid: false,
        error: "Code has expired",
      });

      const socket = makeSocket();
      registerShareCodeHandlers(socket, makeIo());

      const handler = socket.on.mock.calls.find(
        (c: any) => c[0] === SocketEvents.CLAIM_DIRECTOR_CODE,
      )![1];

      const cb = vi.fn();
      await handler({ code: "OLDCODE" }, cb);

      expect(cb).toHaveBeenCalledWith({
        success: false,
        error: "Code has expired",
      });
    });

    it("rejects an already-used code", async () => {
      vi.mocked(validateAndClaimShareCode).mockResolvedValue({
        valid: false,
        error: "Code has already been used",
      });

      const socket = makeSocket();
      registerShareCodeHandlers(socket, makeIo());

      const handler = socket.on.mock.calls.find(
        (c: any) => c[0] === SocketEvents.CLAIM_DIRECTOR_CODE,
      )![1];

      const cb = vi.fn();
      await handler({ code: "USEDCD" }, cb);

      expect(cb).toHaveBeenCalledWith({
        success: false,
        error: "Code has already been used",
      });
    });

    it("rejects invalid payload (missing code)", async () => {
      const socket = makeSocket();
      registerShareCodeHandlers(socket, makeIo());

      const handler = socket.on.mock.calls.find(
        (c: any) => c[0] === SocketEvents.CLAIM_DIRECTOR_CODE,
      )![1];

      const cb = vi.fn();
      await handler({}, cb);

      expect(cb).toHaveBeenCalledWith({
        success: false,
        error: "Invalid payload",
      });
      expect(validateAndClaimShareCode).not.toHaveBeenCalled();
    });

    it("returns error when validateAndClaimShareCode throws", async () => {
      vi.mocked(validateAndClaimShareCode).mockRejectedValue(
        new Error("DB error"),
      );

      const socket = makeSocket();
      registerShareCodeHandlers(socket, makeIo());

      const handler = socket.on.mock.calls.find(
        (c: any) => c[0] === SocketEvents.CLAIM_DIRECTOR_CODE,
      )![1];

      const cb = vi.fn();
      await handler({ code: "ABCDEF" }, cb);

      expect(cb).toHaveBeenCalledWith({
        success: false,
        error: "Failed to claim code",
      });
    });
  });
});
