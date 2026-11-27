import { describe, expect, it } from "vitest";

import { scoreEvent, type EventSettings } from "./score-event";
import type { MatchRow, ResultRow } from "@/model/result-row";
import type { AssignedPair, AssignedTeam } from "@/model/participants";
import type { RuledEvent } from "@/model/ruled-event";
import type { BoardOutcome } from "@/model/score";

function row(overrides: Partial<ResultRow>): ResultRow {
  return {
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
    status: "CONFIRMED",
    seatsSwapped: false,
    ...overrides,
  };
}

function match(overrides: Partial<MatchRow>): MatchRow {
  return {
    id: 1,
    section: "A",
    roundNumber: 1,
    kind: "PAIRS",
    scoredAsUnit: false,
    home: "A1NS",
    opponent: null,
    groupId: null,
    slot: null,
    vpPool: 20,
    boardStart: 1,
    boardEnd: 1,
    ruling: null,
    ...overrides,
  };
}

function ruled(rows: ResultRow[], matches: MatchRow[] = []): RuledEvent {
  return { rows, matches, excludedFromRanking: new Set(), withdrawals: [] };
}

const noParticipants = { pairs: [] as AssignedPair[], teams: [] };

describe("scoreEvent detail: board-pooled pairs", () => {
  const event: EventSettings = {
    gameType: "PAIRS",
    scoringType: "MP",
    movement: null,
    combinedRanking: true,
    combinedLabel: "game-1",
  };

  it("reports every scored line with its table, lead and the figures the standings sum", () => {
    const rows = [
      row({
        tableNumber: 1,
        ns: "A1NS",
        ew: "A1EW",
        confirmedResult: "4SN=" as BoardOutcome,
        confirmedLead: "HK",
      }),
      row({
        tableNumber: 2,
        ns: "A2NS",
        ew: "A2EW",
        confirmedResult: "3NTN=" as BoardOutcome,
        directorOverrideLead: "D2",
        confirmedLead: "C3",
      }),
    ];

    const score = scoreEvent(event, ruled(rows), noParticipants);

    // One field (the single section, scored as section and combined).
    const lines = score.lines.filter((l) => l.field === "A");
    expect(lines).toHaveLength(2);
    expect(lines[0]).toMatchObject({
      tableNumber: 1,
      ns: "A1NS",
      ew: "A1EW",
      outcome: "4SN=",
      lead: "HK",
      nsScore: 420,
      nsValue: 2,
      ewValue: 0,
      top: 2,
    });
    // A director-corrected lead wins over the confirmed one.
    expect(lines[1].lead).toBe("D2");

    // Each pair's line figures add up to its standings total.
    const standings = score.sections[0].overallScore;
    for (const line of standings.lines) {
      if (!("totalMP" in line)) throw new Error("expected MP lines");
      const own = lines
        .filter((l) => l.ns === line.pairId || l.ew === line.pairId)
        .map((l) => (l.ns === line.pairId ? l.nsValue : l.ewValue));
      expect(own.reduce((a, b) => a + b, 0)).toBe(line.totalMP);
    }
  });
});

