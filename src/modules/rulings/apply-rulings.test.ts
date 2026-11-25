import { describe, it, expect } from "vitest";
import { applyRulings, ruledBoardInstances } from "@/modules/rulings";
import type { Absence } from "@/model/absence";
import type { EventClassification } from "@/model/event-format";
import type { ResultRow } from "@/model/result-row";
import type { BoardOutcome } from "@/model/score";
import type { BoardStatus } from "@/model/game-types";

const PAIRS: EventClassification = {
  format: "PAIRS_BOARD",
  scoringType: "MP",
  swissVpMode: null,
};

const row = (over: Partial<ResultRow>): ResultRow => ({
  section: "A",
  roundNumber: 1,
  tableNumber: 1,
  boardNumber: 1,
  copy: "A",
  ns: "A1NS",
  ew: "A1EW",
  confirmedResult: null,
  confirmedLead: null,
  directorOverrideResult: null,
  directorOverrideLead: null,
  matchId: 1,
  status: "NOT_PLAYED" as BoardStatus,
  seatsSwapped: false,
  ...over,
});

/**
 * Design §8.2: the traveller (`ruledBoardInstances`) and the standings
 * (`applyRulings`) must show an absent pair's missed board the same way. A
 * withdrawn pair's rows are marked ABSENT when it withdraws, and a still-empty
 * expected-late seat's rows stay NOT_PLAYED, so the traveller applies every
 * absence to ABSENT rows but only EMPTY absences to the rest.
 */
describe("absent rows: traveller and standings agree", () => {
  const absences = new Map<string, Absence>([
    ["A1NS", { kind: "WITHDRAWN", round: 1, treatment: "AVERAGE" }],
    ["A2EW", { kind: "EMPTY", round: 0, treatment: "AVERAGE" }],
    ["A3NS", { kind: "WITHDRAWN", round: 1, treatment: "REMOVED" }],
  ]);
  const rows = [
    row({ ns: "A1NS", ew: "A1EW", status: "ABSENT" as BoardStatus }),
    row({ tableNumber: 2, ns: "A2NS", ew: "A2EW" }),
    row({
      tableNumber: 3,
      ns: "A3NS",
      ew: "A3EW",
      status: "ABSENT" as BoardStatus,
    }),
    row({
      tableNumber: 4,
      ns: "A4NS",
      ew: "A4EW",
      confirmedResult: "3NTN=" as BoardOutcome,
      status: "CONFIRMED" as BoardStatus,
    }),
  ];

  it("gives each row the same result in both views", () => {
    const ruled = applyRulings({
      classification: PAIRS,
      rows,
      matches: [],
      decisions: {
        occupancies: [],
        absences,
        expectedLateSeats: [],
        seatedSeats: new Set(),
      },
    });
    const standingsView = ruled.rows.map((r) => [
      r.tableNumber,
      r.directorOverrideResult ?? r.confirmedResult,
    ]);
    const travellerView = ruledBoardInstances(rows, absences).map((i) => [
      i.tableNumber,
      i.currentResult,
    ]);

    expect(travellerView).toEqual(standingsView);
    expect(travellerView).toEqual([
      [1, "A40/60"], // withdrawn NS: AVE− / AVE+
      [2, "A60/40"], // empty expected-late EW seat: AVE+ / AVE−
      // table 3 removed: the withdrawn pair chose REMOVED
      [4, "3NTN="], // a real result always stands
    ]);
    // The empty seat is not a contestant, so it is out of the ranking.
    expect(ruled.excludedFromRanking.has("A2EW")).toBe(true);
  });
});
