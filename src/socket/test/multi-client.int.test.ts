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

vi.mock("@/db/games/actions/create-game", () => ({
  createGameDb: vi.fn(),
}));

vi.mock("@/db/game-index/queries/find-joinable-games", () => ({
  findJoinableGames: vi.fn(),
}));

vi.mock("@/db/game-index/queries/find-game-by-id", () => ({
  findGameById: vi.fn(),
}));

vi.mock("@/db/game-index/actions/update-table-count", () => ({
  updateTableCount: vi.fn(),
}));

vi.mock("@/db/games/shared/actions/create-player", () => ({
  createPlayer: vi.fn(),
}));

vi.mock("@/db/games/pairs/actions/create-participant", () => ({
  createParticipant: vi.fn(),
}));

vi.mock("@/db/games/pairs/queries/find-pairs", () => ({
  findPairs: vi.fn(),
}));

vi.mock("@/db/games/pairs/actions/delete-participant", () => ({
  deleteParticipant: vi.fn(),
}));

vi.mock("@/db/system/actions/create-login-session", () => ({
  createLoginSession: vi.fn(),
}));

vi.mock("@/db/system/actions/create-share-code", () => ({
  createShareCode: vi.fn(),
}));

vi.mock("@/db/system/queries/validate-share-code", () => ({
  validateAndClaimShareCode: vi.fn(),
}));

vi.mock("@/db/system/queries/find-login-session", () => ({
  findLoginSession: vi.fn(),
}));

vi.mock("@/db/movements/queries/get-movement", () => ({
  getPairMovement: vi.fn(),
  getTeamMovement: vi.fn(),
}));

