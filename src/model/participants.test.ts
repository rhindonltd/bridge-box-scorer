import { describe, it, expect } from "vitest";
import { isPairSeat, parseSeat } from "./participants";

describe("isPairSeat", () => {
  it("returns true for pair seats ending in NS or EW", () => {
    expect(isPairSeat("1NS")).toBe(true);
    expect(isPairSeat("1EW")).toBe(true);
    expect(isPairSeat("12NS")).toBe(true);
    expect(isPairSeat("5EW")).toBe(true);
  });
});

describe("parseSeat", () => {
  it("parses pair seat with NS direction", () => {
    expect(parseSeat("3NS")).toEqual({ tableNumber: 3, direction: "NS" });
  });

  it("parses pair seat with EW direction", () => {
    expect(parseSeat("7EW")).toEqual({ tableNumber: 7, direction: "EW" });
  });

  it("parses multi-digit table pair seat", () => {
    expect(parseSeat("12NS")).toEqual({ tableNumber: 12, direction: "NS" });
  });
});
