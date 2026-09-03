import { describe, it, expect } from "vitest";

import { MovementCategories } from "./movement-category";

describe("MovementCategories", () => {
  it("lists the supported movement categories", () => {
    expect(MovementCategories).toEqual(["Pairs", "Teams"]);
  });
});
