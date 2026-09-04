import { describe, expect, it } from "vitest";
import {
  arrowSwitchSeat,
  buildPivotLayout,
  circulateMovingPairs,
  layoutToTables,
  Station,
  SeatOccupant,
} from "./hesitation-utils";

describe("circulateMovingPairs", () => {
  const stations: Station[] = [
    { table: 1, direction: "EW" },
    { table: 2, direction: "EW" },
    { table: 3, direction: "EW" },
  ];

  const pairForStation = (
    s: Station,
  ): Omit<SeatOccupant, "originStation"> => ({
    pair: s.table + 10,
    origin: "EW",
  });

  it("places each moving pair exactly once per round", () => {
    const occ = circulateMovingPairs(stations, 3, pairForStation);

    for (let r = 0; r < 3; r++) {
      const pairsThisRound = occ.map((stationRounds) => stationRounds[r].pair);
      expect(new Set(pairsThisRound).size).toBe(3);
    }
  });

  it("advances every pair one station per round", () => {
    const occ = circulateMovingPairs(stations, 3, pairForStation);

    // Station 0 in round 1 holds pair 11 (table 1 EW origin).
    expect(occ[0][0].pair).toBe(11);
    // In round 2 station 0 holds the pair that started one station earlier
    // in the ring (station 2 -> pair 13).
    expect(occ[0][1].pair).toBe(13);
    // In round 3 station 0 holds the pair from station 1 -> pair 12.
    expect(occ[0][2].pair).toBe(12);
  });

  it("returns each pair to its origin after a full cycle", () => {
    const occ = circulateMovingPairs(stations, 3, pairForStation);

    // After 3 rounds (== ring length) the layout is periodic: round 1 of the
    // next cycle would match round 1.
    for (let stationIdx = 0; stationIdx < 3; stationIdx++) {
      const originPair = occ[stationIdx][0].pair;
      // The pair three steps ahead ends back where it started.
      const afterFullCycle =
        occ[(stationIdx + 3) % 3][0].pair;
      expect(afterFullCycle).toBe(originPair);
    }
  });
});

describe("arrowSwitchSeat", () => {
  it("swaps NS and EW occupants", () => {
    const ns: SeatOccupant = { pair: 1, origin: "NS", originStation: null };
    const ew: SeatOccupant = { pair: 9, origin: "EW", originStation: 0 };

    expect(arrowSwitchSeat({ ns, ew })).toEqual({ ns: ew, ew: ns });
  });
});

describe("buildPivotLayout (7-table Hesitation Mitchell)", () => {
  const tables = 7;
  const rounds = 8;
  const pivot = 7;

  // Stationary NS at tables 1..6 = pairs 1..6.
  const stationaryNs = new Map<number, number>();
  for (let t = 1; t <= 6; t++) {
    stationaryNs.set(t, t);
  }

  // Moving ring: EW1..EW7 then NS at the pivot (table 7).
  const stations: Station[] = [];
  for (let t = 1; t <= 7; t++) {
    stations.push({ table: t, direction: "EW" });
  }
  stations.push({ table: pivot, direction: "NS" });

  // Round-1 identity: EW at table t = pair t + tables; NS at pivot = pair 7.
  const pairForStation = (
    s: Station,
  ): Omit<SeatOccupant, "originStation"> =>
    s.direction === "EW"
      ? { pair: s.table + tables, origin: "EW" }
      : { pair: s.table, origin: "NS" };

  const build = (arrowSwitchRounds: number) =>
    buildPivotLayout({
      tables,
      rounds,
      stationaryNs,
      stations,
      pairForStation,
      arrowSwitchRounds,
      pivotTables: new Set([pivot]),
    });

  it("has the right dimensions", () => {
    const layout = build(0);
    expect(layout.seatByTableRound).toHaveLength(7);
    for (const table of layout.seatByTableRound) {
      expect(table).toHaveLength(8);
    }
  });

  it("keeps stationary NS pairs fixed at their tables (no arrow switch)", () => {
    const layout = build(0);
    for (let t = 1; t <= 6; t++) {
      const nsPairs = layout.seatByTableRound[t - 1].map((seat) => seat.ns.pair);
      expect(new Set(nsPairs)).toEqual(new Set([t]));
    }
  });

  it("moves each EW pair through every EW table plus the pivot once", () => {
    const layout = build(0);

    // Track pair 8 (EW origin at table 1). It should appear at the pivot NS
    // seat exactly once across the movement.
    let pivotNsAppearances = 0;
    for (let r = 0; r < rounds; r++) {
      if (layout.seatByTableRound[pivot - 1][r].ns.pair === 8) {
        pivotNsAppearances++;
      }
    }
    expect(pivotNsAppearances).toBe(1);
  });

  it("does not seat two different pairs at the same seat/round twice over", () => {
    const layout = build(0);

    // Every (round) should have 7 distinct NS pairs and 7 distinct EW pairs.
    for (let r = 0; r < rounds; r++) {
      const nsPairs = layout.seatByTableRound.map((t) => t[r].ns.pair);
      const ewPairs = layout.seatByTableRound.map((t) => t[r].ew.pair);
      expect(new Set(nsPairs).size).toBe(7);
      expect(new Set(ewPairs).size).toBe(7);
    }
  });

  it("arrow switches all non-pivot tables in the final round only", () => {
    const plain = build(0);
    const switched = build(1);

    // The pivot table is unchanged.
    expect(switched.seatByTableRound[pivot - 1][rounds - 1]).toEqual(
      plain.seatByTableRound[pivot - 1][rounds - 1],
    );

    // Every non-pivot table has NS/EW swapped in the final round.
    for (let t = 1; t <= 6; t++) {
      const plainSeat = plain.seatByTableRound[t - 1][rounds - 1];
      const switchedSeat = switched.seatByTableRound[t - 1][rounds - 1];
      expect(switchedSeat.ns).toEqual(plainSeat.ew);
      expect(switchedSeat.ew).toEqual(plainSeat.ns);
    }

    // Earlier rounds are untouched.
    for (let t = 1; t <= 7; t++) {
      expect(switched.seatByTableRound[t - 1][0]).toEqual(
        plain.seatByTableRound[t - 1][0],
      );
    }
  });
});

