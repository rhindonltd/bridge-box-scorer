import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Socket as ServerSocket } from "socket.io";
import { Socket as ClientSocket } from "socket.io-client";
import { createSocketTestServer } from "./socket-test-harness";
import { emitWithAck, waitForEvent } from "./socket-helpers";
import { SocketEvents } from "@/socket/socket-events";

// ---- Mock all DB layers ----

vi.mock("@/db/game-index/actions/create-game", () => ({
  createBridgeGame: vi.fn(),
}));

vi.mock("@/db/game-index/actions/set-selected-movement", () => ({
  setSelectedMovement: vi.fn(),
}));

vi.mock("@/db/games/actions/create-game", () => ({
  createGameDb: vi.fn(),
}));

vi.mock("@/db/game-index/queries/find-joinable-games", () => ({
  findJoinableGames: vi.fn(),
}));

vi.mock("@/db/game-index/queries/find-game-by-id", () => ({
  findGameById: vi.fn(),
}));

vi.mock("@/db/games/actions/update-section-tables", () => ({
  updateSectionTables: vi.fn(),
}));

vi.mock("@/db/games/queries/find-sections", () => ({
  findSections: vi.fn(),
}));

vi.mock("@/db/games/actions/create-player", () => ({
  createPlayer: vi.fn(),
}));

vi.mock("@/db/games/actions/create-participant", () => ({
  createParticipant: vi.fn(),
}));

vi.mock("@/db/games/queries/find-pairs", () => ({
  findPairs: vi.fn(),
}));

vi.mock("@/db/games/actions/delete-participant", () => ({
  deleteParticipant: vi.fn(),
}));

vi.mock("@/db/system/queries/find-login-session", () => ({
  findLoginSession: vi.fn(),
}));

vi.mock("@/db/movements/queries/get-movement", () => ({
  getPairMovement: vi.fn(),
  getTeamMovement: vi.fn(),
}));

vi.mock("@/db/games", () => ({
  getDb: vi.fn(async () => ({
    transaction: vi.fn(async (fn: any) =>
      fn({ insert: vi.fn(() => ({ values: vi.fn() })) }),
    ),
  })),
}));

vi.mock("@/timer/game-store", () => ({
  getEngine: vi.fn(),
  createEngine: vi.fn(),
}));

vi.mock("@/db/games/actions/update-timer-state", () => ({
  updateTimerState: vi.fn(),
}));

vi.mock("@/timer/scheduler", () => ({
  scheduleGame: vi.fn(),
  cancelGameSchedule: vi.fn(),
}));

import { findGameById } from "@/db/game-index/queries/find-game-by-id";
import { createPlayer } from "@/db/games/actions/create-player";
import { createParticipant as createPairParticipant } from "@/db/games/actions/create-participant";
import { findPairs } from "@/db/games/queries/find-pairs";
import { findLoginSession } from "@/db/system/queries/find-login-session";
import { getEngine } from "@/timer/game-store";
import { updateTimerState } from "@/db/games/actions/update-timer-state";

import { registerGameHandlers } from "@/socket/handlers/game/game.handlers";
import { registerTimerHandlers } from "@/socket/handlers/timer/timer.handlers";

/* ============================================================
   HELPER: create a fully-registered test server
============================================================ */

async function createFullServer() {
  return createSocketTestServer((io) => {
    io.on("connection", (socket: ServerSocket) => {
      registerGameHandlers(socket, io);
      registerTimerHandlers(socket, io);
    });
  });
}

/* ============================================================
   TESTS
============================================================ */

