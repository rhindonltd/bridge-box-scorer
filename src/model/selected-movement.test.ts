import { describe, it, expect } from "vitest";
import {
  SelectedMovement,
  parseSelectedMovement,
  serializeSelectedMovement,
} from "./selected-movement";

describe("SelectedMovement round-trip", () => {
  it("round-trips a SPEC selection", () => {
    const selected: SelectedMovement = {
      source: "SPEC",
      specId: 42,
      boardsPerRound: 3,
    };

    const parsed = parseSelectedMovement(serializeSelectedMovement(selected));

    expect(parsed).toEqual(selected);
  });

  it("round-trips a MITCHELL selection", () => {
    const selected: SelectedMovement = {
      source: "MITCHELL",
      mitchell: {
        tables: 5,
        rounds: 5,
        boardsPerRound: 3,
        arrowSwitchRounds: 1,
        skip: false,
      },
    };

    const parsed = parseSelectedMovement(serializeSelectedMovement(selected));

    expect(parsed).toEqual(selected);
  });
});

describe("parseSelectedMovement", () => {
  it("returns null for null / undefined / empty", () => {
    expect(parseSelectedMovement(null)).toBeNull();
    expect(parseSelectedMovement(undefined)).toBeNull();
    expect(parseSelectedMovement("")).toBeNull();
  });

  it("returns null for non-JSON text", () => {
    expect(parseSelectedMovement("not json")).toBeNull();
  });

  it("returns null for JSON that does not match the schema", () => {
    expect(parseSelectedMovement(JSON.stringify({ source: "OTHER" }))).toBeNull();
    expect(
      parseSelectedMovement(JSON.stringify({ source: "SPEC" })),
    ).toBeNull();
    expect(
      parseSelectedMovement(
        JSON.stringify({ source: "MITCHELL", mitchell: { tables: 5 } }),
      ),
    ).toBeNull();
  });

  it("rejects a non-positive spec id", () => {
    expect(
      parseSelectedMovement(
        JSON.stringify({ source: "SPEC", specId: 0, boardsPerRound: 3 }),
      ),
    ).toBeNull();
  });

  it("rejects a SPEC selection without boards per round", () => {
    expect(
      parseSelectedMovement(JSON.stringify({ source: "SPEC", specId: 1 })),
    ).toBeNull();
  });
});
