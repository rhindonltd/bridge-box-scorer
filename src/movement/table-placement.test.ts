import { describe, it, expect } from "vitest";

import { buildTablePlacement, withRelay } from "./table-placement";
import { generatedToMovementByTable } from "./movementData";
import { generateMitchell } from "./mitchell/mitchell";
import type { MovementByTable } from "./movementData";

describe("buildTablePlacement", () => {
  it("returns each table's round-1 board range for a standard Mitchell", () => {
    const tables = generatedToMovementByTable(
      generateMitchell({ tables: 5, rounds: 5, boardsPerRound: 2 }),
    );

    const placement = buildTablePlacement(tables);

    expect(placement.size).toBe(5);
    // Standard Mitchell round 1: table T plays set T => boards (T-1)*2+1..T*2.
    expect(placement.get(1)).toMatchObject({ boardStart: 1, boardEnd: 2 });
    expect(placement.get(3)).toMatchObject({ boardStart: 5, boardEnd: 6 });
    // No copies and no shares in a plain Mitchell.
    for (const p of placement.values()) {
      expect(p.boardCopy).toBeUndefined();
      expect(p.sharesWith).toBeUndefined();
    }
  });

  it("carries board copies and does not treat different copies as a share", () => {
    const tables = generatedToMovementByTable(
      generateMitchell({ tables: 8, rounds: 4, boardsPerRound: 3, web: true }),
    );

    const placement = buildTablePlacement(tables);

    // Every table has a copy label (A or B).
    for (const p of placement.values()) {
      expect(["A", "B"]).toContain(p.boardCopy);
    }

    // Web deliberately runs the same set number on copies A and B; those are
    // NOT a share (different physical decks), so no table should list a share
    // partner solely because another table plays the same set on the other
    // copy. Within a single copy every set number is distinct, so there are no
    // shares at all here.
    for (const p of placement.values()) {
      expect(p.sharesWith).toBeUndefined();
    }
  });

  it("detects a share when two tables play the identical round-1 set", () => {
    // Share-and-Relay: table 1 and the last table share the first board set.
    const tables = generatedToMovementByTable(
      generateMitchell({
        tables: 6,
        rounds: 6,
        boardsPerRound: 2,
        shareAndRelay: true,
      }),
    );

    const placement = buildTablePlacement(tables);

    // Table 1 and table 6 both play set 1 (boards 1-2) in round 1.
    expect(placement.get(1)).toMatchObject({ boardStart: 1, boardEnd: 2 });
    expect(placement.get(6)).toMatchObject({ boardStart: 1, boardEnd: 2 });
    expect(placement.get(1)?.sharesWith).toEqual([6]);
    expect(placement.get(6)?.sharesWith).toEqual([1]);

    // A middle table that plays a unique set does not share.
    expect(placement.get(2)?.sharesWith).toBeUndefined();
  });

  it("lists all partners when more than two tables collide on a set", () => {
    // Hand-built degenerate input: three tables all start on boards 1-2.
    const tables: MovementByTable[] = [
      { tableNumber: 1, rounds: [{ roundNumber: 1, boardStart: 1, boardEnd: 2 }] },
      { tableNumber: 2, rounds: [{ roundNumber: 1, boardStart: 1, boardEnd: 2 }] },
      { tableNumber: 3, rounds: [{ roundNumber: 1, boardStart: 1, boardEnd: 2 }] },
    ];

    const placement = buildTablePlacement(tables);

    expect(placement.get(1)?.sharesWith).toEqual([2, 3]);
    expect(placement.get(2)?.sharesWith).toEqual([1, 3]);
    expect(placement.get(3)?.sharesWith).toEqual([1, 2]);
  });

  it("skips tables with no rounds", () => {
    const tables: MovementByTable[] = [
      { tableNumber: 1, rounds: [{ roundNumber: 1, boardStart: 1, boardEnd: 2 }] },
      { tableNumber: 2, rounds: [] },
    ];

    const placement = buildTablePlacement(tables);

    expect(placement.has(1)).toBe(true);
    expect(placement.has(2)).toBe(false);
  });
});

describe("withRelay", () => {
  it("annotates the two middle tables of a Share-and-Relay", () => {
    const tables = generatedToMovementByTable(
      generateMitchell({
        tables: 6,
        rounds: 6,
        boardsPerRound: 2,
        shareAndRelay: true,
      }),
    );

    const placement = withRelay(buildTablePlacement(tables), {
      shareAndRelay: true,
      tables: 6,
    });

    // Relay sits between tables 3 and 4 (the two halves of a 6-table room).
    expect(placement.get(3)?.relayWith).toBe(4);
    expect(placement.get(4)?.relayWith).toBe(3);
    // No other table has a relay partner.
    expect(placement.get(1)?.relayWith).toBeUndefined();
    expect(placement.get(6)?.relayWith).toBeUndefined();
  });

  it("adds no relay for a non-share-and-relay movement", () => {
    const tables = generatedToMovementByTable(
      generateMitchell({ tables: 6, rounds: 6, boardsPerRound: 2 }),
    );

    const placement = withRelay(buildTablePlacement(tables), {
      shareAndRelay: false,
      tables: 6,
    });

    for (const p of placement.values()) {
      expect(p.relayWith).toBeUndefined();
    }
  });

  it("adds no relay for a seeded-style input even with an unplayed set gap", () => {
    // Seeded-style tables: sets 1, 2, 4 played, set 3 (boards 5-6) unplayed.
    // A bare gap must NOT be treated as a relay.
    const tables: MovementByTable[] = [
      { tableNumber: 1, rounds: [{ roundNumber: 1, boardStart: 1, boardEnd: 2 }] },
      { tableNumber: 2, rounds: [{ roundNumber: 1, boardStart: 3, boardEnd: 4 }] },
      { tableNumber: 3, rounds: [{ roundNumber: 1, boardStart: 7, boardEnd: 8 }] },
    ];

    const placement = withRelay(buildTablePlacement(tables), {
      shareAndRelay: false,
      tables: 3,
    });

    for (const p of placement.values()) {
      expect(p.relayWith).toBeUndefined();
    }
  });

  it("leaves an odd table count unannotated (no well-defined relay)", () => {
    const placement = withRelay(
      buildTablePlacement([
        { tableNumber: 1, rounds: [{ roundNumber: 1, boardStart: 1, boardEnd: 2 }] },
        { tableNumber: 2, rounds: [{ roundNumber: 1, boardStart: 3, boardEnd: 4 }] },
        { tableNumber: 3, rounds: [{ roundNumber: 1, boardStart: 5, boardEnd: 6 }] },
      ]),
      { shareAndRelay: true, tables: 3 },
    );

    for (const p of placement.values()) {
      expect(p.relayWith).toBeUndefined();
    }
  });
});