describe("layoutToTables", () => {
  it("converts a layout into per-table rounds with board ranges and pair ids", () => {
    // A minimal 1-table, 2-round layout with stationary NS pair 1 and a single
    // EW station circulating a single pair.
    const layout = buildPivotLayout({
      tables: 1,
      rounds: 2,
      stationaryNs: new Map<number, number>([[1, 1]]),
      stations: [{ table: 1, direction: "EW" }],
      pairForStation: (s: Station): Omit<SeatOccupant, "originStation"> => ({
        pair: s.table + 10,
        origin: s.direction,
      }),
      arrowSwitchRounds: 0,
      pivotTables: new Set<number>(),
    });

    // Board set 1 for round 1, board set 2 for round 2, 2 boards per round.
    const boardSetByTableRound = [[1, 2]];

    const result = layoutToTables(layout, 2, boardSetByTableRound);

    expect(result.tables).toHaveLength(1);
    const table = result.tables[0];
    expect(table.table).toBe(1);
    expect(table.rounds).toHaveLength(2);
    expect(table.rounds[0]).toEqual({
      round: 1,
      boards: [1, 2],
      participants: { nsId: "1", ewId: "11" },
    });
    expect(table.rounds[1].round).toBe(2);
    expect(table.rounds[1].boards).toEqual([3, 4]);
    expect(table.rounds[1].participants.nsId).toBe("1");
  });
});

describe("buildPivotLayout — unresolvable seats", () => {
  const pairForStation = (
    s: Station,
  ): Omit<SeatOccupant, "originStation"> => ({
    pair: s.table,
    origin: s.direction,
  });

  it("throws when a table's NS seat has neither a moving nor a stationary pair", () => {
    // No stationary NS pair for table 1 and no station occupies its NS/EW
    // seat, so the NS seat cannot be resolved.
    expect(() =>
      buildPivotLayout({
        tables: 1,
        rounds: 1,
        stationaryNs: new Map<number, number>(),
        stations: [],
        pairForStation,
        arrowSwitchRounds: 0,
        pivotTables: new Set<number>(),
      }),
    ).toThrow("does not cover this seat");
  });

  it("throws when a table's EW seat has no moving pair", () => {
    // Table 1 has a stationary NS pair (so NS resolves) but no EW station,
    // leaving the EW seat unresolved.
    expect(() =>
      buildPivotLayout({
        tables: 1,
        rounds: 1,
        stationaryNs: new Map<number, number>([[1, 1]]),
        stations: [],
        pairForStation,
        arrowSwitchRounds: 0,
        pivotTables: new Set<number>(),
      }),
    ).toThrow("table 1 round 1 EW");
  });
});
