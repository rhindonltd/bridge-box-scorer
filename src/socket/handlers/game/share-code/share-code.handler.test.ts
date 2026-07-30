import { describe, it, expect, vi, beforeEach } from "vitest";
import { SocketEvents } from "@/socket/socket-events";

vi.mock("@/db/system/actions/create-share-code", () => ({
  createShareCode: vi.fn(),
}));

vi.mock("@/db/system/queries/validate-share-code", () => ({
  validateAndClaimShareCode: vi.fn(),
}));

vi.mock("@/db/system/actions/create-login-session", () => ({
  createLoginSession: vi.fn(),
}));

vi.mock("@/db/system/queries/find-login-session", () => ({
  findLoginSession: vi.fn(),
}));

import { createShareCode } from "@/db/system/actions/create-share-code";
import { validateAndClaimShareCode } from "@/db/system/queries/validate-share-code";
import { createLoginSession } from "@/db/system/actions/create-login-session";
import { findLoginSession } from "@/db/system/queries/find-login-session";
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

  it("registers handlers for both events", () => {
    const socket = makeSocket();
    registerShareCodeHandlers(socket, makeIo());

    const events = socket.on.mock.calls.map((c: any) => c[0]);
    expect(events).toContain(SocketEvents.GENERATE_SHARE_CODE);
    expect(events).toContain(SocketEvents.CLAIM_DIRECTOR_CODE);
  });

  describe("GENERATE_SHARE_CODE", () => {
    it("generates a code for an authorized director", async () => {
      vi.mocked(findLoginSession).mockReturnValue({
        token: "tok", role: "DIRECTOR", gameId: "g1",
      } as any);
      vi.mocked(createShareCode).mockResolvedValue("K7M2PX");

      const socket = makeSocket();
      registerShareCodeHandlers(socket, makeIo());

      const handler = socket.on.mock.calls.find(
        (c: any) => c[0] === SocketEvents.GENERATE_SHARE_CODE,
      )![1];

      const cb = vi.fn();
      await handler({ gameId: "g1", directorToken: "tok" }, cb);

      expect(createShareCode).toHaveBeenCalledWith("g1");
      expect(cb).toHaveBeenCalledWith({ success: true, code: "K7M2PX" });
    });

    it("rejects non-directors", async () => {
      vi.mocked(findLoginSession).mockReturnValue(null);

      const socket = makeSocket();
      registerShareCodeHandlers(socket, makeIo());

      const handler = socket.on.mock.calls.find(
        (c: any) => c[0] === SocketEvents.GENERATE_SHARE_CODE,
      )![1];

      const cb = vi.fn();
      await handler({ gameId: "g1", directorToken: "bad" }, cb);

      expect(createShareCode).not.toHaveBeenCalled();
      expect(cb).toHaveBeenCalledWith({ success: false, error: "Unauthorized" });
    });
  });

  describe("CLAIM_DIRECTOR_CODE", () => {
    it("claims a valid code and returns a director token", async () => {
      vi.mocked(validateAndClaimShareCode).mockResolvedValue({
        valid: true, gameId: "g1",
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
        expect.objectContaining({ success: true, gameId: "g1", directorToken: expect.any(String) }),
      );
    });

    it("rejects an invalid code", async () => {
      vi.mocked(validateAndClaimShareCode).mockResolvedValue({
        valid: false, error: "Invalid code",
      });

      const socket = makeSocket();
      registerShareCodeHandlers(socket, makeIo());

      const handler = socket.on.mock.calls.find(
        (c: any) => c[0] === SocketEvents.CLAIM_DIRECTOR_CODE,
      )![1];

      const cb = vi.fn();
      await handler({ code: "BADCODE" }, cb);

      expect(cb).toHaveBeenCalledWith({ success: false, error: "Invalid code" });
      expect(createLoginSession).not.toHaveBeenCalled();
    });

    it("rejects an expired code", async () => {
      vi.mocked(validateAndClaimShareCode).mockResolvedValue({
        valid: false, error: "Code has expired",
      });

      const socket = makeSocket();
      registerShareCodeHandlers(socket, makeIo());

      const handler = socket.on.mock.calls.find(
        (c: any) => c[0] === SocketEvents.CLAIM_DIRECTOR_CODE,
      )![1];

      const cb = vi.fn();
      await handler({ code: "OLDCODE" }, cb);

      expect(cb).toHaveBeenCalledWith({ success: false, error: "Code has expired" });
    });

    it("rejects an already-used code", async () => {
      vi.mocked(validateAndClaimShareCode).mockResolvedValue({
        valid: false, error: "Code has already been used",
      });

      const socket = makeSocket();
      registerShareCodeHandlers(socket, makeIo());

      const handler = socket.on.mock.calls.find(
        (c: any) => c[0] === SocketEvents.CLAIM_DIRECTOR_CODE,
      )![1];

      const cb = vi.fn();
      await handler({ code: "USEDCD" }, cb);

      expect(cb).toHaveBeenCalledWith({ success: false, error: "Code has already been used" });
    });
  });
});
