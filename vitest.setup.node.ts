import { vi } from "vitest";

// Route-handler tests (unit-node project) exercise director routes that, via
// withDirectorEditRoute, ask the game-index DB whether the game is finalised.
// Default every game to "not finalised"; tests of the finalised behaviour
// itself provide their own local mock, which overrides this.
vi.mock("@/db/game-index/queries/is-game-finalised", () => ({
  isGameFinalised: vi.fn().mockResolvedValue(false),
}));