describe("Multi-client Socket.IO scenarios", () => {
  let closeServer: () => Promise<void>;
  let extraClients: ClientSocket[] = [];

  beforeEach(() => {
    vi.clearAllMocks();
    extraClients = [];
  });

  afterEach(async () => {
    for (const c of extraClients) c.disconnect();
    await closeServer?.();
  });

  /* ----------------------------------------------------------
     GAME CREATION — broadcast to all connected clients
  ---------------------------------------------------------- */
  // Game creation moved to POST /api/games; its global JOINABLE_GAMES broadcast
  // is covered by the joinable-broadcast unit test and the route test.

  /* ----------------------------------------------------------
     ROOM-SCOPED BROADCASTS — only room members receive events
  ---------------------------------------------------------- */
  describe("Room-scoped participant broadcasts", () => {
    it("only clients in the game room receive PARTICIPANTS updates", async () => {
      vi.mocked(findLoginSession).mockReturnValue({
        token: "tok",
        role: "DIRECTOR",
        gameId: "g1",
      } as any);
      vi.mocked(createPlayer).mockResolvedValue({ id: 1 } as any);
      vi.mocked(createPairParticipant).mockResolvedValue(undefined);
      vi.mocked(findPairs).mockResolvedValue([
        { type: "PAIR", initialSeat: "A1NS" },
      ] as any);

      const { client, close, addClient } = await createFullServer();
      closeServer = close;

      const playerInRoom = await addClient();
      const playerOutsideRoom = await addClient();
      extraClients.push(playerInRoom, playerOutsideRoom);

      // Only one player joins the game room
      await emitWithAck(playerInRoom, SocketEvents.JOIN_GAME, { gameId: "g1" });

      // Set up listeners
      const inRoomReceived = waitForEvent(
        playerInRoom,
        SocketEvents.PARTICIPANTS,
        2000,
      ).catch(() => "timeout");
      const outsideReceived = waitForEvent(
        playerOutsideRoom,
        SocketEvents.PARTICIPANTS,
        500,
      ).catch(() => "timeout");

      // Director (also needs to be in the room for the broadcast target)
      await emitWithAck(client, SocketEvents.JOIN_GAME, { gameId: "g1" });

      // Director creates a participant
      await new Promise<void>((resolve) => {
        client.emit(
          SocketEvents.CREATE_PARTICIPANT,
          {
            gameId: "g1",
            directorToken: "tok",
            newParticipant: {
              type: "PAIR",
              initialSeat: "A1NS",
              player1: { firstName: "A", lastName: "B" },
              player2: { firstName: "C", lastName: "D" },
            },
          },
          () => resolve(),
        );
      });

      // Player in room should receive the broadcast
      const inResult = await inRoomReceived;
      expect(inResult).not.toBe("timeout");
      expect(inResult).toMatchObject({ participants: expect.any(Array) });

      // Player outside room should NOT receive it
      const outResult = await outsideReceived;
      expect(outResult).toBe("timeout");
    });
  });

  /* ----------------------------------------------------------
     TABLE COUNT UPDATE — broadcast to game room
  ---------------------------------------------------------- */
  // Table resize moved to the HTTP route
  // PUT /api/games/[gameId]/sections/[section]/tables; its GAME_UPDATED
  // broadcast is covered by the section-broadcast unit test and the route test.

  // Eviction moved to the HTTP DELETE .../participants/[seat] route; its
  // PARTICIPANTS broadcast is covered by the participant-broadcast unit test
  // and the route test.

  /* ----------------------------------------------------------
     DIRECTOR HANDOFF — full flow across two clients
  ---------------------------------------------------------- */
  describe("Director authorization over the socket", () => {
    it("a client holding a valid director token can perform a director-only socket action", async () => {
      // Share-code generation and claiming are both HTTP routes now (POST
      // /api/games/[id]/share-code and POST /api/director-codes/claim), each
      // covered by its own route/service tests. What remains to prove at the
      // socket layer is that a director token authorizes a director-only socket
      // event — here, selecting a movement — for a client that obtained one.
      vi.mocked(findGameById).mockResolvedValue({ gameId: "g1" } as any);
      vi.mocked(findLoginSession).mockReturnValue({
        token: "dir-tok",
        role: "DIRECTOR",
        gameId: "g1",
      } as any);

      const { close, addClient } = await createFullServer();
      closeServer = close;

      const director = await addClient();
      extraClients.push(director);

      await emitWithAck(director, SocketEvents.JOIN_GAME, { gameId: "g1" });

      const actionResult = await emitWithAck<{ success: boolean }>(
        director,
        SocketEvents.SELECT_MOVEMENT,
        {
          gameId: "g1",
          type: "PAIRS",
          mitchell: { tables: 4, rounds: 4, boardsPerRound: 2 },
          directorToken: "dir-tok",
        },
      );

      expect(actionResult).toMatchObject({ success: true });
    });
  });

  /* ----------------------------------------------------------
     TIMER SYNC — all room members receive timer:sync
  ---------------------------------------------------------- */
  describe("Timer broadcasts to room", () => {
    it("players in room receive timer:sync when director starts timer", async () => {
      const timerState = {
        version: 1,
        phase: "play",
        board: 1,
        round: 1,
        boardsPerRound: 3,
        totalRounds: 5,
        playDuration: 420,
        moveDuration: 60,
        isRunning: true,
        phaseStartedAt: Date.now(),
        remainingMs: null,
      };

      const mockEngine = {
        start: vi.fn(),
        getState: vi.fn(() => timerState),
        getRemainingMs: vi.fn(() => 420000),
      };

      vi.mocked(findLoginSession).mockReturnValue({
        token: "tok",
        role: "DIRECTOR",
        gameId: "g1",
      } as any);
      vi.mocked(getEngine).mockResolvedValue(mockEngine as any);
      vi.mocked(updateTimerState).mockResolvedValue(undefined);

      const { client, close, addClient } = await createFullServer();
      closeServer = close;

      const player = await addClient();
      extraClients.push(player);

      await emitWithAck(client, SocketEvents.JOIN_GAME, { gameId: "g1" });
      await emitWithAck(player, SocketEvents.JOIN_GAME, { gameId: "g1" });
      // The player watches section A's timer (joins that timer room).
      await emitWithAck(player, SocketEvents.REQUEST_STATE_TIMER, {
        gameId: "g1",
        section: "A",
      });

      const syncPromise = waitForEvent(player, SocketEvents.TIMER_SYNC);

      client.emit(SocketEvents.START_TIMER, {
        gameType: "PAIRS",
        gameId: "g1",
        section: "A",
        directorToken: "tok",
      });

      const sync = await syncPromise;
      expect(sync).toMatchObject({
        phase: "play",
        round: 1,
        isRunning: true,
        section: "A",
        serverNow: expect.any(Number),
      });
    });
  });

  /* ----------------------------------------------------------
     JOIN / LEAVE — room membership
  ---------------------------------------------------------- */
  describe("Join and leave room mechanics", () => {
    it("client receives room events after joining, stops after leaving", async () => {
      vi.mocked(findLoginSession).mockReturnValue({
        token: "tok",
        role: "DIRECTOR",
        gameId: "g1",
      } as any);
      vi.mocked(findGameById).mockResolvedValue({
        gameId: "g1",
        gameType: "PAIRS",
      } as any);
      // CREATE_PARTICIPANT is used as the broadcast trigger for this test.
      vi.mocked(createPlayer).mockResolvedValue({ id: 1 } as any);
      vi.mocked(createPairParticipant).mockResolvedValue(undefined);
      vi.mocked(findPairs).mockResolvedValue([]);

      const { client, close, addClient } = await createFullServer();
      closeServer = close;

      const player = await addClient();
      extraClients.push(player);

      // Director joins
      await emitWithAck(client, SocketEvents.JOIN_GAME, { gameId: "g1" });

      // Player joins → should receive broadcasts
      await emitWithAck(player, SocketEvents.JOIN_GAME, { gameId: "g1" });

      const firstBroadcast = waitForEvent(
        player,
        SocketEvents.PARTICIPANTS,
        1000,
      );

      // A CREATE_PARTICIPANT (still a socket event) broadcasts PARTICIPANTS to
      // the room — used here purely as a broadcast trigger to prove membership.
      const newParticipant = {
        type: "PAIR",
        initialSeat: "A1NS",
        player1: { firstName: "P1", lastName: "L1" },
        player2: { firstName: "P2", lastName: "L2" },
      };
      await emitWithAck(client, SocketEvents.CREATE_PARTICIPANT, {
        gameId: "g1",
        newParticipant,
      });

      expect(await firstBroadcast).toMatchObject({ participants: [] });

      // Player leaves → should NOT receive further broadcasts
      await emitWithAck(player, SocketEvents.LEAVE_GAME, { gameId: "g1" });

      const secondBroadcast = waitForEvent(
        player,
        SocketEvents.PARTICIPANTS,
        500,
      ).catch(() => "timeout");

      vi.mocked(findPairs).mockResolvedValue([{ type: "PAIR" }] as any);

      await emitWithAck(client, SocketEvents.CREATE_PARTICIPANT, {
        gameId: "g1",
        newParticipant,
      });

      expect(await secondBroadcast).toBe("timeout");
    });
  });
});
