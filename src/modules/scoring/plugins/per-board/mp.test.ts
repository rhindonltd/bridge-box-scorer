import { describe, it, expect } from "vitest";
import { mpPerBoardPlugin } from "./mp";
import { mpBoard1 } from "@/mocks/fixtures/mp-travellers";

describe("mp per-board plugin", () => {
  it("has id MP", () => {
    expect(mpPerBoardPlugin.id).toBe("MP");
  });

  it("scores a board into matchpoint lines", () => {
    const scored = mpPerBoardPlugin.score(mpBoard1);
    expect(scored.length).toBeGreaterThan(0);
    expect(scored[0]).toHaveProperty("nsMatchPoints");
    expect(scored[0]).toHaveProperty("ewMatchPoints");
  });
});
