import { describe, it, expect } from "vitest";
import { ximpPerBoardPlugin } from "./x-imp";
import { impBoard1 } from "@/mocks/fixtures/ximp-travellers";

describe("ximp per-board plugin", () => {
  it("has id XIMP", () => {
    expect(ximpPerBoardPlugin.id).toBe("XIMP");
  });

  it("scores a board into cross-imp lines", () => {
    const scored = ximpPerBoardPlugin.score(impBoard1);
    expect(scored[0]).toHaveProperty("nsCrossImps");
    expect(scored[0]).toHaveProperty("ewCrossImps");
  });
});
