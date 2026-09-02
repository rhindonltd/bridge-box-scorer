import { describe, it, expect } from "vitest";
import { validateSections } from "./validate-sections";
import { ExpectedSeats } from "./expected-seats";
import { PairSeat } from "@/model/participants";

function expectedFor(tables: number, section: string): ExpectedSeats {
  const seats = new Set<PairSeat>();
  for (let t = 1; t <= tables; t++) {
    seats.add(`${section}${t}NS`);
    seats.add(`${section}${t}EW`);
  }
  return { seats, phantomSeat: null };
}

function allSeats(tables: number, section: string): PairSeat[] {
  const seats: PairSeat[] = [];
  for (let t = 1; t <= tables; t++) {
    seats.push(`${section}${t}NS`, `${section}${t}EW`);
  }
  return seats;
}

describe("validateSections", () => {
  it("can start when all sections are individually valid", () => {
    const result = validateSections([
      { section: "A", expected: expectedFor(4, "A"), seatedSeats: allSeats(4, "A") },
      { section: "B", expected: expectedFor(3, "B"), seatedSeats: allSeats(3, "B") },
    ]);

    expect(result.canStart).toBe(true);
    expect(result.sections.map((s) => s.section)).toEqual(["A", "B"]);
    expect(result.sections.every((s) => s.validation.canStart)).toBe(true);
  });

  it("reports section A valid and section B one pair short, blocking start", () => {
    // Section A: fully seated (valid). Section B: two positions missing (a
    // whole table empty is fine, but here we drop only one seat's partner to
    // create a half-filled/short case that blocks).
    const bSeated = allSeats(3, "B").filter(
      (s) => s !== "B2NS" && s !== "B2EW" && s !== "B3EW",
    );

    const result = validateSections([
      { section: "A", expected: expectedFor(4, "A"), seatedSeats: allSeats(4, "A") },
      { section: "B", expected: expectedFor(3, "B"), seatedSeats: bSeated },
    ]);

    expect(result.canStart).toBe(false);

    const a = result.sections.find((s) => s.section === "A")!;
    const b = result.sections.find((s) => s.section === "B")!;

    expect(a.validation.canStart).toBe(true);
    expect(b.validation.canStart).toBe(false);
    expect(b.validation.problems.map((p) => p.code)).toContain(
      "MULTIPLE_EMPTY_POSITIONS",
    );
  });

  it("allows a single sit-out within a section", () => {
    const bSeated = allSeats(3, "B").filter((s) => s !== "B3EW");

    const result = validateSections([
      { section: "A", expected: expectedFor(4, "A"), seatedSeats: allSeats(4, "A") },
      { section: "B", expected: expectedFor(3, "B"), seatedSeats: bSeated },
    ]);

    expect(result.canStart).toBe(true);
    const b = result.sections.find((s) => s.section === "B")!;
    expect(b.validation.sitOutSeat).toBe("B3EW");
  });

  it("cannot start with no sections", () => {
    const result = validateSections([]);
    expect(result.canStart).toBe(false);
    expect(result.sections).toHaveLength(0);
  });
});
