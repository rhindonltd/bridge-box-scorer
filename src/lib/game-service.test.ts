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

import { emitWithAck, emitEvent } from "@/lib/socket";
import { setDirectorToken, getDirectorToken } from "@/lib/director-token";

const mockEmitWithAck = vi.mocked(emitWithAck);
const mockEmitEvent = vi.mocked(emitEvent);

describe("game-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createGame", () => {
    it("emits CREATE_GAME, stores director token in localStorage, and returns the game", async () => {
      const fakeGame = { id: "g1", gameId: "g1", name: "Test Game" };
      mockEmitWithAck.mockResolvedValue({
        success: true,
        game: fakeGame,
        directorToken: "tok-123",
      });

      const newGame = { name: "Test Game" } as any;
      const result = await createGame(newGame);

      expect(mockEmitWithAck).toHaveBeenCalledWith(
        SocketEvents.CREATE_GAME,
        newGame,
      );
      expect(result).toEqual(fakeGame);

      // Should store the director token in localStorage via setDirectorToken
      expect(setDirectorToken).toHaveBeenCalledWith("g1", "tok-123");
    });
  });

  describe("selectMovement", () => {
    it("emits SELECT_MOVEMENT with gameId, type, id, and directorToken", async () => {
      await selectMovement("g1", 42, "mitchell");

      expect(mockEmitEvent).toHaveBeenCalledWith(
        SocketEvents.SELECT_MOVEMENT,
        { gameId: "g1", type: "mitchell", id: 42, directorToken: "stored-token" },
      );
    });
  });

  describe("createParticipant", () => {
    it("emits CREATE_PARTICIPANT and returns the key from the ack", async () => {
      mockEmitWithAck.mockResolvedValue({ success: true, key: "p-key-123" });

      const newParticipant = { name: "Alice" } as any;
      const result = await createParticipant("g1", newParticipant);

      expect(mockEmitWithAck).toHaveBeenCalledWith(
        SocketEvents.CREATE_PARTICIPANT,
        { gameId: "g1", newParticipant, directorToken: "stored-token" },
      );
      expect(result).toBe("p-key-123");
    });
  });
});
