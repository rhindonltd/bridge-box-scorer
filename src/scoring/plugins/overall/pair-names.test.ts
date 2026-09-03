import { describe, it, expect } from "vitest";

import { pairNameLines } from "./pair-names";
import type { AssignedPair } from "@/model/participants";

function pair(id: string, names: [string, string, string, string]): AssignedPair {
  return {
    type: "PAIR",
    id,
    initialSeat: `${id}NS` as AssignedPair["initialSeat"],
    player1: { id: 1, firstName: names[0], lastName: names[1] },
    player2: { id: 2, firstName: names[2], lastName: names[3] },
  } as AssignedPair;
}

describe("pairNameLines", () => {
  it("resolves a pair id to two 'First Last' lines", () => {
    const participants = [pair("A1", ["Alice", "Adams", "Bob", "Brown"])];
    expect(pairNameLines(participants, "A1")).toEqual([
      "Alice Adams",
      "Bob Brown",
    ]);
  });

  it("falls back to the raw id when the pair is unknown", () => {
    const participants = [pair("A1", ["Alice", "Adams", "Bob", "Brown"])];
    expect(pairNameLines(participants, "Z9")).toEqual(["Z9"]);
  });

  it("trims when a name part is empty", () => {
    const participants = [pair("A1", ["Alice", "", "Bob", ""])];
    expect(pairNameLines(participants, "A1")).toEqual(["Alice", "Bob"]);
  });
});
