import { describe, it, expect } from "vitest";
import { validateStart } from "./start-validator";
import { ExpectedSeats } from "./expected-seats";
import { PairSeat } from "@/model/participants";

function expectedFor(tables: number, section = "A"): ExpectedSeats {
  const seats = new Set<PairSeat>();
  for (let t = 1; t <= tables; t++) {
    seats.add(`${section}${t}NS`);
    seats.add(`${section}${t}EW`);
  }
  return { seats, phantomSeat: null };
}

function allSeats(tables: number, section = "A"): PairSeat[] {
  const seats: PairSeat[] = [];
  for (let t = 1; t <= tables; t++) {
    seats.push(`${section}${t}NS`, `${section}${t}EW`);
  }
  return seats;
}

describe("validateStart", () => {
  it("returns NO_MOVEMENT_SELECTED when no movement is selected", () => {
    const result = validateStart(null, ["A1NS", "A1EW"]);

    expect(result.canStart).toBe(false);
    expect(result.problems.map((p) => p.code)).toContain(
      "NO_MOVEMENT_SELECTED",
    );
  });

  it("returns NO_PAIRS_SEATED when no pairs are seated", () => {
    const result = validateStart(expectedFor(5), []);

    expect(result.canStart).toBe(false);
    expect(result.problems.map((p) => p.code)).toContain("NO_PAIRS_SEATED");
  });

  it("is valid when seating exactly matches the movement", () => {
    const result = validateStart(expectedFor(5), allSeats(5));

    expect(result.canStart).toBe(true);
    expect(result.problems).toHaveLength(0);
    expect(result.sitOutSeat).toBeNull();
  });

  it("is valid with exactly one pair missing (single sit-out)", () => {
    const seated = allSeats(5).filter((s) => s !== "A3EW");

    const result = validateStart(expectedFor(5), seated);

    expect(result.canStart).toBe(true);
    expect(result.problems).toHaveLength(0);
    expect(result.sitOutSeat).toBe("A3EW");
  });

  it("is invalid for a half-filled table combined with another gap", () => {
    const seated = allSeats(5).filter((s) => s !== "A3EW" && s !== "A5EW");

    const result = validateStart(expectedFor(5), seated);

    expect(result.canStart).toBe(false);
    const codes = result.problems.map((p) => p.code);
    expect(codes).toContain("HALF_FILLED_TABLE");
    expect(codes).toContain("MULTIPLE_EMPTY_POSITIONS");
  });

  it("is invalid with a gap of two whole positions", () => {
    const seated = allSeats(5).filter(
      (s) => s !== "A4NS" && s !== "A4EW" && s !== "A5NS",
    );

    const result = validateStart(expectedFor(5), seated);

    expect(result.canStart).toBe(false);
    expect(result.problems.map((p) => p.code)).toContain(
      "MULTIPLE_EMPTY_POSITIONS",
    );
  });

  it("is invalid when a pair is seated beyond the movement's tables", () => {
    const seated = [...allSeats(5), "A6NS" as PairSeat, "A6EW" as PairSeat];

    const result = validateStart(expectedFor(5), seated);

    expect(result.canStart).toBe(false);
    const tooMany = result.problems.find((p) => p.code === "TOO_MANY_TABLES");
    expect(tooMany).toBeDefined();
    expect(tooMany?.seats).toEqual(["A6EW", "A6NS"]);
  });

  it("treats the built-in phantom seat as not required", () => {
    const expected = expectedFor(5);
    expected.seats.delete("A5EW");
    expected.phantomSeat = "A5EW";

    const seated = allSeats(5).filter((s) => s !== "A5EW");

    const result = validateStart(expected, seated);

    expect(result.canStart).toBe(true);
    expect(result.sitOutSeat).toBeNull();
  });

  it("validates a non-A section identically", () => {
    const result = validateStart(expectedFor(3, "B"), allSeats(3, "B"));

    expect(result.canStart).toBe(true);
    expect(result.sitOutSeat).toBeNull();
  });
});
