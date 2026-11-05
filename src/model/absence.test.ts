import { describe, it, expect } from "vitest";
import {
  normaliseAbsenceTreatment,
  resolveAbsentRow,
  isAbsentRow,
  type Absence,
  type AbsenceBoardRow,
} from "./absence";

const row = (over: Partial<AbsenceBoardRow> = {}): AbsenceBoardRow => ({
  ns: "A1NS",
  ew: "A2EW",
  roundNumber: 3,
  confirmedResult: null,
  directorOverrideResult: null,
  ...over,
});

const absences = (entries: [string, Absence][]) => new Map(entries);

describe("normaliseAbsenceTreatment", () => {
  it("defaults to AVERAGE and maps the legacy values", () => {
    expect(normaliseAbsenceTreatment(null)).toBe("AVERAGE");
    expect(normaliseAbsenceTreatment("AVERAGE")).toBe("AVERAGE");
    expect(normaliseAbsenceTreatment("PENALISED")).toBe("AVERAGE");
    expect(normaliseAbsenceTreatment("REMOVED")).toBe("REMOVED");
    expect(normaliseAbsenceTreatment("REMOVE")).toBe("REMOVED");
  });
});

describe("resolveAbsentRow", () => {
  it("is null when nobody is absent", () => {
    expect(resolveAbsentRow(row(), new Map())).toBeNull();
    expect(
      resolveAbsentRow(
        row(),
        absences([
          ["A9NS", { kind: "WITHDRAWN", round: 1, treatment: "AVERAGE" }],
        ]),
      ),
    ).toBeNull();
  });

  it("gives an absent NS pair AVE− and its opponent AVE+", () => {
    const a = absences([
      ["A1NS", { kind: "WITHDRAWN", round: 2, treatment: "AVERAGE" }],
    ]);
    expect(resolveAbsentRow(row(), a)).toEqual({
      kind: "outcome",
      outcome: "A40/60",
    });
  });

  it("gives an absent EW pair AVE− and its opponent AVE+", () => {
    const a = absences([
      ["A2EW", { kind: "LATE", round: 4, treatment: "AVERAGE" }],
    ]);
    expect(resolveAbsentRow(row(), a)).toEqual({
      kind: "outcome",
      outcome: "A60/40",
    });
  });

  it("drops the row when the absent pair's boards are REMOVED", () => {
    const a = absences([
      ["A1NS", { kind: "WITHDRAWN", round: 1, treatment: "REMOVED" }],
    ]);
    expect(resolveAbsentRow(row(), a)).toEqual({ kind: "removed" });
  });

  it("only covers a withdrawn pair's rounds from its withdrawal onward", () => {
    const a = absences([
      ["A1NS", { kind: "WITHDRAWN", round: 4, treatment: "AVERAGE" }],
    ]);
    expect(resolveAbsentRow(row({ roundNumber: 3 }), a)).toBeNull();
    expect(resolveAbsentRow(row({ roundNumber: 4 }), a)).not.toBeNull();
  });

  it("only covers a late pair's rounds before it arrived", () => {
    const a = absences([
      ["A1NS", { kind: "LATE", round: 3, treatment: "AVERAGE" }],
    ]);
    expect(resolveAbsentRow(row({ roundNumber: 2 }), a)).not.toBeNull();
    expect(resolveAbsentRow(row({ roundNumber: 3 }), a)).toBeNull();
  });

  it("covers every round of a still-empty expected-late seat", () => {
    const a = absences([
      ["A2EW", { kind: "EMPTY", round: 0, treatment: "AVERAGE" }],
    ]);
    expect(resolveAbsentRow(row({ roundNumber: 1 }), a)).not.toBeNull();
    expect(resolveAbsentRow(row({ roundNumber: 9 }), a)).not.toBeNull();
  });

  it("lets a real result stand on an absent row", () => {
    const a = absences([
      ["A1NS", { kind: "WITHDRAWN", round: 1, treatment: "AVERAGE" }],
    ]);
    expect(resolveAbsentRow(row({ confirmedResult: "3NTN=" }), a)).toBeNull();
    expect(
      resolveAbsentRow(row({ directorOverrideResult: "A50/50" }), a),
    ).toBeNull();
  });

  it("matches a handover occupant's scored id to its seat's absence", () => {
    const a = absences([
      ["A1NS", { kind: "WITHDRAWN", round: 1, treatment: "AVERAGE" }],
    ]);
    expect(resolveAbsentRow(row({ ns: "A1NS#7" }), a)).toEqual({
      kind: "outcome",
      outcome: "A40/60",
    });
  });

  it("scores two absent AVERAGE pairs AVE−/AVE−, otherwise removes the row", () => {
    const both = absences([
      ["A1NS", { kind: "WITHDRAWN", round: 1, treatment: "AVERAGE" }],
      ["A2EW", { kind: "WITHDRAWN", round: 1, treatment: "AVERAGE" }],
    ]);
    expect(resolveAbsentRow(row(), both)).toEqual({
      kind: "outcome",
      outcome: "A40/40",
    });

    const mixed = absences([
      ["A1NS", { kind: "WITHDRAWN", round: 1, treatment: "AVERAGE" }],
      ["A2EW", { kind: "WITHDRAWN", round: 1, treatment: "REMOVED" }],
    ]);
    expect(resolveAbsentRow(row(), mixed)).toEqual({ kind: "removed" });
  });
});

describe("isAbsentRow", () => {
  it("is true for both AVERAGE and REMOVED absent rows", () => {
    const avg = absences([
      ["A1NS", { kind: "WITHDRAWN", round: 1, treatment: "AVERAGE" }],
    ]);
    const rem = absences([
      ["A1NS", { kind: "WITHDRAWN", round: 1, treatment: "REMOVED" }],
    ]);
    expect(isAbsentRow(row(), avg)).toBe(true);
    expect(isAbsentRow(row(), rem)).toBe(true);
    expect(isAbsentRow(row(), new Map())).toBe(false);
  });
});
