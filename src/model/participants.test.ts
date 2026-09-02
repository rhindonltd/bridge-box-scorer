import { describe, it, expect } from "vitest";
import { isPairSeat, parseSeat, seatFor } from "./participants";

describe("isPairSeat", () => {
  it("returns true for section-qualified pair seats ending in NS or EW", () => {
    expect(isPairSeat("A1NS")).toBe(true);
    expect(isPairSeat("A1EW")).toBe(true);
    expect(isPairSeat("B12NS")).toBe(true);
    expect(isPairSeat("C5EW")).toBe(true);
  });

  it("returns false for unprefixed seats", () => {
    expect(isPairSeat("1NS" as never)).toBe(false);
    expect(isPairSeat("12EW" as never)).toBe(false);
  });

  it("returns false for malformed seats", () => {
    expect(isPairSeat("A" as never)).toBe(false);
    expect(isPairSeat("ANS" as never)).toBe(false);
    expect(isPairSeat("A1XY" as never)).toBe(false);
  });
});

describe("parseSeat", () => {
  it("parses a section-qualified pair seat with NS direction", () => {
    expect(parseSeat("A3NS")).toEqual({
      section: "A",
      tableNumber: 3,
      direction: "NS",
    });
  });

  it("parses a section-qualified pair seat with EW direction", () => {
    expect(parseSeat("A7EW")).toEqual({
      section: "A",
      tableNumber: 7,
      direction: "EW",
    });
  });

  it("parses a multi-digit table number", () => {
    expect(parseSeat("B12EW")).toEqual({
      section: "B",
      tableNumber: 12,
      direction: "EW",
    });
  });

  it("parses a different section letter", () => {
    expect(parseSeat("C1NS")).toEqual({
      section: "C",
      tableNumber: 1,
      direction: "NS",
    });
  });

  it("throws for an unprefixed seat", () => {
    expect(() => parseSeat("3NS" as never)).toThrow();
  });
});

describe("seatFor", () => {
  it("builds a section-qualified seat from parts", () => {
    expect(seatFor("A", 3, "NS")).toBe("A3NS");
    expect(seatFor("B", 12, "EW")).toBe("B12EW");
  });

  it("round-trips with parseSeat", () => {
    expect(parseSeat(seatFor("C", 5, "EW"))).toEqual({
      section: "C",
      tableNumber: 5,
      direction: "EW",
    });
  });
});
