import { describe, it, expect } from "vitest";
import { deriveExpectedSeats } from "./expected-seats";
import { generateStandardMitchell } from "@/movement/mitchell/standard-mitchell";
import { Tables } from "@/model/movement";

describe("deriveExpectedSeats", () => {
  it("derives all 10 section-qualified seats for a 5-table standard Mitchell", () => {
    const movement = generateStandardMitchell({
      tables: 5,
      rounds: 5,
      boardsPerRound: 3,
    });

    const { seats, phantomSeat } = deriveExpectedSeats("A", movement);

    expect(phantomSeat).toBeNull();
    expect(seats.size).toBe(10);
    for (let table = 1; table <= 5; table++) {
      expect(seats.has(`A${table}NS`)).toBe(true);
      expect(seats.has(`A${table}EW`)).toBe(true);
    }
  });

  it("qualifies seats with the given section letter", () => {
    const movement = generateStandardMitchell({
      tables: 3,
      rounds: 3,
      boardsPerRound: 2,
    });

    const { seats } = deriveExpectedSeats("B", movement);

    expect(seats.has("B1NS")).toBe(true);
    expect(seats.has("B3EW")).toBe(true);
    // Not the "A" prefix.
    expect(seats.has("A1NS")).toBe(false);
  });

  it("flags the phantom seat and excludes it from expected seats", () => {
    // A tiny hand-built 2-table movement whose EW pair at table 2 is the
    // phantom (movement position id 4).
    const movement: Tables<"PAIR"> = {
      tables: [
        {
          table: 1,
          rounds: [
            {
              round: 1,
              boards: [1],
              participants: { nsId: "1", ewId: "3" },
            },
          ],
        },
        {
          table: 2,
          rounds: [
            {
              round: 1,
              boards: [2],
              participants: { nsId: "2", ewId: "4" },
            },
          ],
        },
      ],
    };

    const { seats, phantomSeat } = deriveExpectedSeats("A", movement, 4);

    expect(phantomSeat).toBe("A2EW");
    expect(seats.has("A2EW")).toBe(false);
    expect(seats.size).toBe(3);
    expect(seats.has("A1NS")).toBe(true);
    expect(seats.has("A1EW")).toBe(true);
    expect(seats.has("A2NS")).toBe(true);
  });

  it("ignores a missingParticipant of 0 (no phantom)", () => {
    const movement = generateStandardMitchell({
      tables: 3,
      rounds: 3,
      boardsPerRound: 2,
    });

    const { seats, phantomSeat } = deriveExpectedSeats("A", movement, 0);

    expect(phantomSeat).toBeNull();
    expect(seats.size).toBe(6);
  });

  it("returns an empty set for a movement with no tables", () => {
    const { seats, phantomSeat } = deriveExpectedSeats("A", { tables: [] });

    expect(seats.size).toBe(0);
    expect(phantomSeat).toBeNull();
  });
});
