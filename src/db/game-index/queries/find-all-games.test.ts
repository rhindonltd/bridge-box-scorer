import { describe, it, expect, vi, beforeEach } from "vitest";

const mockRows = vi.fn();
vi.mock("@/db/game-index", () => ({
  getDb: () => ({
    select: () => ({
      from: () => ({
        where: () => ({ orderBy: () => mockRows() }),
      }),
    }),
  }),
}));
const mockStarted = vi.fn();
vi.mock("@/db/games/queries/is-game-started", () => ({
  isGameStarted: (id: string) => mockStarted(id),
}));

import { findAllGames, findNotStartedGames } from "./find-all-games";

describe("find-all-games", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRows.mockResolvedValue([
      { gameId: "running" },
      { gameId: "setup" },
      { gameId: "running2" },
    ]);
    mockStarted.mockImplementation(async (id: string) => id !== "setup");
  });

  it("findAllGames lists only started games, in order", async () => {
    expect((await findAllGames()).map((g) => g.gameId)).toEqual([
      "running",
      "running2",
    ]);
  });

  it("findNotStartedGames lists only games still being set up", async () => {
    expect((await findNotStartedGames()).map((g) => g.gameId)).toEqual([
      "setup",
    ]);
  });
});
