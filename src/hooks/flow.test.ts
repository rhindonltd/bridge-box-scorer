import { describe, it, expect } from "vitest";
import { createFlow } from "./flow";

type TestState = { name: string; age: number };

const steps = {
  intro: {},
  details: { canEnter: (s: TestState) => s.name.length > 0 },
  confirm: { canEnter: (s: TestState) => s.age >= 18 },
};

const order = ["intro", "details", "confirm"] as const;

describe("createFlow", () => {
  const flow = createFlow(steps, order);

  describe("getDefaultStep", () => {
    it("returns the first step in order", () => {
      expect(flow.getDefaultStep()).toBe("intro");
    });
  });

  describe("canEnter", () => {
    it("returns true for a step with no canEnter guard", () => {
      expect(flow.canEnter("intro", { name: "", age: 0 })).toBe(true);
    });

    it("returns true when the canEnter guard passes", () => {
      expect(flow.canEnter("details", { name: "Alice", age: 20 })).toBe(true);
      expect(flow.canEnter("confirm", { name: "Alice", age: 18 })).toBe(true);
    });

    it("returns false when the canEnter guard fails", () => {
      expect(flow.canEnter("details", { name: "", age: 20 })).toBe(false);
      expect(flow.canEnter("confirm", { name: "Alice", age: 17 })).toBe(false);
    });
  });

  describe("structure", () => {
    it("exposes the steps and order", () => {
      expect(flow.steps).toBe(steps);
      expect(flow.order).toBe(order);
    });
  });
});