describe("scoreEvent detail: Swiss Pairs", () => {
  it("reports each match with its Victory Points and its board rows", () => {
    const event: EventSettings = {
      gameType: "PAIRS",
      scoringType: "XIMP",
      movement: {
        source: "SWISS",
        swiss: { tables: 2, rounds: 1, boardsPerRound: 1 },
      },
      combinedRanking: true,
      combinedLabel: "game-1",
    };
    const rows = [
      row({
        tableNumber: 1,
        ns: "A1",
        ew: "A3",
        confirmedResult: "4SN+1" as BoardOutcome,
        matchId: 1,
      }),
      row({
        tableNumber: 2,
        ns: "A2",
        ew: "A4",
        confirmedResult: "4SN=" as BoardOutcome,
        matchId: 2,
      }),
    ];
    const matches = [
      match({ id: 1, home: "A1", opponent: "A3" }),
      match({ id: 2, home: "A2", opponent: "A4" }),
    ];

    const score = scoreEvent(event, ruled(rows, matches), noParticipants);

    const section = score.pairsMatches.filter((m) => m.field === "A");
    expect(section).toHaveLength(2);
    const first = section.find((m) => m.ns === "A1")!;
    expect(first).toMatchObject({ section: "A", round: 1, ew: "A3" });
    expect(first.nsVp + first.ewVp).toBe(20);
    expect(first.boards).toEqual([
      expect.objectContaining({
        tableNumber: 1,
        outcome: "4SN+1",
        nsScore: 450,
      }),
    ]);

    // The match VP is what the standings credit for the round.
    const standings = score.sections[0].overallScore;
    const a1 = standings.lines.find((l) => "pairId" in l && l.pairId === "A1");
    expect(a1 && "vpByRound" in a1 && a1.vpByRound[1]).toBe(first.nsVp);
  });
});

describe("scoreEvent detail: teams", () => {
  it("reports a board played in only one room with no away room", () => {
    const event: EventSettings = {
      gameType: "TEAMS",
      scoringType: "IMP_VP",
      movement: { source: "TEAMS_SPEC", specId: 1, boardsPerRound: 3 },
      combinedRanking: true,
      combinedLabel: "game-1",
    };
    const rows = [
      // Board 1, both rooms.
      row({
        tableNumber: 1,
        ns: "A1NS",
        ew: "A2EW",
        confirmedResult: "3NTN+1" as BoardOutcome,
      }),
      row({
        tableNumber: 2,
        ns: "A2NS",
        ew: "A1EW",
        confirmedResult: "3NTN=" as BoardOutcome,
      }),
      // Board 2, only team 1's home room so far.
      row({
        boardNumber: 2,
        tableNumber: 1,
        ns: "A1NS",
        ew: "A2EW",
        confirmedResult: "4SN=" as BoardOutcome,
      }),
      // Board 3, only team 2's home room (the away room for team 1).
      row({
        boardNumber: 3,
        tableNumber: 2,
        ns: "A2NS",
        ew: "A1EW",
        confirmedResult: "2HE-1" as BoardOutcome,
      }),
    ];
    const matches = [
      match({
        kind: "TEAMS",
        scoredAsUnit: true,
        home: "A1NS",
        opponent: "A2NS",
        boardEnd: 3,
      }),
    ];
    const teams = [
      { id: "A1NS", name: "Team 1" },
      { id: "A2NS", name: "Team 2" },
    ] as unknown as AssignedTeam[];

    const score = scoreEvent(event, ruled(rows, matches), {
      pairs: [],
      teams,
    });

    const [m] = score.teamMatches.filter((t) => t.field === "A");
    expect(m).toMatchObject({
      section: "A",
      round: 1,
      triple: null,
      home: "A1NS",
      opponent: "A2NS",
      boardsPlayed: 1,
      void: false,
    });
    expect(m.boards[0]).toMatchObject({
      boardNumber: 1,
      home: 1,
      homeRoom: expect.objectContaining({ tableNumber: 1, nsScore: 430 }),
      awayRoom: expect.objectContaining({ tableNumber: 2, nsScore: 400 }),
    });
    expect(m.boards[1]).toMatchObject({
      boardNumber: 2,
      home: null,
      homeRoom: expect.objectContaining({ tableNumber: 1 }),
      awayRoom: null,
    });
    expect(m.boards[2]).toMatchObject({
      boardNumber: 3,
      home: null,
      homeRoom: null,
      awayRoom: expect.objectContaining({ tableNumber: 2 }),
    });

    // The recorded VP is what the standings credit.
    const standings = score.sections[0].overallScore;
    const t1 = standings.lines.find(
      (l) => "teamId" in l && l.teamId === "A1NS",
    );
    expect(t1 && "totalVP" in t1 && t1.totalVP).toBe(m.homeScore);
  });
});
