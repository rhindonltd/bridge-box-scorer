import { describe, it, expect, vi, beforeEach } from "vitest";
vi.unmock("@/db/game-index/queries/is-game-finalised");
vi.mock("server-only", () => ({}));
vi.mock("@/db/game-index/queries/find-game-by-id", () => ({
  findGameById: vi.fn(),
}));
import { findGameById } from "@/db/game-index/queries/find-game-by-id";
const { isGameFinalised } = await vi.importActual<
  typeof import("./is-game-finalised")
>("./is-game-finalised");
describe("isGameFinalised", () => {
  beforeEach(() => vi.clearAllMocks());
  it("is true when the game has a finalisedAt timestamp", async () => {
    vi.mocked(findGameById).mockResolvedValue({
      finalisedAt: new Date(),
    } as never);
    expect(await isGameFinalised("g1")).toBe(true);
    expect(findGameById).toHaveBeenCalledWith("g1");
  });
  it("is false when the game has not been finalised", async () => {
    vi.mocked(findGameById).mockResolvedValue({ finalisedAt: null } as never);
    expect(await isGameFinalised("g1")).toBe(false);
  });
  it("is false when the game does not exist", async () => {
    vi.mocked(findGameById).mockResolvedValue(null);
    expect(await isGameFinalised("missing")).toBe(false);
  });
});
