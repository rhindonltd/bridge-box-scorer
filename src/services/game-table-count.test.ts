import { describe, it, expect, vi } from "vitest";

vi.mock("@/db/games", () => ({ requireGameDb: vi.fn(async () => "db") }));
vi.mock("@/db/games/queries/find-sections", () => ({
  findSections: vi.fn(async () => [
    { section: "A", tables: 5 },
    { section: "B", tables: 2 },
  ]),
}));
vi.mock("@/db/game-index/actions/update-table-count", () => ({
  updateTableCount: vi.fn(),
}));

import { requireGameDb } from "@/db/games";
import { findSections } from "@/db/games/queries/find-sections";
import { updateTableCount } from "@/db/game-index/actions/update-table-count";
import { syncGameTableCount } from "./game-table-count";

describe("syncGameTableCount", () => {
  it("stores the total of the game's section tables on its game-index row", async () => {
    await syncGameTableCount("g1");
    expect(requireGameDb).toHaveBeenCalledWith("g1");
    expect(findSections).toHaveBeenCalledWith("db");
    expect(updateTableCount).toHaveBeenCalledWith("g1", 7);
  });
});
