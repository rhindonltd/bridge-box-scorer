import { describe, it, expect } from "vitest";
import { validateStart } from "./start-validator";
import { ExpectedSeats } from "./expected-seats";
import { PairSeat } from "@/model/participants";

function expectedFor(tables: number): ExpectedSeats {
  const seats = new Set<PairSeat>();
  for (let t = 1; t <= tables; t++) {
    seats.add(`${t}NS`);
    seats.add(`${t}EW`);
  }
  return { seats, phantomSeat: null };
}

function allSeats(tables: number): PairSeat[] {
  const seats: PairSeat[] = [];
  for (let t = 1; t <= tables; t++) {
    seats.push(`${t}NS`, `${t}EW`);
  }
  return seats;
}

describe("validateStart", () => {
  it("returns NO_MOVEMENT_SELECTED when no movement is selected", () => {
    const result = validateStart(null, ["1NS", "1EW"]);

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
    const seated = allSeats(5).filter((s) => s !== "3EW");

    const result = validateStart(expectedFor(5), seated);

    expect(result.canStart).toBe(true);
    expect(result.problems).toHaveLength(0);
    expect(result.sitOutSeat).toBe("3EW");
  });

  it("is invalid for a half-filled table combined with another gap", () => {
    // Table 5 completely empty (2 missing) plus table 3 half-filled would be
    // 3 missing; use table 3 half-filled + table 5 half-filled => 2 missing,
    // both half-filled tables.
    const seated = allSeats(5).filter((s) => s !== "3EW" && s !== "5EW");

    const result = validateStart(expectedFor(5), seated);

    expect(result.canStart).toBe(false);
    const codes = result.problems.map((p) => p.code);
    expect(codes).toContain("HALF_FILLED_TABLE");
    expect(codes).toContain("MULTIPLE_EMPTY_POSITIONS");
  });

  it("is invalid with a gap of two whole positions", () => {
    // Two full tables' worth missing is clearly > 1 sit-out.
    const seated = allSeats(5).filter(
      (s) => s !== "4NS" && s !== "4EW" && s !== "5NS",
    );

    const result = validateStart(expectedFor(5), seated);

    expect(result.canStart).toBe(false);
    expect(result.problems.map((p) => p.code)).toContain(
      "MULTIPLE_EMPTY_POSITIONS",
    );
  });

  it("is invalid when a pair is seated beyond the movement's tables", () => {
    const seated = [...allSeats(5), "6NS" as PairSeat, "6EW" as PairSeat];

    const result = validateStart(expectedFor(5), seated);

    expect(result.canStart).toBe(false);
    const tooMany = result.problems.find((p) => p.code === "TOO_MANY_TABLES");
    expect(tooMany).toBeDefined();
    expect(tooMany?.seats).toEqual(["6EW", "6NS"]);
  });

  it("treats the built-in phantom seat as not required", () => {
    // 5-table movement whose 5EW is a phantom; seating the other 9 is valid.
    const expected = expectedFor(5);
    expected.seats.delete("5EW");
    expected.phantomSeat = "5EW";

    const seated = allSeats(5).filter((s) => s !== "5EW");

    const result = validateStart(expected, seated);

    expect(result.canStart).toBe(true);
    expect(result.sitOutSeat).toBeNull();
  });
});
