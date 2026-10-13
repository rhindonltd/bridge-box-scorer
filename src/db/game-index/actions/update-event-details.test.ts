import { describe, it, expect, vi, beforeEach } from "vitest";

const setSpy = vi.fn();
const whereSpy = vi.fn();

vi.mock("@/db/game-index", () => ({
  getDb: () => ({
    update: () => ({
      set: (values: unknown) => {
        setSpy(values);
        return { where: whereSpy };
      },
    }),
  }),
}));

vi.mock("@/db/game-index/queries/find-game-by-id", () => ({
  findGameById: vi.fn(),
}));

import { updateEventDetails } from "./update-event-details";
import { findGameById } from "@/db/game-index/queries/find-game-by-id";

const baseGame = {
  gameId: "g1",
  eventName: "Monday Pairs",
  director: "Jane",
  gameType: "PAIRS",
  eventFormat: "STANDARD",
  scoringType: "MP",
  leadCardRequired: true,
  handEntryEnabled: false,
  selectedMovement: '{"source":"MITCHELL"}',
} as never;

describe("updateEventDetails", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(findGameById).mockResolvedValue(baseGame);
  });

  it("applies only the provided fields and leaves the movement when nothing structural changes", async () => {
    await updateEventDetails("g1", {
      eventName: "Tuesday Pairs",
      leadCardRequired: false,
    });

    const payload = setSpy.mock.calls[0][0];
    expect(payload).toEqual({
      eventName: "Tuesday Pairs",
      leadCardRequired: false,
    });
    // No structural change -> selectedMovement is NOT cleared.
    expect(payload).not.toHaveProperty("selectedMovement");
  });

  it("clears the selected movement when the game type changes", async () => {
    await updateEventDetails("g1", { gameType: "TEAMS" });

    const payload = setSpy.mock.calls[0][0];
    expect(payload).toMatchObject({ gameType: "TEAMS", selectedMovement: null });
  });

  it("clears the selected movement when the format changes (Swiss)", async () => {
    await updateEventDetails("g1", { eventFormat: "SWISS" });
    expect(setSpy.mock.calls[0][0]).toMatchObject({
      eventFormat: "SWISS",
      selectedMovement: null,
    });
  });

  it("clears the selected movement when the scoring type changes", async () => {
    await updateEventDetails("g1", { scoringType: "XIMP" });
    expect(setSpy.mock.calls[0][0]).toMatchObject({
      scoringType: "XIMP",
      selectedMovement: null,
    });
  });

  it("does not clear the movement when a structural field is set to its current value", async () => {
    await updateEventDetails("g1", {
      gameType: "PAIRS",
      scoringType: "MP",
      eventName: "Renamed",
    });
    const payload = setSpy.mock.calls[0][0];
    expect(payload).not.toHaveProperty("selectedMovement");
    expect(payload).toMatchObject({ eventName: "Renamed" });
  });
});
