import { describe, it, expect, vi } from "vitest";

vi.mock("@/db/games", () => ({
  getDb: vi.fn(),
}));

import type { MovementPlan } from "@/model/movement-plan";
import {
  buildSectionRows,
  sectionParticipantId,
  materializePairLikeMovement,
  materializeSections,
  resolveMatchIds,
} from "./materialize-movement";
import { getDb } from "@/db/games";

describe("sectionParticipantId", () => {
  it("prefixes the movement id with the section letter", () => {
    expect(sectionParticipantId("A", "1NS")).toBe("A1NS");
    expect(sectionParticipantId("B", "13")).toBe("B13");
  });
});

describe("buildSectionRows", () => {
  it("expands each round into one board row per board number", () => {
    const movement: MovementPlan = [
      {
        tableNumber: 1,
        rounds: [
          { roundNumber: 1, ns: "1NS", ew: "1EW", boardStart: 1, boardEnd: 2 },
        ],
      },
    ];

    const { boardRows } = buildSectionRows("A", movement);

    expect(boardRows).toHaveLength(2);
    expect(boardRows[0]).toMatchObject({
      section: "A",
      roundNumber: 1,
      tableNumber: 1,
      boardNumber: 1,
      copy: "A",
      ns: "A1NS",
      ew: "A1EW",
      status: "NOT_PLAYED",
    });
    expect(boardRows[1].boardNumber).toBe(2);
  });

  it("numbers each board's place in play when the table starts on its own board", () => {
    const movement: MovementPlan = [
      {
        tableNumber: 2,
        rounds: [
          {
            roundNumber: 1,
            ns: "2NS",
            ew: "1EW",
            boardStart: 1,
            boardEnd: 4,
            firstBoard: 3,
          },
          { roundNumber: 2, ns: "2NS", ew: "3EW", boardStart: 5, boardEnd: 6 },
        ],
      },
    ];

    const { boardRows } = buildSectionRows("A", movement);

    expect(
      boardRows.map((b) => [b.roundNumber, b.boardNumber, b.playOrder]),
    ).toEqual([
      [1, 1, 3],
      [1, 2, 4],
      [1, 3, 1],
      [1, 4, 2],
      // A round played in board order leaves the order unset.
      [2, 5, undefined],
      [2, 6, undefined],
    ]);
  });

  it("only derives seat anchors from round 1, section-qualified and seated", () => {
    const movement: MovementPlan = [
      {
        tableNumber: 2,
        rounds: [
          { roundNumber: 1, ns: "5", ew: "9", boardStart: 1, boardEnd: 1 },
          { roundNumber: 2, ns: "6", ew: "10", boardStart: 2, boardEnd: 2 },
        ],
      },
    ];

    const { anchors } = buildSectionRows("B", movement);

    // Round 1 maps each physical seat to the board id ("anchor") written to its
    // rows. Table 2: NS seat B2NS -> board id B5, EW seat B2EW -> board id B9.
    expect(anchors).toEqual([
      { seat: "B2NS", anchorId: "B5" },
      { seat: "B2EW", anchorId: "B9" },
    ]);
  });

  it("marks sit-out rounds with SIT_OUT status but still produces board rows", () => {
    const movement: MovementPlan = [
      {
        tableNumber: 3,
        rounds: [
          {
            roundNumber: 2,
            ns: "1",
            ew: "2",
            boardStart: 3,
            boardEnd: 4,
            sitOut: true,
          },
        ],
      },
    ];

    const { boardRows } = buildSectionRows("A", movement);

    expect(boardRows).toHaveLength(2);
    expect(boardRows.every((r) => r.status === "SIT_OUT")).toBe(true);
  });

  it("honours an explicit board copy (Web Mitchell) and defaults to A otherwise", () => {
    const movement: MovementPlan = [
      {
        tableNumber: 1,
        rounds: [
          {
            roundNumber: 1,
            ns: "1",
            ew: "2",
            boardStart: 1,
            boardEnd: 1,
            boardCopy: "B",
          },
          { roundNumber: 2, ns: "1", ew: "3", boardStart: 2, boardEnd: 2 },
        ],
      },
    ];

    const { boardRows } = buildSectionRows("A", movement);

    expect(boardRows[0].copy).toBe("B");
    expect(boardRows[1].copy).toBe("A");
  });

  it("returns empty rows for an empty movement", () => {
    const { boardRows, anchors } = buildSectionRows("A", []);
    expect(boardRows).toEqual([]);
    expect(anchors).toEqual([]);
  });
});

describe("resolveMatchIds", () => {
  const matchDraft = { tempKey: "m1", section: "A", roundNumber: 1 };
  const boardDraft = { matchTempKey: "m1", boardNumber: 1 };
  it("swaps each board's temp match key for the inserted match id", () => {
    const insertMatch = vi.fn(() => 42);
    const rows = resolveMatchIds(
      [matchDraft] as never,
      [boardDraft] as never,
      insertMatch,
    );
    expect(rows).toEqual([{ boardNumber: 1, matchId: 42 }]);
    expect(insertMatch).toHaveBeenCalledWith({ section: "A", roundNumber: 1 });
  });
  it("throws for a board whose match was never inserted", () => {
    expect(() =>
      resolveMatchIds(
        [matchDraft] as never,
        [{ ...boardDraft, matchTempKey: "other" }] as never,
        () => 1,
      ),
    ).toThrow("No match row for board key other");
  });
});
describe("materializePairLikeMovement", () => {
  it("throws when the game db does not exist", async () => {
    vi.mocked(getDb).mockResolvedValue(undefined as any);

    const movement: MovementPlan = [
      {
        tableNumber: 1,
        rounds: [
          { roundNumber: 1, ns: "1", ew: "2", boardStart: 1, boardEnd: 1 },
        ],
      },
    ];

    await expect(
      materializePairLikeMovement("A", movement, "missing-game"),
    ).rejects.toThrow("Game db does not exist");
  });

  it("skips inserts when there are no board or assignment rows", async () => {
    const insert = vi.fn();
    const tx = { insert };
    const transaction = vi.fn((cb: (tx: unknown) => void) => cb(tx));
    vi.mocked(getDb).mockResolvedValue({ transaction } as any);

    // Empty movement -> buildSectionRows returns empty arrays, so both the
    // boardRows and assignmentRows `if (... > 0)` guards take the false branch.
    await materializePairLikeMovement("A", [], "empty-game");

    expect(transaction).toHaveBeenCalledTimes(1);
    expect(insert).not.toHaveBeenCalled();
  });
});

describe("materializeSections", () => {
  it("throws when the game db does not exist", async () => {
    vi.mocked(getDb).mockResolvedValue(undefined as any);

    const movement: MovementPlan = [
      {
        tableNumber: 1,
        rounds: [
          { roundNumber: 1, ns: "1", ew: "2", boardStart: 1, boardEnd: 1 },
        ],
      },
    ];

    await expect(
      materializeSections("missing-game", [{ section: "A", movement }]),
    ).rejects.toThrow("Game db does not exist");
  });

  it("skips inserts when there are no board or assignment rows", async () => {
    const insert = vi.fn();
    const tx = { insert };
    const transaction = vi.fn((cb: (tx: unknown) => void) => cb(tx));
    vi.mocked(getDb).mockResolvedValue({ transaction } as any);

    // No sections -> both aggregated arrays stay empty, taking the false
    // branch of both insert guards inside the transaction.
    await materializeSections("empty-game", []);

    expect(transaction).toHaveBeenCalledTimes(1);
    expect(insert).not.toHaveBeenCalled();
  });
});
