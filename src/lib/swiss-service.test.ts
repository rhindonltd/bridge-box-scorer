import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/socket", () => ({ emitWithAck: vi.fn() }));
vi.mock("@/lib/director-token", () => ({
  getDirectorToken: vi.fn(() => "dir-tok"),
}));

import { emitWithAck } from "@/lib/socket";
import { getDirectorToken } from "@/lib/director-token";
import { SocketEvents } from "@/socket/socket-events";
import {
  previewNextSwissRound,
  commitNextSwissRound,
  type SwissPreviewAck,
} from "./swiss-service";

const previewAck: SwissPreviewAck = {
  roundNumber: 3,
  tables: 2,
  seating: [
    { tableNumber: 1, ns: 1, ew: 3 },
    { tableNumber: 2, ns: 2, ew: 4 },
  ],
  sitOutPairId: null,
  named: { tables: [], bye: null },
  advisoryInputs: {
    tables: 2,
    playedOpponents: [],
    hadBye: [],
    directionCounts: [],
    stationary: [],
  },
  standings: [{ id: 1, name: "Alice / Bob", total: 30, rank: 1, tied: false }],
  hadUnavoidableRepeat: false,
  hadStationaryConflict: false,
};

describe("previewNextSwissRound", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("emits PREVIEW_NEXT_SWISS_ROUND with the game, section and director token", async () => {
    vi.mocked(emitWithAck).mockResolvedValue(previewAck);

    await expect(previewNextSwissRound("g1", "A")).resolves.toEqual(previewAck);

    expect(emitWithAck).toHaveBeenCalledWith(
      SocketEvents.PREVIEW_NEXT_SWISS_ROUND,
      { gameId: "g1", section: "A", directorToken: "dir-tok" },
    );
  });

  it("passes an empty token when none is stored for the game", async () => {
    vi.mocked(getDirectorToken).mockReturnValueOnce(null);
    vi.mocked(emitWithAck).mockResolvedValue(previewAck);

    await previewNextSwissRound("g1", "B");

    expect(emitWithAck).toHaveBeenCalledWith(
      SocketEvents.PREVIEW_NEXT_SWISS_ROUND,
      { gameId: "g1", section: "B", directorToken: "" },
    );
  });

  it("rejects with the server's message when the preview fails", async () => {
    vi.mocked(emitWithAck).mockRejectedValue(
      new Error("Current round is not fully scored"),
    );

    await expect(previewNextSwissRound("g1", "A")).rejects.toThrow(
      "Current round is not fully scored",
    );
  });
});

describe("commitNextSwissRound", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("emits DRAW_NEXT_SWISS_ROUND with the seating, sit-out and director token", async () => {
    vi.mocked(emitWithAck).mockResolvedValue({ roundNumber: 3 });

    const seating = [
      { tableNumber: 1, ns: 1, ew: 3 },
      { tableNumber: 2, ns: 2, ew: 4 },
    ];

    await expect(
      commitNextSwissRound("g1", "A", seating, null),
    ).resolves.toEqual({ roundNumber: 3 });

    expect(emitWithAck).toHaveBeenCalledWith(SocketEvents.DRAW_NEXT_SWISS_ROUND, {
      gameId: "g1",
      section: "A",
      directorToken: "dir-tok",
      seating,
      sitOutPairId: null,
    });
  });

  it("forwards a chosen sit-out pair id", async () => {
    vi.mocked(emitWithAck).mockResolvedValue({ roundNumber: 4 });

    await commitNextSwissRound("g1", "A", [{ tableNumber: 1, ns: 1, ew: 3 }], 2);

    expect(emitWithAck).toHaveBeenCalledWith(
      SocketEvents.DRAW_NEXT_SWISS_ROUND,
      expect.objectContaining({ sitOutPairId: 2 }),
    );
  });

  it("rejects with the server's message when the commit fails", async () => {
    vi.mocked(emitWithAck).mockRejectedValue(new Error("That seating isn't valid"));

    await expect(
      commitNextSwissRound("g1", "A", [], null),
    ).rejects.toThrow("That seating isn't valid");
  });
});
