import { describe, it, expect, vi } from "vitest";

vi.mock("@/db/games", () => ({ requireGameDb: vi.fn(async () => "db") }));
vi.mock("@/db/games/queries/find-sections", () => ({
  findSections: vi.fn(async () => [
    {
      section: "A",
      selectedMovement: JSON.stringify({
        source: "MITCHELL",
        mitchell: { tables: 4, rounds: 4, boardsPerRound: 3 },
      }),
    },
    { section: "B", selectedMovement: null },
  ]),
}));
vi.mock("@/db/games/actions/set-section-movement", () => ({
  setSectionMovement: vi.fn(),
}));

import { setSectionMovement } from "@/db/games/actions/set-section-movement";
import { clearSectionMovements } from "./clear-section-movements";

describe("clearSectionMovements", () => {
  it("clears each section that has a movement and reports what it had", async () => {
    await expect(clearSectionMovements("g1")).resolves.toEqual([
      {
        section: "A",
        previous: {
          source: "MITCHELL",
          mitchell: { tables: 4, rounds: 4, boardsPerRound: 3 },
        },
      },
    ]);
    expect(setSectionMovement).toHaveBeenCalledTimes(1);
    expect(setSectionMovement).toHaveBeenCalledWith("g1", "A", null);
  });
});
