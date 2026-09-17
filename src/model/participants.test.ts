import { describe, it, expect } from "vitest";
import {
  deriveTeamId,
  isPairSeat,
  parseSeat,
  sectionOf,
  seatFor,
} from "./participants";

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

describe("deriveTeamId", () => {
  it("drops the NS direction to yield the home-table id", () => {
    expect(deriveTeamId("A1NS")).toBe("A1");
  });

  it("drops the EW direction to yield the same home-table id", () => {
    expect(deriveTeamId("A1EW")).toBe("A1");
  });

  it("maps both pairs of a team to the same id", () => {
    expect(deriveTeamId("A3NS")).toBe(deriveTeamId("A3EW"));
  });

  it("keeps the section and multi-digit table number", () => {
    expect(deriveTeamId("B12EW")).toBe("B12");
  });

  it("distinguishes the same table number across sections", () => {
    expect(deriveTeamId("A1NS")).not.toBe(deriveTeamId("B1NS"));
  });

  it("throws for an unprefixed seat", () => {
    expect(() => deriveTeamId("1NS" as never)).toThrow();
  });
});

describe("sectionOf", () => {
  it("returns the section letter of a full seat", () => {
    expect(sectionOf("A1NS")).toBe("A");
    expect(sectionOf("B12EW")).toBe("B");
  });

  it("throws for an unprefixed or malformed id", () => {
    expect(() => sectionOf("1NS")).toThrow();
    expect(() => sectionOf("A1")).toThrow();
  });
});

describe("parseSeat accepts a plain string", () => {
  it("decodes a valid seat passed as a bare string (no cast needed)", () => {
    const id: string = "A3NS";
    expect(parseSeat(id)).toEqual({
      section: "A",
      tableNumber: 3,
      direction: "NS",
    });
  });

  it("throws for an invalid string", () => {
    expect(() => parseSeat("not-a-seat")).toThrow();
  });
});
