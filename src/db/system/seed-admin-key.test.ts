import { describe, it, expect } from "vitest";
import { generateAdminKey } from "./seed-admin-key";

describe("generateAdminKey", () => {
  const ALLOWED = /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]+$/;

  it("produces an 8-character key from the unambiguous alphabet", () => {
    const key = generateAdminKey();
    expect(key).toHaveLength(8);
    expect(key).toMatch(ALLOWED);
  });

  it("never includes visually ambiguous characters (0, O, 1, I, L)", () => {
    // Sample many keys so the assertion is meaningful, not a lucky draw.
    for (let i = 0; i < 1000; i++) {
      const key = generateAdminKey();
      expect(key).not.toMatch(/[0O1IL]/);
    }
  });

  it("is random — successive keys differ", () => {
    const keys = new Set<string>();
    for (let i = 0; i < 100; i++) {
      keys.add(generateAdminKey());
    }
    // With ~40 bits of entropy, 100 draws colliding would be astronomically
    // unlikely; allow no more than a single coincidental collision.
    expect(keys.size).toBeGreaterThanOrEqual(99);
  });
});
