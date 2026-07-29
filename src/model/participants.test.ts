import { describe, it, expect } from "vitest";
import { isPairSeat, parseSeat } from "./participants";
import type { Seat } from "./participants";

describe("isPairSeat", () => {
  it("returns true for pair seats ending in NS or EW", () => {
    expect(isPairSeat("1NS")).toBe(true);
    expect(isPairSeat("1EW")).toBe(true);
    expect(isPairSeat("12NS")).toBe(true);
    expect(isPairSeat("5EW")).toBe(true);
  });

  it("returns false for individual seats ending in a single direction", () => {
    expect(isPairSeat("1N" as Seat)).toBe(false);
    expect(isPairSeat("1E" as Seat)).toBe(false);
    expect(isPairSeat("1S" as Seat)).toBe(false);
    expect(isPairSeat("1W" as Seat)).toBe(false);
    expect(isPairSeat("12N" as Seat)).toBe(false);
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

  it("parses individual seat with N direction", () => {
    expect(parseSeat("1N" as Seat)).toEqual({ tableNumber: 1, direction: "N" });
  });

  it("parses individual seat with E direction", () => {
    expect(parseSeat("5E" as Seat)).toEqual({ tableNumber: 5, direction: "E" });
  });

  it("parses individual seat with S direction", () => {
    expect(parseSeat("2S" as Seat)).toEqual({ tableNumber: 2, direction: "S" });
  });

  it("parses individual seat with W direction", () => {
    expect(parseSeat("10W" as Seat)).toEqual({
      tableNumber: 10,
      direction: "W",
    });
  });
});
