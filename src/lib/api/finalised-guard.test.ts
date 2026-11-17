import { describe, it, expect, vi } from "vitest";

vi.mock("@/db/game-index/queries/is-game-finalised", () => ({
  isGameFinalised: vi.fn(),
}));

import { isGameFinalised } from "@/db/game-index/queries/is-game-finalised";
import { finalisedGuard, requireFinalisedGuard } from "./finalised-guard";
import {
  FINALISED_MESSAGE,
  NOT_FINALISED_MESSAGE,
} from "@/lib/finalised-message";

describe("finalisedGuard", () => {
  it("returns null for an open game", async () => {
    vi.mocked(isGameFinalised).mockResolvedValue(false);
    expect(await finalisedGuard("g1")).toBeNull();
  });

  it("returns a 409 response for a finalised game", async () => {
    vi.mocked(isGameFinalised).mockResolvedValue(true);
    const res = await finalisedGuard("g1");
    expect(res?.status).toBe(409);
    await expect(res?.json()).resolves.toEqual({
      success: false,
      error: FINALISED_MESSAGE,
    });
  });
});

describe("requireFinalisedGuard", () => {
  it("returns null once the game is finalised", async () => {
    vi.mocked(isGameFinalised).mockResolvedValue(true);
    expect(await requireFinalisedGuard("g1")).toBeNull();
  });

  it("returns a 403 response before the game is finalised", async () => {
    vi.mocked(isGameFinalised).mockResolvedValue(false);
    const res = await requireFinalisedGuard("g1");
    expect(res?.status).toBe(403);
    await expect(res?.json()).resolves.toEqual({
      success: false,
      error: NOT_FINALISED_MESSAGE,
    });
  });
});
