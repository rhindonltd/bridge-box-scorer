// @vitest-environment node
import { describe, it, expect } from "vitest";
import { createKeyedTokenStore } from "./token-store";

/**
 * Client components also render on the server, where `localStorage` does not
 * exist. Reading a token there must report "none" rather than throw — a throw
 * crashed the server render of the join page (`localStorage is not defined`).
 */
describe("createKeyedTokenStore without localStorage (server render)", () => {
  const store = createKeyedTokenStore<string>(
    "player:",
    (v) => v,
    (raw) => raw,
  );

  it("has no localStorage in this environment", () => {
    expect(typeof localStorage).toBe("undefined");
  });

  it("reads report no token instead of throwing", () => {
    expect(store.get("g1")).toBeNull();
    expect(store.has("g1")).toBe(false);
    expect(() => store.clear("g1")).not.toThrow();
  });
});
