import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/socket", () => ({ emitWithAck: vi.fn() }));
vi.mock("@/lib/director-token", () => ({
  getDirectorToken: vi.fn(() => "dir-tok"),
}));

import { emitWithAck } from "@/lib/socket";
import { getDirectorToken } from "@/lib/director-token";
import { SocketEvents } from "@/socket/socket-events";
import { drawNextSwissRound, type SwissDrawAck } from "./swiss-service";

const ack: SwissDrawAck = {
  roundNumber: 3,
  sitOutPairId: null,
  hadUnavoidableRepeat: false,
  hadStationaryConflict: false,
};

describe("drawNextSwissRound", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("emits DRAW_NEXT_SWISS_ROUND with the game, section and director token, returning the ack", async () => {
    vi.mocked(emitWithAck).mockResolvedValue(ack);

    await expect(drawNextSwissRound("g1", "A")).resolves.toEqual(ack);

    expect(emitWithAck).toHaveBeenCalledWith(
      SocketEvents.DRAW_NEXT_SWISS_ROUND,
      { gameId: "g1", section: "A", directorToken: "dir-tok" },
    );
  });

  it("passes an empty token when none is stored for the game", async () => {
    vi.mocked(getDirectorToken).mockReturnValueOnce(null);
    vi.mocked(emitWithAck).mockResolvedValue(ack);

    await drawNextSwissRound("g1", "B");

    expect(emitWithAck).toHaveBeenCalledWith(
      SocketEvents.DRAW_NEXT_SWISS_ROUND,
      { gameId: "g1", section: "B", directorToken: "" },
    );
  });

  it("rejects with the server's message when the draw fails", async () => {
    vi.mocked(emitWithAck).mockRejectedValue(
      new Error("Current round is not fully scored"),
    );

    await expect(drawNextSwissRound("g1", "A")).rejects.toThrow(
      "Current round is not fully scored",
    );
  });
});
