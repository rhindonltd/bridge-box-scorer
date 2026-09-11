import { describe, it, expect } from "vitest";
import {
  SelectedMovement,
  parseSelectedMovement,
  serializeSelectedMovement,
  selectedMovementsEqual,
} from "./selected-movement";
import type { MitchellMovementSpec } from "@/movement/mitchell/mitchell-utils";

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

  it("round-trips a WEB Mitchell selection", () => {
    const selected: SelectedMovement = {
      source: "MITCHELL",
      mitchell: {
        tables: 14,
        rounds: 8,
        boardsPerRound: 3,
        web: true,
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

describe("selectedMovementsEqual", () => {
  const spec = (specId: number, boardsPerRound = 3): SelectedMovement => ({
    source: "SPEC",
    specId,
    boardsPerRound,
  });
  const mitchell = (
    over: Partial<MitchellMovementSpec> = {},
  ): SelectedMovement => ({
    source: "MITCHELL",
    mitchell: { tables: 6, rounds: 6, boardsPerRound: 3, ...over },
  });

  it("treats two nulls as equal and null vs a movement as different", () => {
    expect(selectedMovementsEqual(null, null)).toBe(true);
    expect(selectedMovementsEqual(null, spec(1))).toBe(false);
    expect(selectedMovementsEqual(spec(1), null)).toBe(false);
  });

  it("compares SPEC selections by id and boards per round", () => {
    expect(selectedMovementsEqual(spec(1), spec(1))).toBe(true);
    expect(selectedMovementsEqual(spec(1), spec(2))).toBe(false);
    expect(selectedMovementsEqual(spec(1, 3), spec(1, 4))).toBe(false);
  });

  it("treats different sources as different", () => {
    expect(selectedMovementsEqual(spec(1), mitchell())).toBe(false);
  });

  it("compares MITCHELL specs by their defining fields", () => {
    expect(selectedMovementsEqual(mitchell(), mitchell())).toBe(true);
    expect(selectedMovementsEqual(mitchell(), mitchell({ rounds: 7 }))).toBe(
      false,
    );
    // Absent flag equals explicit false.
    expect(selectedMovementsEqual(mitchell(), mitchell({ skip: false }))).toBe(
      true,
    );
    expect(selectedMovementsEqual(mitchell(), mitchell({ skip: true }))).toBe(
      false,
    );
  });
});
