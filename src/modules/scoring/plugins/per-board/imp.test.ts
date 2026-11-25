import { describe, it, expect } from "vitest";
import { impPerBoardPlugin } from "./imp";
import { mpBoard1 } from "@/mocks/fixtures/mp-travellers";

describe("imp per-board plugin", () => {
  it("has id IMP", () => {
    expect(impPerBoardPlugin.id).toBe("IMP");
  });

  it("scores a board into imp lines", () => {
    const scored = impPerBoardPlugin.score(mpBoard1);
    expect(scored[0]).toHaveProperty("nsImps");
    expect(scored[0]).toHaveProperty("ewImps");
  });
});
