import { describe, it, expect, vi, beforeEach } from "vitest";
import { SocketEvents } from "@/socket/socket-events";

// ---- mocks ----

vi.mock("@/db/games/shared/actions/create-player", () => ({
  createPlayer: vi.fn(),
}));

vi.mock("@/db/games/individual/actions/create-participant", () => ({
  createParticipant: vi.fn(),
}));

vi.mock("@/db/games/individual/queries/find-individuals", () => ({
  findIndividuals: vi.fn(),
}));

vi.mock("@/db/games/pairs/actions/create-participant", () => ({
  createParticipant: vi.fn(),
}));

vi.mock("@/db/games/pairs/queries/find-pairs", () => ({
  findPairs: vi.fn(),
}));

// director-auth: assertDirector reads socket.data.isDirector — no DB needed
vi.mock("@/db/system/queries/find-login-session", () => ({
  findLoginSession: vi.fn(),
}));

import { createPlayer } from "@/db/games/shared/actions/create-player";
import { createParticipant as createIndividual } from "@/db/games/individual/actions/create-participant";
import { findIndividuals } from "@/db/games/individual/queries/find-individuals";
import { createParticipant as createPair } from "@/db/games/pairs/actions/create-participant";
import { findPairs } from "@/db/games/pairs/queries/find-pairs";
import { registerCreateParticipantHandler } from "./create-participant";

// helper: build a mock socket that passes the director guard
function makeDirectorSocket() {
  return {
    data: { isDirector: true },
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
  });

  it("registers handler on CREATE_PARTICIPANT event", () => {
    const socket = makeDirectorSocket();
    registerCreateParticipantHandler(socket as any, makeIo() as any);
    expect(socket.on).toHaveBeenCalledWith(
      SocketEvents.CREATE_PARTICIPANT,
      expect.any(Function),
    );
  });

  it("rejects non-director sockets immediately", async () => {
    const socket = { data: { isDirector: false }, id: "x", on: vi.fn() };
    registerCreateParticipantHandler(socket as any, makeIo() as any);

    const handler = socket.on.mock.calls[0][1];
    const cb = vi.fn();

    await handler(
      {
        gameId: "g1",
        newParticipant: {
          type: "INDIVIDUAL",
          initialSeat: "1N",
          player: { firstName: "A", lastName: "B" },
        },
      },
      cb,
    );

    expect(cb).toHaveBeenCalledWith({ success: false, error: "Unauthorized" });
    expect(createPlayer).not.toHaveBeenCalled();
  });

  describe("INDIVIDUAL participant", () => {
    it("creates player + participant, emits PARTICIPANTS, returns key", async () => {
      const socket = makeDirectorSocket();
      const emitFn = vi.fn();
      const io = makeIo(emitFn);

      registerCreateParticipantHandler(socket as any, io as any);
      const handler = socket.on.mock.calls[0][1];
      const cb = vi.fn();

      vi.mocked(createPlayer).mockResolvedValue({ id: 42 } as any);
      vi.mocked(createIndividual).mockResolvedValue(undefined);
      vi.mocked(findIndividuals).mockResolvedValue([
        {
          type: "INDIVIDUAL",
          initialSeat: "1N",
          player: { id: 42, firstName: "A", lastName: "B", nationalId: null },
        },
      ]);

      await handler(
        {
          gameId: "game-1",
          newParticipant: {
            type: "INDIVIDUAL",
            initialSeat: "1N",
            player: { firstName: "A", lastName: "B" },
          },
        },
        cb,
      );

      expect(createPlayer).toHaveBeenCalledWith("INDIVIDUAL", "game-1", {
        firstName: "A",
        lastName: "B",
      });

      expect(createIndividual).toHaveBeenCalledWith(
        "game-1",
        expect.objectContaining({ initialSeat: "1N", player: 42 }),
      );

      expect(io.to).toHaveBeenCalled();
      expect(emitFn).toHaveBeenCalledWith(
        SocketEvents.PARTICIPANTS,
        expect.objectContaining({ participants: expect.any(Array) }),
      );

      expect(cb).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, key: expect.any(String) }),
      );
    });

    it("calls cb with success: false on error", async () => {
      const socket = makeDirectorSocket();
      registerCreateParticipantHandler(socket as any, makeIo() as any);
      const handler = socket.on.mock.calls[0][1];
      const cb = vi.fn();

      vi.mocked(createPlayer).mockRejectedValue(new Error("db fail"));

      await handler(
        {
          gameId: "game-1",
          newParticipant: {
            type: "INDIVIDUAL",
            initialSeat: "1N",
            player: { firstName: "A", lastName: "B" },
          },
        },
        cb,
      );

      expect(cb).toHaveBeenCalledWith({ success: false });
    });
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
            initialSeat: "1NS",
            player1: { firstName: "P1", lastName: "L1" },
            player2: { firstName: "P2", lastName: "L2" },
          },
        },
        cb,
      );

      expect(createPlayer).toHaveBeenCalledTimes(2);
      expect(createPlayer).toHaveBeenNthCalledWith(1, "PAIRS", "game-1", {
        firstName: "P1",
        lastName: "L1",
      });
      expect(createPlayer).toHaveBeenNthCalledWith(2, "PAIRS", "game-1", {
        firstName: "P2",
        lastName: "L2",
      });

      expect(createPair).toHaveBeenCalledWith(
        "game-1",
        expect.objectContaining({
          initialSeat: "1NS",
          player1: 10,
          player2: 11,
        }),
      );

      expect(emitFn).toHaveBeenCalledWith(
        SocketEvents.PARTICIPANTS,
        expect.objectContaining({ participants: expect.any(Array) }),
      );

      expect(cb).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, key: expect.any(String) }),
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
            initialSeat: "1NS",
            player1: { firstName: "P1", lastName: "L1" },
            player2: { firstName: "P2", lastName: "L2" },
          },
        },
        cb,
      );

      expect(cb).toHaveBeenCalledWith({ success: false });
    });
  });
});
