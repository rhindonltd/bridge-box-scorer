import { describe, it, expect } from "vitest";
import { aggregateSections, flattenSections } from "./validate-sections";
import type { StartValidationResult } from "./start-validator";

const ok: StartValidationResult = {
  canStart: true,
  sitOutSeat: null,
  problems: [],
};
const short: StartValidationResult = {
  canStart: false,
  sitOutSeat: null,
  problems: [{ code: "MULTIPLE_EMPTY_POSITIONS", message: "Two seats empty." }],
};

describe("aggregateSections", () => {
  it("can start when every section can", () => {
    const result = aggregateSections([
      { section: "A", validation: ok },
      { section: "B", validation: ok },
    ]);
    expect(result.canStart).toBe(true);
    expect(result.sections.map((s) => s.section)).toEqual(["A", "B"]);
  });

  it("cannot start when any section cannot", () => {
    const result = aggregateSections([
      { section: "A", validation: ok },
      { section: "B", validation: short },
    ]);
    expect(result.canStart).toBe(false);
  });

  it("cannot start with no sections", () => {
    expect(aggregateSections([]).canStart).toBe(false);
  });
});

describe("flattenSections", () => {
  it("asks for a section when there are none", () => {
    expect(flattenSections(aggregateSections([]))).toEqual({
      canStart: false,
      sitOutSeat: null,
      problems: [
        {
          code: "NO_MOVEMENT_SELECTED",
          message: "Add at least one section before starting the game.",
        },
      ],
    });
  });

  it("tags each problem with its section", () => {
    const flat = flattenSections(
      aggregateSections([
        { section: "A", validation: ok },
        { section: "B", validation: short },
      ]),
    );
    expect(flat).toEqual({
      canStart: false,
      sitOutSeat: null,
      problems: [
        {
          code: "MULTIPLE_EMPTY_POSITIONS",
          message: "Two seats empty.",
          section: "B",
        },
      ],
    });
  });
});
