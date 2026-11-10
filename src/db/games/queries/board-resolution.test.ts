import { describe, it, expect } from "vitest";
import { isPlayableRow, isResolvedRow, type ResolutionRow } from "./board-resolution";
const row = (over: Partial<ResolutionRow> = {}): ResolutionRow => ({
  status: null,
  ruling: null,
  ns: "A1NS",
  ew: "A1EW",
  roundNumber: 1,
  confirmedResult: null,
  directorOverrideResult: null,
  ...over,
});
describe("isPlayableRow", () => {
  it("treats a row with no status as playable", () => {
    expect(isPlayableRow({ status: null })).toBe(true);
  });
  it("treats sit-outs and half averages as not playable", () => {
    expect(isPlayableRow({ status: "SIT_OUT" })).toBe(false);
    expect(isPlayableRow({ status: "HALF_AVERAGE" })).toBe(false);
    expect(isPlayableRow({ status: "NOT_PLAYED" })).toBe(true);
  });
});
describe("isResolvedRow", () => {
  it("is unresolved when there is no status, ruling or absence", () => {
    expect(isResolvedRow(row(), new Map())).toBe(false);
  });
  it("is resolved by a finalising status", () => {
    expect(isResolvedRow(row({ status: "CONFIRMED" }), new Map())).toBe(true);
    expect(isResolvedRow(row({ status: "NOT_PLAYED" }), new Map())).toBe(false);
  });
  it("is resolved by a match-level ruling", () => {
    expect(isResolvedRow(row({ ruling: "VOID:X" }), new Map())).toBe(true);
  });
  it("is resolved when a pair on it is absent", () => {
    const absences = new Map([
      ["A1NS", { kind: "EMPTY", round: 0, treatment: "AVERAGE" }],
    ]);
    expect(isResolvedRow(row(), absences as never)).toBe(true);
  });
});
