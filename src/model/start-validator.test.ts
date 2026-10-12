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

  it("reports an unknown seat that falls within the movement's table range", () => {
    // Expected seats cover A1 only, but the phantom seat pushes maxTable to 2.
    // Seating A2EW is therefore neither expected nor beyond the table range,
    // so it is classified as an unknown seat rather than TOO_MANY_TABLES.
    const expected: ExpectedSeats = {
      seats: new Set<PairSeat>(["A1NS", "A1EW"]),
      phantomSeat: "A2NS",
    };

    const result = validateStart(expected, ["A1NS", "A1EW", "A2EW"]);

    expect(result.canStart).toBe(false);
    const unknown = result.problems.find((p) => p.code === "UNKNOWN_SEAT");
    expect(unknown).toBeDefined();
    expect(unknown?.seats).toEqual(["A2EW"]);
    expect(result.problems.map((p) => p.code)).not.toContain("TOO_MANY_TABLES");
  });

  it("reports MULTIPLE_EMPTY_POSITIONS without HALF_FILLED_TABLE when a whole table is empty", () => {
    // Removing both directions of table 4 leaves two missing positions but no
    // half-filled table, exercising the branch where halfFilled is empty.
    const seated = allSeats(5).filter((s) => s !== "A4NS" && s !== "A4EW");

    const result = validateStart(expectedFor(5), seated);

    expect(result.canStart).toBe(false);
    const codes = result.problems.map((p) => p.code);
    expect(codes).toContain("MULTIPLE_EMPTY_POSITIONS");
    expect(codes).not.toContain("HALF_FILLED_TABLE");
  });

  it("sorts implicated seats within the same table by seat string", () => {
    // Both directions of table 6 are beyond the movement, so TOO_MANY_TABLES
    // seats share a table and must be ordered by seat string (EW before NS).
    const seated = [...allSeats(5), "A6NS" as PairSeat, "A6EW" as PairSeat];

    const result = validateStart(expectedFor(5), seated);

    const tooMany = result.problems.find((p) => p.code === "TOO_MANY_TABLES");
    expect(tooMany?.seats).toEqual(["A6EW", "A6NS"]);
  });

  it("orders same-table unknown seats regardless of input order", () => {
    // Phantom seat pushes maxTable to 3, so A2NS/A2EW are unknown (not beyond
    // the range). They share a table, exercising the same-table string compare
    // in both orderings.
    const expected: ExpectedSeats = {
      seats: new Set<PairSeat>(["A1NS", "A1EW"]),
      phantomSeat: "A3NS",
    };

    const result = validateStart(expected, ["A1NS", "A1EW", "A2EW", "A2NS"]);

    const unknown = result.problems.find((p) => p.code === "UNKNOWN_SEAT");
    expect(unknown?.seats).toEqual(["A2EW", "A2NS"]);
  });

  it("uses singular 'table' in the TOO_MANY_TABLES message for a one-table movement", () => {
    const seated: PairSeat[] = [...allSeats(1), "A2NS"];

    const result = validateStart(expectedFor(1), seated);

    expect(result.canStart).toBe(false);
    const tooMany = result.problems.find((p) => p.code === "TOO_MANY_TABLES");
    expect(tooMany).toBeDefined();
    expect(tooMany?.message).toContain("The movement has 1 table,");
  });

  describe("§2.4.7 expected-late seats", () => {
    it("lets the game start with TWO empty seats when both are marked late", () => {
      // Two whole positions missing (A3EW, A5EW) would normally be
      // MULTIPLE_EMPTY_POSITIONS; marking both expected-late accounts for them.
      const seated = allSeats(5).filter(
        (s) => s !== "A3EW" && s !== "A5EW",
      );

      const result = validateStart(expectedFor(5), seated, ["A3EW", "A5EW"]);

      expect(result.canStart).toBe(true);
      expect(result.problems).toHaveLength(0);
      // Marked-late seats are NOT the sit-out; they are reported as lateSeats.
      expect(result.sitOutSeat).toBeNull();
      expect(result.lateSeats).toEqual(["A3EW", "A5EW"]);
    });

    it("still allows ONE unmarked sit-out alongside marked-late seats", () => {
      // A3EW marked late (accounted for) + A5EW genuinely a sit-out.
      const seated = allSeats(5).filter(
        (s) => s !== "A3EW" && s !== "A5EW",
      );

      const result = validateStart(expectedFor(5), seated, ["A3EW"]);

      expect(result.canStart).toBe(true);
      expect(result.sitOutSeat).toBe("A5EW"); // the lone UNMARKED gap
      expect(result.lateSeats).toEqual(["A3EW"]);
    });

    it("rejects when two UNMARKED gaps remain even if a third is marked late", () => {
      // A2EW marked late; A4EW and A5EW are both unmarked → still invalid.
      const seated = allSeats(5).filter(
        (s) => s !== "A2EW" && s !== "A4EW" && s !== "A5EW",
      );

      const result = validateStart(expectedFor(5), seated, ["A2EW"]);

      expect(result.canStart).toBe(false);
      const codes = result.problems.map((p) => p.code);
      expect(codes).toContain("MULTIPLE_EMPTY_POSITIONS");
      // The marked-late seat is excluded from the reported unaccounted seats.
      const multi = result.problems.find(
        (p) => p.code === "MULTIPLE_EMPTY_POSITIONS",
      );
      expect(multi?.seats).toEqual(["A4EW", "A5EW"]);
    });

    it("allows a half-filled table when its empty side is marked late", () => {
      // Table 3 has A3NS seated, A3EW empty — a half-filled table. Marking
      // A3EW late accounts for it, and it is the only gap, so the game starts.
      const seated = allSeats(5).filter((s) => s !== "A3EW");

      const result = validateStart(expectedFor(5), seated, ["A3EW"]);

      expect(result.canStart).toBe(true);
      expect(result.problems).toHaveLength(0);
      expect(result.sitOutSeat).toBeNull();
      expect(result.lateSeats).toEqual(["A3EW"]);
    });

    it("ignores a late mark on a seat that is actually seated", () => {
      // A3EW is seated AND marked late (stale mark). It is not missing, so the
      // mark is moot: a full field starts cleanly with no late seats.
      const result = validateStart(expectedFor(5), allSeats(5), ["A3EW"]);

      expect(result.canStart).toBe(true);
      expect(result.lateSeats).toEqual([]);
    });

    it("defaults to no late seats when the argument is omitted", () => {
      const seated = allSeats(5).filter((s) => s !== "A3EW");
      const result = validateStart(expectedFor(5), seated);

      // Back-compat: omitting the arg behaves exactly as before (single sit-out).
      expect(result.canStart).toBe(true);
      expect(result.sitOutSeat).toBe("A3EW");
      expect(result.lateSeats).toEqual([]);
    });
  });
});
