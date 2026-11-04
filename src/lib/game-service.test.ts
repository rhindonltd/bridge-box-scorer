import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createGame,
  selectMovement,
  selectMitchellMovement,
  createParticipant,
  leaveTable,
  generateSeatTransferCode,
  claimSeatTransfer,
  inspectSeatTransfer,
  handoverSameDevice,
  generateShareCode,
} from "./game-service";
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
  getPlayerToken: vi.fn(() => ({
    startingPosition: "A1NS",
    token: "seat-tok",
  })),
  clearPlayerToken: vi.fn(),
}));

import { emitWithAck, emitEvent } from "@/lib/socket";
import { setDirectorToken, getDirectorToken } from "@/lib/director-token";
import {
  setPlayerToken,
  getPlayerToken,
  clearPlayerToken,
} from "./player-token";

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
    it("POSTs /api/games/[id]/start with the director-token header", async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, result: {} }),
      });
      vi.stubGlobal("fetch", fetchMock);

      const { startGame } = await import("./game-service");
      await startGame("g1");

      expect(fetchMock).toHaveBeenCalledWith(
        "/api/games/g1/start",
        expect.objectContaining({
          method: "POST",
          headers: { "x-director-token": "stored-token" },
        }),
      );

      vi.unstubAllGlobals();
    });

    it("throws the server error message when the game cannot start", async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ success: false, error: "Game cannot be started" }),
      });
      vi.stubGlobal("fetch", fetchMock);

      const { startGame } = await import("./game-service");
      await expect(startGame("g1")).rejects.toThrow("Game cannot be started");

      vi.unstubAllGlobals();
    });
  });

  describe("claimDirectorCode", () => {
    it("POSTs the code, stores the token, and returns the gameId", async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          result: { directorToken: "new-tok", gameId: "g9" },
        }),
      });
      vi.stubGlobal("fetch", fetchMock);

      const { claimDirectorCode } = await import("./game-service");
      const gameId = await claimDirectorCode("ABC123");

      expect(fetchMock).toHaveBeenCalledWith(
        "/api/director-codes/claim",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ code: "ABC123" }),
        }),
      );
      expect(gameId).toBe("g9");
      expect(setDirectorToken).toHaveBeenCalledWith("g9", "new-tok");

      vi.unstubAllGlobals();
    });

    it("throws the server error and stores nothing when the claim fails", async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ success: false, error: "Code has expired" }),
      });
      vi.stubGlobal("fetch", fetchMock);

      const { claimDirectorCode } = await import("./game-service");
      await expect(claimDirectorCode("OLDCOD")).rejects.toThrow(
        "Code has expired",
      );
      expect(setDirectorToken).not.toHaveBeenCalled();

      vi.unstubAllGlobals();
    });
  });

  describe("selectMitchellMovement", () => {
    it("emits SELECT_MOVEMENT with the mitchell spec and director token", async () => {
      const spec = { tables: 5, rounds: 9, boardsPerRound: 2 } as never;
      await selectMitchellMovement("g1", spec);

      expect(mockEmitEvent).toHaveBeenCalledWith(SocketEvents.SELECT_MOVEMENT, {
        gameId: "g1",
        type: "PAIRS",
        mitchell: spec,
        directorToken: "stored-token",
      });
    });
  });

  describe("generateShareCode", () => {
    it("POSTs with the director-token header and returns the code", async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, result: { code: "SHARE1" } }),
      });
      vi.stubGlobal("fetch", fetchMock);

      await expect(generateShareCode("g1")).resolves.toBe("SHARE1");
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/games/g1/share-code",
        expect.objectContaining({
          method: "POST",
          headers: { "x-director-token": "stored-token" },
        }),
      );
      vi.unstubAllGlobals();
    });

    it("throws the server error message when generation fails", async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ error: "Not the director" }),
      });
      vi.stubGlobal("fetch", fetchMock);

      await expect(generateShareCode("g1")).rejects.toThrow("Not the director");
      vi.unstubAllGlobals();
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

  describe("leaveTable", () => {
    it("emits LEAVE_TABLE with the seat token and clears the local token", async () => {
      mockEmitWithAck.mockResolvedValue({ success: true });

      await leaveTable("g1", "A1NS");

      expect(getPlayerToken).toHaveBeenCalledWith("g1");
      expect(mockEmitWithAck).toHaveBeenCalledWith(SocketEvents.LEAVE_TABLE, {
        gameId: "g1",
        seat: "A1NS",
        token: "seat-tok",
      });
      expect(clearPlayerToken).toHaveBeenCalledWith("g1");
    });

    it("does not clear the token when the server rejects", async () => {
      mockEmitWithAck.mockRejectedValue(new Error("already started"));

      await expect(leaveTable("g1", "A1NS")).rejects.toThrow("already started");
      expect(clearPlayerToken).not.toHaveBeenCalled();
    });
  });

  describe("generateSeatTransferCode", () => {
    it("emits CREATE_SEAT_TRANSFER with the seat token and a default CHANGE_DEVICE kind", async () => {
      mockEmitWithAck.mockResolvedValue({ code: "ABC234" });

      const code = await generateSeatTransferCode("g1", "A1NS");

      expect(mockEmitWithAck).toHaveBeenCalledWith(
        SocketEvents.CREATE_SEAT_TRANSFER,
        { gameId: "g1", seat: "A1NS", token: "seat-tok", kind: "CHANGE_DEVICE" },
      );
      expect(code).toBe("ABC234");
    });

    it("emits a HANDOVER kind when requested", async () => {
      mockEmitWithAck.mockResolvedValue({ code: "HAND01" });

      await generateSeatTransferCode("g1", "A1NS", "HANDOVER");

      expect(mockEmitWithAck).toHaveBeenCalledWith(
        SocketEvents.CREATE_SEAT_TRANSFER,
        { gameId: "g1", seat: "A1NS", token: "seat-tok", kind: "HANDOVER" },
      );
    });
  });

  describe("claimSeatTransfer", () => {
    it("emits CLAIM_SEAT_TRANSFER, stores the rotated token, returns game + seat", async () => {
      mockEmitWithAck.mockResolvedValue({
        gameId: "g9",
        seat: "B2EW",
        token: "rotated-tok",
      });

      const result = await claimSeatTransfer("ABC234");

      expect(mockEmitWithAck).toHaveBeenCalledWith(
        SocketEvents.CLAIM_SEAT_TRANSFER,
        { code: "ABC234" },
      );
      expect(setPlayerToken).toHaveBeenCalledWith("g9", {
        startingPosition: "B2EW",
        token: "rotated-tok",
      });
      expect(result).toEqual({ gameId: "g9", seat: "B2EW" });
    });

    it("threads the arriving pair through for a handover claim", async () => {
      mockEmitWithAck.mockResolvedValue({
        gameId: "g9",
        seat: "B2EW",
        token: "handover-tok",
        isHandover: true,
      });
      const realPair = {
        player1: { firstName: "Real", lastName: "One" },
        player2: { firstName: "Real", lastName: "Two" },
      };

      await claimSeatTransfer("HAND01", realPair);

      expect(mockEmitWithAck).toHaveBeenCalledWith(
        SocketEvents.CLAIM_SEAT_TRANSFER,
        { code: "HAND01", realPair },
      );
      expect(setPlayerToken).toHaveBeenCalledWith("g9", {
        startingPosition: "B2EW",
        token: "handover-tok",
      });
    });

    it("throws the server error and stores nothing when the code is invalid", async () => {
      mockEmitWithAck.mockRejectedValue(new Error("Invalid code"));

      await expect(claimSeatTransfer("ZZZZZZ")).rejects.toThrow("Invalid code");
      expect(setPlayerToken).not.toHaveBeenCalled();
    });
  });

  describe("inspectSeatTransfer", () => {
    it("emits INSPECT_SEAT_TRANSFER and returns the handover flag", async () => {
      mockEmitWithAck.mockResolvedValue({
        gameId: "g1",
        seat: "A1NS",
        isHandover: true,
      });

      const result = await inspectSeatTransfer("ABC234");

      expect(mockEmitWithAck).toHaveBeenCalledWith(
        SocketEvents.INSPECT_SEAT_TRANSFER,
        { code: "ABC234" },
      );
      expect(result).toEqual({ gameId: "g1", seat: "A1NS", isHandover: true });
      // Inspect never stores a token.
      expect(setPlayerToken).not.toHaveBeenCalled();
    });
  });

  describe("handoverSameDevice", () => {
    const realPair = {
      player1: { firstName: "Real", lastName: "One" },
      player2: { firstName: "Real", lastName: "Two" },
    };

    it("emits HANDOVER_SAME_DEVICE with the seat token and stores the new key", async () => {
      mockEmitWithAck.mockResolvedValue({ key: "new-secret" });

      await handoverSameDevice("g1", "A1NS", realPair);

      expect(mockEmitWithAck).toHaveBeenCalledWith(
        SocketEvents.HANDOVER_SAME_DEVICE,
        { gameId: "g1", seat: "A1NS", token: "seat-tok", realPair },
      );
      // THIS device keeps the seat under the real pair's new secret.
      expect(setPlayerToken).toHaveBeenCalledWith("g1", {
        startingPosition: "A1NS",
        token: "new-secret",
      });
    });

    it("throws the server error and stores nothing on failure", async () => {
      mockEmitWithAck.mockRejectedValue(
        new Error("This seat has already had a handover."),
      );

      await expect(handoverSameDevice("g1", "A1NS", realPair)).rejects.toThrow(
        "already had a handover",
      );
      expect(setPlayerToken).not.toHaveBeenCalled();
    });
  });

  // These exercise the defensive fallback branches: the `.catch(() => null)`
  // arrow when the error body isn't JSON, the `?? "..."` default messages, and
  // the empty-token fallbacks when no token is stored on the device.
  describe("fallback branches", () => {
    it("createGame falls back to the default message when the error body is not JSON", async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: false,
        json: async () => {
          throw new Error("not json");
        },
      });
      vi.stubGlobal("fetch", fetchMock);

      await expect(createGame({ eventName: "x" } as any)).rejects.toThrow(
        "Failed to create game",
      );

      vi.unstubAllGlobals();
    });

    it("startGame sends an empty token header and uses the default error message", async () => {
      vi.mocked(getDirectorToken).mockReturnValueOnce(null);
      const fetchMock = vi.fn().mockResolvedValue({
        ok: false,
        json: async () => {
          throw new Error("not json");
        },
      });
      vi.stubGlobal("fetch", fetchMock);

      const { startGame } = await import("./game-service");
      await expect(startGame("g1")).rejects.toThrow("Failed to start game");

      expect(fetchMock).toHaveBeenCalledWith(
        "/api/games/g1/start",
        expect.objectContaining({
          headers: { "x-director-token": "" },
        }),
      );

      vi.unstubAllGlobals();
    });

    it("claimDirectorCode uses the default error message when the body is not JSON", async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: false,
        json: async () => {
          throw new Error("not json");
        },
      });
      vi.stubGlobal("fetch", fetchMock);

      const { claimDirectorCode } = await import("./game-service");
      await expect(claimDirectorCode("ABC123")).rejects.toThrow(
        "Failed to claim code",
      );

      vi.unstubAllGlobals();
    });

    it("generateShareCode sends an empty token header and uses the default error message", async () => {
      vi.mocked(getDirectorToken).mockReturnValueOnce(null);
      const fetchMock = vi.fn().mockResolvedValue({
        ok: false,
        json: async () => {
          throw new Error("not json");
        },
      });
      vi.stubGlobal("fetch", fetchMock);

      await expect(generateShareCode("g1")).rejects.toThrow(
        "Failed to generate code",
      );
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/games/g1/share-code",
        expect.objectContaining({ headers: { "x-director-token": "" } }),
      );

      vi.unstubAllGlobals();
    });

    it("leaveTable sends an empty token when no player token is stored", async () => {
      vi.mocked(getPlayerToken).mockReturnValueOnce(null);
      mockEmitWithAck.mockResolvedValue({ success: true });

      await leaveTable("g1", "A1NS");

      expect(mockEmitWithAck).toHaveBeenCalledWith(SocketEvents.LEAVE_TABLE, {
        gameId: "g1",
        seat: "A1NS",
        token: "",
      });
    });

    it("generateSeatTransferCode sends an empty token when no player token is stored", async () => {
      vi.mocked(getPlayerToken).mockReturnValueOnce(null);
      mockEmitWithAck.mockResolvedValue({ code: "Z" });

      await generateSeatTransferCode("g1", "A1NS");

      expect(mockEmitWithAck).toHaveBeenCalledWith(
        SocketEvents.CREATE_SEAT_TRANSFER,
        { gameId: "g1", seat: "A1NS", token: "", kind: "CHANGE_DEVICE" },
      );
    });
  });
});
