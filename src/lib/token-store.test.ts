import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createKeyedTokenStore } from "./token-store";

const store = createKeyedTokenStore<string>(
  "test:",
  (v) => v,
  (raw) => raw,
);

describe("createKeyedTokenStore entries", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.unstubAllGlobals());

  it("lists only its own prefix's entries", () => {
    store.set("a", "1");
    localStorage.setItem("other:b", "2");
    expect(store.entries()).toEqual([["a", "1"]]);
  });

  it("returns nothing where there is no localStorage (server render)", () => {
    vi.stubGlobal("localStorage", undefined);
    expect(store.entries()).toEqual([]);
  });

  it("skips a key that vanishes or has no value while listing", () => {
    const fake = {
      length: 2,
      key: (i: number) => (i === 0 ? null : "test:gone"),
      getItem: () => null,
    };
    vi.stubGlobal("localStorage", fake);
    expect(store.entries()).toEqual([]);
  });
});
