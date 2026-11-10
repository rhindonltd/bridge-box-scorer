import { describe, it, expect } from "vitest";
import {
  arrivalAnchorOf,
  buildOccupantScoredIdResolver,
} from "./seat-occupancy";
import type { SeatOccupancy } from "@/db/games/tables/seat-occupancy";
const occ = (over: Partial<SeatOccupancy>): SeatOccupancy =>
  ({
    id: 1,
    seat: "A1NS",
    anchorId: null,
    boards: null,
    isArrivalAnchor: 0,
    isMainLine: 0,
    split: 0,
    standing: "ACTIVE",
    ...over,
  }) as SeatOccupancy;
describe("arrivalAnchorOf", () => {
  it("falls back to the lowest id when none is flagged or whole-seat", () => {
    const low = { id: 1, boards: [1], isArrivalAnchor: 0 };
    const high = { id: 2, boards: [2], isArrivalAnchor: 0 };
    expect(arrivalAnchorOf([high, low])).toBe(low);
    expect(arrivalAnchorOf([low, high])).toBe(low);
  });
});
describe("buildOccupantScoredIdResolver", () => {
  it("keeps the bare id for a board no occupant of a split seat covers", () => {
    const resolve = buildOccupantScoredIdResolver([
      occ({ id: 1, boards: [1], split: 1, isArrivalAnchor: 1 }),
      occ({ id: 2, boards: [2], split: 1 }),
    ]);
    expect(resolve("A1NS", 1)).toBe("A1NS");
    expect(resolve("A1NS", 2)).toBe("A1NS#2");
    expect(resolve("A1NS", 3)).toBe("A1NS");
    expect(resolve("A9NS", 1)).toBe("A9NS");
  });
});
