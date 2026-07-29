import { describe, it, expect, vi, beforeEach } from "vitest";
import { createGame, selectMovement, createParticipant } from "./game-service";
import { SocketEvents } from "@/socket/socket-events";

vi.mock("@/lib/socket", () => ({
  emitWithAck: vi.fn(),
  emitEvent: vi.fn(),
}));

import { emitWithAck, emitEvent } from "@/lib/socket";

const mockEmitWithAck = vi.mocked(emitWithAck);
const mockEmitEvent = vi.mocked(emitEvent);

describe("game-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createGame", () => {
    it("emits CREATE_GAME and returns the game from the ack", async () => {
      const fakeGame = { id: "g1", name: "Test Game" };
      mockEmitWithAck.mockResolvedValue({ success: true, game: fakeGame });

      const newGame = { name: "Test Game" } as any;
      const result = await createGame(newGame);

      expect(mockEmitWithAck).toHaveBeenCalledWith(
        SocketEvents.CREATE_GAME,
        newGame,
      );
      expect(result).toEqual(fakeGame);
    });
  });

  describe("selectMovement", () => {
    it("emits SELECT_MOVEMENT with gameId, type, and id", async () => {
      await selectMovement("g1", 42, "mitchell");

      expect(mockEmitEvent).toHaveBeenCalledWith(
        SocketEvents.SELECT_MOVEMENT,
        { gameId: "g1", type: "mitchell", id: 42 },
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
        { gameId: "g1", newParticipant },
      );
      expect(result).toBe("p-key-123");
    });
  });
});
