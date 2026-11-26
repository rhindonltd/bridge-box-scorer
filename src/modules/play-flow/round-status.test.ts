import { describe, it, expect } from "vitest";
import { isBoardEntered } from "./round-status";

describe("isBoardEntered", () => {
  it("returns true when directorOverrideResult is non-null", () => {
    expect(isBoardEntered({ directorOverrideResult: "3NTN=" })).toBe(true);
  });

  it("returns true when confirmedResult is non-null", () => {
    expect(isBoardEntered({ confirmedResult: "4SE+1" })).toBe(true);
  });

  it("returns true when status is CONFIRMED", () => {
    expect(isBoardEntered({ status: "CONFIRMED" })).toBe(true);
  });

  it("returns true when status is PENDING_CONFIRMATION", () => {
    expect(isBoardEntered({ status: "PENDING_CONFIRMATION" })).toBe(true);
  });

  it("returns true when status is OVERRIDDEN", () => {
    expect(isBoardEntered({ status: "OVERRIDDEN" })).toBe(true);
  });

  it("returns true when status is CANCELLED (fouled board)", () => {
    expect(isBoardEntered({ status: "CANCELLED" })).toBe(true);
  });

  it("returns true when status is REMOVED_TEAMS (teams board removed)", () => {
    expect(isBoardEntered({ status: "REMOVED_TEAMS" })).toBe(true);
  });

  it("returns false when all fields are null/undefined", () => {
    expect(isBoardEntered({})).toBe(false);
    expect(
      isBoardEntered({
        confirmedResult: null,
        directorOverrideResult: null,
        status: null,
      }),
    ).toBe(false);
  });

  it("returns false when status is NOT_PLAYED", () => {
    expect(isBoardEntered({ status: "NOT_PLAYED" })).toBe(false);
  });

  it("returns false when status is an unrelated value", () => {
    expect(isBoardEntered({ status: "WAITING" })).toBe(false);
  });

  it("director override takes precedence even if other fields are null", () => {
    expect(
      isBoardEntered({
        directorOverrideResult: "PO",
        confirmedResult: null,
        status: "NOT_PLAYED",
      }),
    ).toBe(true);
  });
});
