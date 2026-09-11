import { describe, it, expect, vi, beforeEach } from "vitest";
import { createGame, selectMovement, createParticipant } from "./game-service";
import { SocketEvents } from "@/socket/socket-events";

vi.mock("@/lib/socket", () => ({
  emitWithAck: vi.fn(),
  emitEvent: vi.fn(),
}));

vi.mock("@/lib/director-token", () => ({
  setDirectorToken: vi.fn(),
  getDirectorToken: vi.fn(() => "stored-token"),
  clearDirectorToken: vi.fn(),
  isDirectorFor: vi.fn(),
}));

vi.mock("./player-token", () => ({
  setPlayerToken: vi.fn(),
}));

import { emitWithAck, emitEvent } from "@/lib/socket";
import { setDirectorToken } from "@/lib/director-token";
import { setPlayerToken } from "./player-token";

const mockEmitWithAck = vi.mocked(emitWithAck);
const mockEmitEvent = vi.mocked(emitEvent);

describe("game-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createGame", () => {
    it("POSTs /api/games, stores the director token, and returns the game", async () => {
      const fakeGame = { gameId: "g1", eventName: "Test Game" };
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          result: { game: fakeGame, directorToken: "tok-123" },
        }),
      });
      vi.stubGlobal("fetch", fetchMock);

      const newGame = { eventName: "Test Game" } as any;
      const result = await createGame(newGame);

      expect(fetchMock).toHaveBeenCalledWith(
        "/api/games",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify(newGame),
        }),
      );
      expect(result).toEqual(fakeGame);
      expect(setDirectorToken).toHaveBeenCalledWith("g1", "tok-123");

      vi.unstubAllGlobals();
    });

    it("throws the server error message when creation fails", async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ success: false, error: "Bad game" }),
      });
      vi.stubGlobal("fetch", fetchMock);

      await expect(createGame({ eventName: "x" } as any)).rejects.toThrow(
        "Bad game",
      );
      expect(setDirectorToken).not.toHaveBeenCalled();

      vi.unstubAllGlobals();
    });
  });

  describe("selectMovement", () => {
    it("emits SELECT_MOVEMENT with gameId, type, id, and directorToken", async () => {
      await selectMovement("g1", 42, "mitchell");

      expect(mockEmitEvent).toHaveBeenCalledWith(SocketEvents.SELECT_MOVEMENT, {
        gameId: "g1",
        type: "mitchell",
        id: 42,
        directorToken: "stored-token",
      });
    });
  });

  describe("selectMitchellMovement", () => {
    it("emits SELECT_MOVEMENT with gameId, type PAIRS, mitchell spec, and directorToken", async () => {
      const { selectMitchellMovement } = await import("./game-service");
      const mitchell = { tables: 5, rounds: 5, boardsPerRound: 3 };

      await selectMitchellMovement("g2", mitchell as any);

      expect(mockEmitEvent).toHaveBeenCalledWith(SocketEvents.SELECT_MOVEMENT, {
        gameId: "g2",
        type: "PAIRS",
        mitchell,
        directorToken: "stored-token",
      });
    });
  });

  describe("startGame", () => {
    it("emits START_GAME with gameId and directorToken", async () => {
      mockEmitWithAck.mockResolvedValue({ success: true });

      const { startGame } = await import("./game-service");
      await startGame("g1");

      expect(mockEmitWithAck).toHaveBeenCalledWith(SocketEvents.START_GAME, {
        gameId: "g1",
        directorToken: "stored-token",
      });
    });
  });

  describe("createParticipant", () => {
    it("emits CREATE_PARTICIPANT and stores the returned key as the player token", async () => {
      mockEmitWithAck.mockResolvedValue({ success: true, key: "p-key-123" });

      const newParticipant = { name: "Alice", initialSeat: "1NS" } as any;
      await createParticipant("g1", newParticipant);

      expect(mockEmitWithAck).toHaveBeenCalledWith(
        SocketEvents.CREATE_PARTICIPANT,
        { gameId: "g1", newParticipant },
      );
      expect(setPlayerToken).toHaveBeenCalledWith("g1", {
        startingPosition: "1NS",
        token: "p-key-123",
      });
    });
  });
});
