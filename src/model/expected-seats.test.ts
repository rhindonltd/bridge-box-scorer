import { describe, it, expect } from "vitest";
import { deriveExpectedSeats } from "./expected-seats";
import { generateStandardMitchell } from "@/movement/mitchell/standard-mitchell";
import { Tables } from "@/model/movement";

describe("deriveExpectedSeats", () => {
  it("derives all 10 seats for a 5-table standard Mitchell", () => {
    const movement = generateStandardMitchell({
      tables: 5,
      rounds: 5,
      boardsPerRound: 3,
    });

    const { seats, phantomSeat } = deriveExpectedSeats(movement);

    expect(phantomSeat).toBeNull();
    expect(seats.size).toBe(10);
    for (let table = 1; table <= 5; table++) {
      expect(seats.has(`${table}NS`)).toBe(true);
      expect(seats.has(`${table}EW`)).toBe(true);
    }
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

    const { seats, phantomSeat } = deriveExpectedSeats(movement, 4);

    expect(phantomSeat).toBe("2EW");
    expect(seats.has("2EW")).toBe(false);
    expect(seats.size).toBe(3);
    expect(seats.has("1NS")).toBe(true);
    expect(seats.has("1EW")).toBe(true);
    expect(seats.has("2NS")).toBe(true);
  });

  it("ignores a missingParticipant of 0 (no phantom)", () => {
    const movement = generateStandardMitchell({
      tables: 3,
      rounds: 3,
      boardsPerRound: 2,
    });

    const { seats, phantomSeat } = deriveExpectedSeats(movement, 0);

    expect(phantomSeat).toBeNull();
    expect(seats.size).toBe(6);
  });

  it("returns an empty set for a movement with no tables", () => {
    const { seats, phantomSeat } = deriveExpectedSeats({ tables: [] });

    expect(seats.size).toBe(0);
    expect(phantomSeat).toBeNull();
  });
});
