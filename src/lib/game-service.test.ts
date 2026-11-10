import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
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
  updateCombinedRanking,
  setSubstitutionOptions,
  withdrawPair,
  setAbsenceTreatment,
  withdrawPairAsDirector,
  updateEventDetails,
  verifySeatHeld,
  watchSeat,
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
        {
          gameId: "g1",
          seat: "A1NS",
          token: "seat-tok",
          kind: "CHANGE_DEVICE",
        },
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

    it("sends the director token for a REINSTATE code (minted by the director)", async () => {
      mockEmitWithAck.mockResolvedValue({ code: "BACK01" });

      await generateSeatTransferCode("g1", "A1NS", "REINSTATE");

      // The withdrawn pair's seat token is dead, so the director vouches for the
      // mint with the director credential instead.
      expect(mockEmitWithAck).toHaveBeenCalledWith(
        SocketEvents.CREATE_SEAT_TRANSFER,
        expect.objectContaining({
          gameId: "g1",
          seat: "A1NS",
          kind: "REINSTATE",
          directorToken: "stored-token",
        }),
      );
    });

    it("does not send the director token for player-minted kinds", async () => {
      mockEmitWithAck.mockResolvedValue({ code: "ABC234" });

      await generateSeatTransferCode("g1", "A1NS", "HANDOVER");

      const payload = mockEmitWithAck.mock.calls[0][1] as Record<
        string,
        unknown
      >;
      expect(payload).not.toHaveProperty("directorToken");
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

describe("game-service director HTTP calls", () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    vi.clearAllMocks();
    fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const cases: {
    name: string;
    call: () => Promise<unknown>;
    url: string;
    method: string;
    body: unknown;
    defaultMessage: string;
  }[] = [
    {
      name: "updateCombinedRanking",
      call: () => updateCombinedRanking("g1", true),
      url: "/api/games/g1",
      method: "PATCH",
      body: { combinedRanking: true },
      defaultMessage: "Failed to update setting",
    },
    {
      name: "setSubstitutionOptions",
      call: () =>
        setSubstitutionOptions("g1", "A1NS", {
          split: true,
          eligibility: [{ id: 1, eligible: false }],
        }),
      url: "/api/games/g1/substitutions",
      method: "PATCH",
      body: {
        seat: "A1NS",
        split: true,
        eligibility: [{ id: 1, eligible: false }],
      },
      defaultMessage: "Failed to set substitution options",
    },
    {
      name: "setAbsenceTreatment",
      call: () => setAbsenceTreatment("g1", "A1NS", "AVERAGE"),
      url: "/api/games/g1/absences",
      method: "PATCH",
      body: { seat: "A1NS", treatment: "AVERAGE" },
      defaultMessage: "Failed to save",
    },
    {
      name: "withdrawPairAsDirector",
      call: () => withdrawPairAsDirector("g1", "A1NS"),
      url: "/api/games/g1/pairs",
      method: "PATCH",
      body: { seat: "A1NS", action: "withdraw" },
      defaultMessage: "Failed to withdraw the pair",
    },
    {
      name: "updateEventDetails",
      call: () => updateEventDetails("g1", { eventName: "New" }),
      url: "/api/games/g1",
      method: "PATCH",
      body: { eventName: "New" },
      defaultMessage: "Failed to update event details",
    },
  ];

  for (const c of cases) {
    describe(c.name, () => {
      it("sends the request with the director token", async () => {
        await c.call();
        const [url, init] = fetchMock.mock.calls[0];
        expect(url).toBe(c.url);
        expect(init.method).toBe(c.method);
        expect(init.headers["x-director-token"]).toBe("stored-token");
        expect(JSON.parse(init.body)).toEqual(c.body);
      });

      it("sends an empty token when none is stored", async () => {
        vi.mocked(getDirectorToken).mockReturnValueOnce(null as any);
        await c.call();
        expect(fetchMock.mock.calls[0][1].headers["x-director-token"]).toBe("");
      });

      it("throws the server's error message", async () => {
        fetchMock.mockResolvedValue({
          ok: false,
          json: async () => ({ error: "server says no" }),
        });
        await expect(c.call()).rejects.toThrow("server says no");
      });

      it("falls back to a default message", async () => {
        fetchMock.mockResolvedValue({
          ok: false,
          json: async () => {
            throw new Error("not json");
          },
        });
        await expect(c.call()).rejects.toThrow(c.defaultMessage);
      });
    });
  }

  it("setSubstitutionOptions includes mainOccupancyId when given", async () => {
    await setSubstitutionOptions("g1", "A1NS", {
      split: false,
      eligibility: [],
      mainOccupancyId: 7,
    });
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({
      mainOccupancyId: 7,
    });
  });
});

describe("game-service socket / token helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("withdrawPair emits WITHDRAW_PAIR and clears the local token", async () => {
    mockEmitWithAck.mockResolvedValue(null);
    await withdrawPair("g1", "A1NS");
    expect(mockEmitWithAck).toHaveBeenCalledWith(SocketEvents.WITHDRAW_PAIR, {
      gameId: "g1",
      seat: "A1NS",
      token: "seat-tok",
    });
    expect(clearPlayerToken).toHaveBeenCalledWith("g1");
  });

  it("withdrawPair sends an empty token when none is stored", async () => {
    vi.mocked(getPlayerToken).mockReturnValueOnce(null as any);
    mockEmitWithAck.mockResolvedValue(null);
    await withdrawPair("g1", "A1NS");
    expect(mockEmitWithAck).toHaveBeenCalledWith(
      SocketEvents.WITHDRAW_PAIR,
      expect.objectContaining({ token: "" }),
    );
  });

  it("selectMovement / selectMitchellMovement still emit", async () => {
    await selectMovement("g1", 3, "PAIRS");
    expect(mockEmitEvent).toHaveBeenCalled();
  });

  describe("verifySeatHeld", () => {
    it("is false without a stored token", async () => {
      vi.mocked(getPlayerToken).mockReturnValueOnce(null as any);
      await expect(verifySeatHeld("g1", "A1NS")).resolves.toBe(false);
    });

    it("is true when the server confirms the seat is held", async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ result: { held: true } }),
      });
      vi.stubGlobal("fetch", fetchMock);
      await expect(verifySeatHeld("g1", "A 1")).resolves.toBe(true);
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/games/g1/participants/A%201/verify",
        { headers: { "x-player-token": "seat-tok" } },
      );
    });

    it("is false when the server says not held", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({ result: { held: false } }),
        }),
      );
      await expect(verifySeatHeld("g1", "A1NS")).resolves.toBe(false);
    });

    it("is false when the body has no result", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({ ok: true, json: async () => null }),
      );
      await expect(verifySeatHeld("g1", "A1NS")).resolves.toBe(false);
    });

    it("is false on a non-ok response", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
      await expect(verifySeatHeld("g1", "A1NS")).resolves.toBe(false);
    });

    it("is false when the request throws", async () => {
      vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
      await expect(verifySeatHeld("g1", "A1NS")).resolves.toBe(false);
    });
  });

  describe("watchSeat", () => {
    it("is unknown without a stored token", async () => {
      vi.mocked(getPlayerToken).mockReturnValueOnce(null as any);
      await expect(watchSeat("g1", "A1NS")).resolves.toBe("unknown");
      expect(mockEmitWithAck).not.toHaveBeenCalled();
    });

    it("returns the status from the server", async () => {
      mockEmitWithAck.mockResolvedValue({ status: "moved" });
      await expect(watchSeat("g1", "A1NS")).resolves.toBe("moved");
      expect(mockEmitWithAck).toHaveBeenCalledWith(SocketEvents.WATCH_SEAT, {
        gameId: "g1",
        seat: "A1NS",
        token: "seat-tok",
      });
    });

    it("is unknown when the request fails", async () => {
      mockEmitWithAck.mockRejectedValue(new Error("down"));
      await expect(watchSeat("g1", "A1NS")).resolves.toBe("unknown");
    });
  });

  it("generateSeatTransferCode by director sends no seat token but the director token", async () => {
    mockEmitWithAck.mockResolvedValue({ code: "C" });
    await generateSeatTransferCode("g1", "A1NS", "CHANGE_DEVICE", true);
    expect(mockEmitWithAck).toHaveBeenCalledWith(
      SocketEvents.CREATE_SEAT_TRANSFER,
      expect.objectContaining({ token: "", directorToken: "stored-token" }),
    );
  });

  it("generateSeatTransferCode sends an empty director token when none is stored", async () => {
    vi.mocked(getDirectorToken).mockReturnValueOnce(null as any);
    mockEmitWithAck.mockResolvedValue({ code: "C" });
    await generateSeatTransferCode("g1", "A1NS", "REINSTATE");
    expect(mockEmitWithAck).toHaveBeenCalledWith(
      SocketEvents.CREATE_SEAT_TRANSFER,
      expect.objectContaining({ directorToken: "" }),
    );
  });

  it("handoverSameDevice sends an empty token when none is stored", async () => {
    vi.mocked(getPlayerToken).mockReturnValueOnce(null as any);
    mockEmitWithAck.mockResolvedValue({ key: "k" });
    const p = { firstName: "A", lastName: "B" };
    await handoverSameDevice("g1", "A1NS", { player1: p, player2: p });
    expect(mockEmitWithAck).toHaveBeenCalledWith(
      SocketEvents.HANDOVER_SAME_DEVICE,
      expect.objectContaining({ token: "" }),
    );
  });
});
