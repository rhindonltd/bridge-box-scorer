import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  isAlertHidden,
  isAlertSeen,
  markAlertSeen,
  newOwnSignInId,
} from "./director-alerts-seen";

describe("director alerts seen", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.unstubAllGlobals());

  it("remembers alerts marked as seen", () => {
    expect(isAlertSeen("a1")).toBe(false);
    markAlertSeen("a1");
    markAlertSeen("a1");
    expect(isAlertSeen("a1")).toBe(true);
    expect(JSON.parse(localStorage.getItem("director-alerts:seen")!)).toEqual([
      "a1",
    ]);
  });

  it("keeps only the most recent 200", () => {
    for (let i = 0; i < 205; i++) markAlertSeen(`a${i}`);
    expect(isAlertSeen("a0")).toBe(false);
    expect(isAlertSeen("a204")).toBe(true);
  });

  it("ignores corrupt or unexpected stored values", () => {
    localStorage.setItem("director-alerts:seen", "{bad");
    expect(isAlertSeen("a1")).toBe(false);
    localStorage.setItem("director-alerts:seen", '{"a":1}');
    expect(isAlertSeen("a1")).toBe(false);
    localStorage.setItem("director-alerts:seen", '["a1", 5]');
    expect(isAlertSeen("a1")).toBe(true);
  });

  it("does nothing without localStorage (server render)", () => {
    vi.stubGlobal("localStorage", undefined);
    expect(isAlertSeen("a1")).toBe(false);
    expect(() => markAlertSeen("a1")).not.toThrow();
  });

  it("hides dismissed alerts and this device's own sign-in alerts", () => {
    const origin = newOwnSignInId();
    expect(origin).toEqual(expect.any(String));
    expect(isAlertHidden({ id: "a1", originId: origin })).toBe(true);
    expect(isAlertHidden({ id: "a1", originId: "someone-else" })).toBe(false);
    expect(isAlertHidden({ id: "a1" })).toBe(false);
    markAlertSeen("a1");
    expect(isAlertHidden({ id: "a1" })).toBe(true);
  });

  it("an origin id is never mistaken for an alert id", () => {
    const origin = newOwnSignInId();
    expect(isAlertHidden({ id: origin })).toBe(false);
  });
});
