import { describe, it, expect, vi, beforeEach } from "vitest";
import { SocketEvents } from "@/socket/socket-events";

// ---- mocks ----

vi.mock("@/db/games/actions/create-player", () => ({
  createPlayer: vi.fn(),
}));

vi.mock("@/db/games/actions/create-participant", () => ({
  createParticipant: vi.fn(),
}));

vi.mock("@/db/games/queries/find-pairs", () => ({
  findPairs: vi.fn(),
}));

vi.mock("@/db/games", () => ({
  getDb: vi.fn(),
}));

import { createPlayer } from "@/db/games/actions/create-player";
import { createParticipant as createPair } from "@/db/games/actions/create-participant";
import { findPairs } from "@/db/games/queries/find-pairs";
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
    it("creates two players + pair, emits PARTICIPANTS, returns key", async () => {
      const socket = makeDirectorSocket();
      const emitFn = vi.fn();
      const io = makeIo(emitFn);

      registerCreateParticipantHandler(socket as any, io as any);
      const handler = socket.on.mock.calls[0][1];
      const cb = vi.fn();

      vi.mocked(createPlayer)
        .mockResolvedValueOnce({ id: 10 } as any)
        .mockResolvedValueOnce({ id: 11 } as any);
      vi.mocked(createPair).mockResolvedValue(undefined);
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

      expect(createPlayer).toHaveBeenCalledTimes(2);
      expect(createPlayer).toHaveBeenNthCalledWith(1, "game-1", {
        firstName: "P1",
        lastName: "L1",
      });
      expect(createPlayer).toHaveBeenNthCalledWith(2, "game-1", {
        firstName: "P2",
        lastName: "L2",
      });

      expect(createPair).toHaveBeenCalledWith(
        "game-1",
        expect.objectContaining({
          initialSeat: "A1NS",
          player1: 10,
          player2: 11,
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

      vi.mocked(createPlayer).mockRejectedValue(new Error("fail"));

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
});