vi.mock("@/db/games/pairs", () => ({
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

vi.mock("@/db/games/shared/actions/update-timer-state", () => ({
  updateTimerState: vi.fn(),
}));

vi.mock("@/timer/scheduler", () => ({
  scheduleGame: vi.fn(),
  cancelGameSchedule: vi.fn(),
}));

import { createBridgeGame } from "@/db/game-index/actions/create-game";
import { createGameDb } from "@/db/game/actions/create-game";
import { findJoinableGames } from "@/db/game-index/queries/find-joinable-games";
import { findGameById } from "@/db/game-index/queries/find-game-by-id";
import { updateTableCount } from "@/db/game-index/actions/update-table-count";
import { createPlayer } from "@/db/game/actions/create-player";
import { createParticipant as createPairParticipant } from "@/db/game/actions/create-participant";
import { findPairs } from "@/db/game/queries/find-pairs";
import { deleteParticipant as deletePairParticipant } from "@/db/game/actions/delete-participant";
import { createLoginSession } from "@/db/system/actions/create-login-session";
import { createShareCode } from "@/db/system/actions/create-share-code";
import { validateAndClaimShareCode } from "@/db/system/queries/validate-share-code";
import { findLoginSession } from "@/db/system/queries/find-login-session";
import { getEngine, createEngine } from "@/timer/game-store";
import { updateTimerState } from "@/db/game/actions/update-timer-state";

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
  describe("Game creation broadcasts", () => {
    it("all connected clients receive JOINABLE_GAMES when a game is created", async () => {
      const game = { gameId: "g1", gameType: "PAIRS", eventName: "Monday" };
      vi.mocked(createBridgeGame).mockResolvedValue(game as any);
      vi.mocked(createGameDb).mockResolvedValue(undefined);
      vi.mocked(createLoginSession).mockResolvedValue(undefined);
      vi.mocked(findJoinableGames).mockResolvedValue([game] as any);

      const { client, close, addClient } = await createFullServer();
      closeServer = close;

      const player1 = await addClient();
      const player2 = await addClient();
      extraClients.push(player1, player2);

      const p1Broadcast = waitForEvent(player1, SocketEvents.JOINABLE_GAMES);
      const p2Broadcast = waitForEvent(player2, SocketEvents.JOINABLE_GAMES);

      await emitWithAck(client, SocketEvents.CREATE_GAME, { name: "Monday" });

      expect(await p1Broadcast).toEqual({ joinableGames: [game] });
      expect(await p2Broadcast).toEqual({ joinableGames: [game] });
    });
  });

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
        { type: "PAIR", initialSeat: "1NS" },
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
              initialSeat: "1NS",
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
  describe("Table count update broadcasts", () => {
    it("players in room see GAME_UPDATED when director changes table count", async () => {
      const game = { gameId: "g1", gameType: "PAIRS", tables: 4 };
      const updatedGame = { ...game, tables: 5 };

      vi.mocked(findLoginSession).mockReturnValue({
        token: "tok",
        role: "DIRECTOR",
        gameId: "g1",
      } as any);
      vi.mocked(findGameById)
        .mockResolvedValueOnce(game as any)
        .mockResolvedValueOnce(updatedGame as any);
      vi.mocked(updateTableCount).mockResolvedValue(undefined);
      vi.mocked(findPairs).mockResolvedValue([]);

      const { client, close, addClient } = await createFullServer();
      closeServer = close;

      const player = await addClient();
      extraClients.push(player);

      // Both join the game room
      await emitWithAck(client, SocketEvents.JOIN_GAME, { gameId: "g1" });
      await emitWithAck(player, SocketEvents.JOIN_GAME, { gameId: "g1" });

      const broadcast = waitForEvent(player, SocketEvents.GAME_UPDATED);

      await emitWithAck(client, SocketEvents.UPDATE_TABLES, {
        gameId: "g1",
        tables: 5,
        directorToken: "tok",
      });

      const received = await broadcast;
      expect(received).toMatchObject({ game: { tables: 5 } });
    });
  });

  /* ----------------------------------------------------------
     EVICTION — player sees updated participant list
  ---------------------------------------------------------- */
  describe("Eviction broadcasts", () => {
    it("all players in room see updated PARTICIPANTS after eviction", async () => {
      vi.mocked(findLoginSession).mockReturnValue({
        token: "tok",
        role: "DIRECTOR",
        gameId: "g1",
      } as any);
      vi.mocked(findGameById).mockResolvedValue({
        gameId: "g1",
        gameType: "PAIRS",
      } as any);
      vi.mocked(deletePairParticipant).mockResolvedValue(undefined);
      vi.mocked(findPairs).mockResolvedValue([]); // empty after eviction

      const { client, close, addClient } = await createFullServer();
      closeServer = close;

      const player = await addClient();
      extraClients.push(player);

      await emitWithAck(client, SocketEvents.JOIN_GAME, { gameId: "g1" });
      await emitWithAck(player, SocketEvents.JOIN_GAME, { gameId: "g1" });

      const broadcast = waitForEvent(player, SocketEvents.PARTICIPANTS);

      await emitWithAck(client, SocketEvents.EVICT_PARTICIPANT, {
        gameId: "g1",
        seat: "1NS",
        directorToken: "tok",
      });

      const received = await broadcast;
      expect(received).toEqual({ participants: [] });
    });
  });

  /* ----------------------------------------------------------
     DIRECTOR HANDOFF — full flow across two clients
  ---------------------------------------------------------- */
  describe("Director handoff flow", () => {
    it("director generates code, second user claims it and becomes director", async () => {
      vi.mocked(findLoginSession).mockReturnValue({
        token: "dir-tok",
        role: "DIRECTOR",
        gameId: "g1",
      } as any);
      vi.mocked(createShareCode).mockResolvedValue("X9K4MP");
      vi.mocked(validateAndClaimShareCode).mockResolvedValue({
        valid: true,
        gameId: "g1",
      });
      vi.mocked(createLoginSession).mockResolvedValue(undefined);

      const { client, close, addClient } = await createFullServer();
      closeServer = close;

      // Step 1: Director generates code
      const genResult = await emitWithAck<{ success: boolean; code?: string }>(
        client,
        SocketEvents.GENERATE_SHARE_CODE,
        { gameId: "g1", directorToken: "dir-tok" },
      );
      expect(genResult).toEqual({ success: true, code: "X9K4MP" });

      // Step 2: Second user connects and claims the code
      const newDirector = await addClient();
      extraClients.push(newDirector);

      const claimResult = await emitWithAck<{
        success: boolean;
        directorToken?: string;
        gameId?: string;
      }>(newDirector, SocketEvents.CLAIM_DIRECTOR_CODE, { code: "X9K4MP" });

      expect(claimResult).toMatchObject({
        success: true,
        gameId: "g1",
        directorToken: expect.any(String),
      });

      // Step 3: Verify the new director can now perform director actions
      // (Mock findLoginSession to accept the new token)
      vi.mocked(findLoginSession).mockReturnValue({
        token: claimResult.directorToken!,
        role: "DIRECTOR",
        gameId: "g1",
      } as any);
      vi.mocked(findGameById)
        .mockResolvedValueOnce({
          gameId: "g1",
          gameType: "PAIRS",
          tables: 3,
        } as any)
        .mockResolvedValueOnce({
          gameId: "g1",
          gameType: "PAIRS",
          tables: 4,
        } as any);
      vi.mocked(updateTableCount).mockResolvedValue(undefined);
      vi.mocked(findPairs).mockResolvedValue([]);

      await emitWithAck(newDirector, SocketEvents.JOIN_GAME, { gameId: "g1" });

      const updateResult = await emitWithAck<{ success: boolean }>(
        newDirector,
        SocketEvents.UPDATE_TABLES,
        { gameId: "g1", tables: 4, directorToken: claimResult.directorToken },
      );

      expect(updateResult).toMatchObject({ success: true });
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

      const syncPromise = waitForEvent(player, SocketEvents.TIMER_SYNC);

      client.emit(SocketEvents.START_TIMER, {
        gameType: "PAIRS",
        gameId: "g1",
        directorToken: "tok",
      });

      const sync = await syncPromise;
      expect(sync).toMatchObject({
        phase: "play",
        round: 1,
        isRunning: true,
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
      vi.mocked(deletePairParticipant).mockResolvedValue(undefined);
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

      await emitWithAck(client, SocketEvents.EVICT_PARTICIPANT, {
        gameId: "g1",
        seat: "1NS",
        directorToken: "tok",
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

      await emitWithAck(client, SocketEvents.EVICT_PARTICIPANT, {
        gameId: "g1",
        seat: "2NS",
        directorToken: "tok",
      });

      expect(await secondBroadcast).toBe("timeout");
    });
  });
});
