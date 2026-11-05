import { describe, it, expect, vi, beforeEach } from "vitest";
import { SocketEvents } from "@/socket/socket-events";

// ---- mocks ----

vi.mock("@/db/games/queries/is-game-started", () => ({
  isGameStarted: vi.fn(async () => false),
}));
vi.mock("@/db/game-index/queries/find-game-by-id", () => ({
  findGameById: vi.fn(),
}));
vi.mock("@/db/games/actions/record-late-arrival", () => ({
  recordLateArrival: vi.fn(),
}));
vi.mock("@/db/games/actions/create-pair-with-players", () => ({
  createPairWithPlayers: vi.fn(),
}));

vi.mock("@/db/games/queries/find-pairs", () => ({
  findPairs: vi.fn(),
}));

vi.mock("@/db/games/queries/find-seated-national-ids", () => ({
  findSeatedNationalIds: vi.fn(),
}));

vi.mock("@/db/games/queries/find-sections", () => ({
  findSections: vi.fn(),
}));

vi.mock("@/db/games", () => ({
  getDb: vi.fn(),
}));

vi.mock("@/socket/handlers/results/broadcast-results", () => ({
  broadcastLeaderboardChanged: vi.fn().mockResolvedValue(undefined),
}));

import { createPairWithPlayers } from "@/db/games/actions/create-pair-with-players";
import { findPairs } from "@/db/games/queries/find-pairs";
import { findSeatedNationalIds } from "@/db/games/queries/find-seated-national-ids";
import { findSections } from "@/db/games/queries/find-sections";
import { getDb } from "@/db/games";
import { broadcastLeaderboardChanged } from "@/socket/handlers/results/broadcast-results";
import { isGameStarted } from "@/db/games/queries/is-game-started";
import { findGameById } from "@/db/game-index/queries/find-game-by-id";
import { recordLateArrival } from "@/db/games/actions/record-late-arrival";
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
    vi.mocked(isGameStarted).mockResolvedValue(false);
    // Default: no one seated yet, so no national-id clash.
    vi.mocked(findSeatedNationalIds).mockResolvedValue(new Set());
    // Default layout makes the A1NS seat these tests use valid.
    vi.mocked(findSections).mockResolvedValue([
      {
        section: "A",
        label: "A",
        tables: 4,
        selectedMovement: null,
        ordinal: 0,
      },
    ] as any);
  });

  it("registers handler on CREATE_PARTICIPANT event", () => {
    const socket = makeDirectorSocket();
    registerCreateParticipantHandler(socket as any, makeIo() as any);
    expect(socket.on).toHaveBeenCalledWith(
      SocketEvents.CREATE_PARTICIPANT,
      expect.any(Function),
    );
  });

  describe("late arrival (design §11)", () => {
    const payload = {
      gameId: "game-1",
      newParticipant: {
        type: "PAIR",
        initialSeat: "A1NS",
        player1: { firstName: "P1", lastName: "L1" },
        player2: { firstName: "P2", lastName: "L2" },
      },
    };

    async function seatAfterStart(game: object, late: boolean) {
      vi.mocked(isGameStarted).mockResolvedValue(true);
      vi.mocked(findGameById).mockResolvedValue(game as any);
      vi.mocked(recordLateArrival).mockResolvedValue(
        late ? { late: true, arrivalRound: 3 } : { late: false },
      );
      vi.mocked(createPairWithPlayers).mockResolvedValue(undefined);
      vi.mocked(findPairs).mockResolvedValue([]);
      const socket = makeDirectorSocket();
      const emitFn = vi.fn();
      registerCreateParticipantHandler(socket as any, makeIo(emitFn) as any);
      await socket.on.mock.calls[0][1](payload, vi.fn());
      return emitFn;
    }

    it("records a pairs pair seated after the start as a late arrival and announces the schedule change", async () => {
      const emitFn = await seatAfterStart(
        { gameType: "PAIRS", eventFormat: "STANDARD" },
        true,
      );
      expect(recordLateArrival).toHaveBeenCalledWith("game-1", "A1NS");
      expect(emitFn).toHaveBeenCalledWith(SocketEvents.SCHEDULE_CHANGED, {
        gameId: "game-1",
      });
    });

    it("does not announce a schedule change when the pair missed nothing", async () => {
      const emitFn = await seatAfterStart(
        { gameType: "PAIRS", eventFormat: "STANDARD" },
        false,
      );
      expect(emitFn).not.toHaveBeenCalledWith(
        SocketEvents.SCHEDULE_CHANGED,
        expect.anything(),
      );
    });

    it("leaves teams and Swiss events alone", async () => {
      await seatAfterStart(
        { gameType: "TEAMS", eventFormat: "STANDARD" },
        true,
      );
      await seatAfterStart({ gameType: "PAIRS", eventFormat: "SWISS" }, true);
      expect(recordLateArrival).not.toHaveBeenCalled();
    });

    it("does nothing before the start", async () => {
      vi.mocked(createPairWithPlayers).mockResolvedValue(undefined);
      vi.mocked(findPairs).mockResolvedValue([]);
      const socket = makeDirectorSocket();
      registerCreateParticipantHandler(socket as any, makeIo() as any);
      await socket.on.mock.calls[0][1](payload, vi.fn());
      expect(recordLateArrival).not.toHaveBeenCalled();
    });
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

      // The newly-seated pair must show on the leaderboard live, so a fresh
      // standings snapshot is pushed to the leaderboard room too.
      expect(broadcastLeaderboardChanged).toHaveBeenCalledWith(io, "game-1");

      expect(cb).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({ key: expect.any(String) }),
        }),
      );
    });

    it("does not touch the leaderboard when seating is rejected", async () => {
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

      expect(broadcastLeaderboardChanged).not.toHaveBeenCalled();
    });

    it("forwards an optional team name to createPairWithPlayers", async () => {
      const socket = makeDirectorSocket();
      const io = makeIo();

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
          teamName: "Sharks",
        },
        cb,
      );

      expect(createPairWithPlayers).toHaveBeenCalledWith(
        "game-1",
        expect.objectContaining({ teamName: "Sharks" }),
      );
    });

    it("passes teamName undefined when none is supplied", async () => {
      const socket = makeDirectorSocket();
      registerCreateParticipantHandler(socket as any, makeIo() as any);
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

      expect(createPairWithPlayers).toHaveBeenCalledWith(
        "game-1",
        expect.objectContaining({ teamName: undefined }),
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
