import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Socket } from "socket.io";
import { createSocketTestServer } from "@/socket/test/socket-test-harness";
import { emitWithAck } from "@/socket/test/socket-helpers";
import { SocketEvents } from "@/socket/socket-events";
import { registerShareCodeHandlers } from "./share-code.handler";

vi.mock("@/db/system/queries/find-login-session", () => ({
  findLoginSession: vi.fn(),
}));

vi.mock("@/db/system/actions/create-share-code", () => ({
  createShareCode: vi.fn(),
}));

vi.mock("@/db/system/queries/validate-share-code", () => ({
  validateAndClaimShareCode: vi.fn(),
}));

vi.mock("@/db/system/actions/create-login-session", () => ({
  createLoginSession: vi.fn(),
}));

import { findLoginSession } from "@/db/system/queries/find-login-session";
import { createShareCode } from "@/db/system/actions/create-share-code";
import { validateAndClaimShareCode } from "@/db/system/queries/validate-share-code";
import { createLoginSession } from "@/db/system/actions/create-login-session";

describe("registerShareCodeHandlers (integration)", () => {
  let closeServer: () => Promise<void>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(findLoginSession).mockReturnValue({
      token: "test-token",
      role: "DIRECTOR",
      gameId: "game-1",
    } as any);
  });

  afterEach(async () => {
    await closeServer?.();
  });

  describe("GENERATE_SHARE_CODE", () => {
    it("returns a code when director is authenticated", async () => {
      vi.mocked(createShareCode).mockResolvedValue("ABC123");

      const { client, close } = await createSocketTestServer((io) => {
        io.on("connection", (socket: Socket) => {
          registerShareCodeHandlers(socket, io);
        });
      });
      closeServer = close;

      const result = await emitWithAck(
        client,
        SocketEvents.GENERATE_SHARE_CODE,
        {
          gameId: "game-1",
          directorToken: "test-token",
        },
      );

      expect(result).toEqual({ success: true, code: "ABC123" });
    });

    it("rejects invalid director token", async () => {
      vi.mocked(findLoginSession).mockReturnValue(null as any);

      const { client, close } = await createSocketTestServer((io) => {
        io.on("connection", (socket: Socket) => {
          registerShareCodeHandlers(socket, io);
        });
      });
      closeServer = close;

      const result = await emitWithAck(
        client,
        SocketEvents.GENERATE_SHARE_CODE,
        {
          gameId: "game-1",
          directorToken: "bad-token",
        },
      );

      expect(result).toMatchObject({ success: false });
    });
  });

  describe("CLAIM_DIRECTOR_CODE", () => {
    it("returns directorToken and gameId on valid code", async () => {
      vi.mocked(validateAndClaimShareCode).mockResolvedValue({
        valid: true,
        gameId: "game-1",
      } as any);
      vi.mocked(createLoginSession).mockResolvedValue(undefined as any);

      const { client, close } = await createSocketTestServer((io) => {
        io.on("connection", (socket: Socket) => {
          registerShareCodeHandlers(socket, io);
        });
      });
      closeServer = close;

      const result = await emitWithAck(
        client,
        SocketEvents.CLAIM_DIRECTOR_CODE,
        {
          code: "ABC123",
        },
      );

      expect(result.success).toBe(true);
      expect(result.directorToken).toBeDefined();
      expect(result.gameId).toBe("game-1");
      expect(createLoginSession).toHaveBeenCalled();
    });

    it("rejects invalid code", async () => {
      vi.mocked(validateAndClaimShareCode).mockResolvedValue({
        valid: false,
        error: "Invalid or expired code",
      } as any);

      const { client, close } = await createSocketTestServer((io) => {
        io.on("connection", (socket: Socket) => {
          registerShareCodeHandlers(socket, io);
        });
      });
      closeServer = close;

      const result = await emitWithAck(
        client,
        SocketEvents.CLAIM_DIRECTOR_CODE,
        {
          code: "WRONG1",
        },
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid or expired");
    });

    it("rejects empty payload", async () => {
      const { client, close } = await createSocketTestServer((io) => {
        io.on("connection", (socket: Socket) => {
          registerShareCodeHandlers(socket, io);
        });
      });
      closeServer = close;

      const result = await emitWithAck(
        client,
        SocketEvents.CLAIM_DIRECTOR_CODE,
        {},
      );

      expect(result).toMatchObject({
        success: false,
        error: "Invalid payload",
      });
    });
  });
});
