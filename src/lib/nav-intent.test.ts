import { describe, it, expect } from "vitest";
import { clearNavIntent, setNavIntent, takeNavIntent } from "./nav-intent";

describe("nav-intent", () => {
  it("returns the recorded destination once", () => {
    setNavIntent("/");
    expect(takeNavIntent()).toBe("/");
    expect(takeNavIntent()).toBeNull();
  });

  it("can be cleared", () => {
    setNavIntent("/");
    clearNavIntent();
    expect(takeNavIntent()).toBeNull();
  });
});
