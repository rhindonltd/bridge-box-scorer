import { describe, it, expect, vi } from "vitest";

vi.mock("@/db/game-index/queries/is-game-finalised", () => ({
  isGameFinalised: vi.fn(),
}));

import { isGameFinalised } from "@/db/game-index/queries/is-game-finalised";
import { HandlerError } from "@/socket/handlers/handler-wrapper";
import { assertNotFinalised } from "./finalised-guard";

describe("assertNotFinalised", () => {
  it("passes for an open game", async () => {
    vi.mocked(isGameFinalised).mockResolvedValue(false);
    await expect(assertNotFinalised("g1")).resolves.toBeUndefined();
  });

  it("throws a user-facing HandlerError for a finalised game", async () => {
    vi.mocked(isGameFinalised).mockResolvedValue(true);
    await expect(assertNotFinalised("g1")).rejects.toBeInstanceOf(HandlerError);
    await expect(assertNotFinalised("g1")).rejects.toThrow(/finalised/);
  });
});
