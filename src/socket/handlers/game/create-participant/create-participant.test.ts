import { describe, it, expect, vi, beforeEach } from "vitest";
import { SocketEvents } from "@/socket/socket-events";

// ---- mocks ----

vi.mock("@/db/games/actions/create-pair-with-players", () => ({
  createPairWithPlayers: vi.fn(),
}));

vi.mock("@/db/games/queries/find-pairs", () => ({
  findPairs: vi.fn(),
}));

vi.mock("@/db/games/queries/find-seated-national-ids", () => ({
  findSeatedNationalIds: vi.fn(),
}));

vi.mock("@/db/games", () => ({
  getDb: vi.fn(),
}));

import { createPairWithPlayers } from "@/db/games/actions/create-pair-with-players";
import { findPairs } from "@/db/games/queries/find-pairs";
import { findSeatedNationalIds } from "@/db/games/queries/find-seated-national-ids";
import { getDb } from "@/db/games";
import { registerCreateParticipantHandler } from "./create-participant";

function makeDirectorSocket() {
  return {
    data: {},
    id: "test-socket",
    on: vi.fn(),
  };
}

function makeIo(emitFn = vi.fn()) {
  return {
    to: vi.fn(() => ({ emit: emitFn })),
  };
}

describe("registerCreateParticipantHandler (unit)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getDb).mockResolvedValue({} as any);
    // Default: no one seated yet, so no national-id clash.
    vi.mocked(findSeatedNationalIds).mockResolvedValue(new Set());
  });

  it("registers handler on CREATE_PARTICIPANT event", () => {
    const socket = makeDirectorSocket();
    registerCreateParticipantHandler(socket as any, makeIo() as any);
    expect(socket.on).toHaveBeenCalledWith(
      SocketEvents.CREATE_PARTICIPANT,
      expect.any(Function),
    );
  });

  describe("PAIR participant", () => {
    it("creates the pair (players + participant) transactionally, emits PARTICIPANTS, returns key", async () => {
      const socket = makeDirectorSocket();
      const emitFn = vi.fn();
      const io = makeIo(emitFn);

      registerCreateParticipantHandler(socket as any, io as any);
      const handler = socket.on.mock.calls[0][1];
      const cb = vi.fn();

      vi.mocked(createPairWithPlayers).mockResolvedValue(undefined);
      vi.mocked(findPairs).mockResolvedValue([]);

      await handler(
        {
          gameId: "game-1",
          newParticipant: {
            type: "PAIR",
            initialSeat: "A1NS",
            player1: { firstName: "P1", lastName: "L1" },
            player2: { firstName: "P2", lastName: "L2" },
          },
        },
        cb,
      );

      // Both players and the participant row are created in one call so a
      // failure can't orphan players.
      expect(createPairWithPlayers).toHaveBeenCalledWith(
        "game-1",
        expect.objectContaining({
          initialSeat: "A1NS",
          player1: { firstName: "P1", lastName: "L1" },
          player2: { firstName: "P2", lastName: "L2" },
          secretKey: expect.any(String),
        }),
      );

      expect(emitFn).toHaveBeenCalledWith(
        SocketEvents.PARTICIPANTS,
        expect.objectContaining({ participants: expect.any(Array) }),
      );

      expect(cb).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({ key: expect.any(String) }),
        }),
      );
    });

    it("calls cb with success: false on error", async () => {
      const socket = makeDirectorSocket();
      registerCreateParticipantHandler(socket as any, makeIo() as any);
      const handler = socket.on.mock.calls[0][1];
      const cb = vi.fn();

      vi.mocked(createPairWithPlayers).mockRejectedValue(new Error("fail"));

      await handler(
        {
          gameId: "game-1",
          newParticipant: {
            type: "PAIR",
            initialSeat: "A1NS",
            player1: { firstName: "P1", lastName: "L1" },
            player2: { firstName: "P2", lastName: "L2" },
          },
        },
        cb,
      );

      expect(cb).toHaveBeenCalledWith(
        expect.objectContaining({ success: false }),
      );
    });
  });

  describe("EBU-number validation", () => {
    function seatPair(
      handler: (payload: unknown, cb: (r: unknown) => void) => Promise<void>,
      cb: (r: unknown) => void,
      p1: { nationalId?: string | null },
      p2: { nationalId?: string | null },
    ) {
      return handler(
        {
          gameId: "game-1",
          newParticipant: {
            type: "PAIR",
            initialSeat: "A1NS",
            player1: { firstName: "P1", lastName: "L1", ...p1 },
            player2: { firstName: "P2", lastName: "L2", ...p2 },
          },
        },
        cb,
      );
    }

    it("rejects the same EBU number for both players of the pair", async () => {
      const socket = makeDirectorSocket();
      registerCreateParticipantHandler(socket as any, makeIo() as any);
      const handler = socket.on.mock.calls[0][1];
      const cb = vi.fn();

      await seatPair(
        handler,
        cb,
        { nationalId: "123456" },
        { nationalId: "123456" },
      );

      expect(cb).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.stringContaining("123456"),
        }),
      );
      // No rows created for a rejected pair.
      expect(createPairWithPlayers).not.toHaveBeenCalled();
    });

    it("rejects an EBU number already seated elsewhere in the event", async () => {
      vi.mocked(findSeatedNationalIds).mockResolvedValue(new Set(["999999"]));

      const socket = makeDirectorSocket();
      registerCreateParticipantHandler(socket as any, makeIo() as any);
      const handler = socket.on.mock.calls[0][1];
      const cb = vi.fn();

      await seatPair(
        handler,
        cb,
        { nationalId: "999999" },
        { nationalId: "111111" },
      );

      expect(cb).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.stringContaining("999999"),
        }),
      );
      expect(createPairWithPlayers).not.toHaveBeenCalled();
    });

    it("allows two guests (no EBU number) at the same table", async () => {
      const socket = makeDirectorSocket();
      const emitFn = vi.fn();
      registerCreateParticipantHandler(socket as any, makeIo(emitFn) as any);
      const handler = socket.on.mock.calls[0][1];
      const cb = vi.fn();

      vi.mocked(createPairWithPlayers).mockResolvedValue(undefined);
      vi.mocked(findPairs).mockResolvedValue([]);

      await seatPair(handler, cb, { nationalId: null }, { nationalId: null });

      expect(cb).toHaveBeenCalledWith(
        expect.objectContaining({ success: true }),
      );
      expect(createPairWithPlayers).toHaveBeenCalled();
    });

    it("allows distinct EBU numbers not already seated", async () => {
      const socket = makeDirectorSocket();
      const emitFn = vi.fn();
      registerCreateParticipantHandler(socket as any, makeIo(emitFn) as any);
      const handler = socket.on.mock.calls[0][1];
      const cb = vi.fn();

      vi.mocked(createPairWithPlayers).mockResolvedValue(undefined);
      vi.mocked(findPairs).mockResolvedValue([]);

      await seatPair(
        handler,
        cb,
        { nationalId: "123456" },
        { nationalId: "654321" },
      );

      expect(cb).toHaveBeenCalledWith(
        expect.objectContaining({ success: true }),
      );
      expect(createPairWithPlayers).toHaveBeenCalled();
    });
  });
});
