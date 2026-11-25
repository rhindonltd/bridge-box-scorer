import { describe, it, expect } from "vitest";
import { travellerViews, leaderboardViews } from "./views";
import { scoreBoard } from "@/modules/scoring/traveller/score-traveller";
import { mpBoard1 } from "@/mocks/fixtures/mp-travellers";
import { impBoard1 } from "@/mocks/fixtures/ximp-travellers";
import type { OverallScoreAndParticipant } from "@/model/leaderboard";
import type { AssignedPair, AssignedTeam, Pair } from "@/model/participants";

const pair = {
  type: "PAIR",
  id: "1",
  initialSeat: "A1NS",
  player1: { id: 1, firstName: "Ann", lastName: "Smith", nationalId: null },
  player2: { id: 2, firstName: "Ben", lastName: "Jones", nationalId: null },
} as AssignedPair;

function seatedPair(seat: string): Pair {
  return {
    type: "PAIR",
    initialSeat: seat as Pair["initialSeat"],
    player1: { id: 1, firstName: "A", lastName: "One", nationalId: null },
    player2: { id: 2, firstName: "B", lastName: "Two", nationalId: null },
  };
}

const team: AssignedTeam = {
  type: "TEAM",
  id: "A1",
  name: "Aces",
  pair1: seatedPair("A1NS"),
  pair2: seatedPair("A1EW"),
} as AssignedTeam;

const standingsByType = {
  PAIR_MP: {
    type: "PAIR_MP",
    overallScore: {
      type: "PAIR_MP",
      mode: "PAIR",
      scoring: "MP",
      lines: [{ pairId: "1", totalMP: 10, maxMP: 20, rank: 1, tied: false }],
    },
    participants: [pair],
  },
  PAIR_XIMP: {
    type: "PAIR_XIMP",
    overallScore: {
      type: "PAIR_XIMP",
      mode: "PAIR",
      scoring: "XIMP",
      lines: [{ pairId: "1", crossImps: 1.5, rank: 1, tied: false }],
    },
    participants: [pair],
  },
  PAIR_SWISS_VP: {
    type: "PAIR_SWISS_VP",
    overallScore: {
      type: "PAIR_SWISS_VP",
      mode: "PAIR",
      scoring: "SWISS_VP",
      lines: [
        {
          pairId: "1",
          totalVP: 12,
          vpByRound: { 1: 12 },
          rank: 1,
          tied: false,
        },
      ],
    },
    participants: [pair],
  },
  TEAM_SWISS_VP: {
    type: "TEAM_SWISS_VP",
    overallScore: {
      type: "TEAM_SWISS_VP",
      mode: "TEAM",
      scoring: "SWISS_VP",
      lines: [
        {
          teamId: "A1",
          totalVP: 10,
          vpByRound: { 1: 10 },
          rank: 1,
          tied: false,
        },
      ],
    },
    participants: [team],
  },
  TEAM_BAM: {
    type: "TEAM_BAM",
    overallScore: {
      type: "TEAM_BAM",
      mode: "TEAM",
      scoring: "BAM",
      barometer: false,
      lines: [
        {
          teamId: "A1",
          totalWon: 1,
          totalPlayed: 2,
          byRound: {},
          rank: 1,
          tied: false,
        },
      ],
    },
    participants: [team],
  },
} as unknown as Record<string, OverallScoreAndParticipant>;

describe("travellerViews", () => {
  it("gives the matchpoint views for an MP board, the percentage first", () => {
    const scored = scoreBoard(mpBoard1, "MP");
    const views = travellerViews(scored);
    expect(views.map((v) => v.id)).toEqual(["percentage", "matchpoints"]);
    const table = views[0].toTable(scored, { hideSection: true });
    expect(table.columns.map((c) => c.label)).toContain("NS %");
    expect(table.rows.length).toBeGreaterThan(0);
  });

  it("gives the Cross-IMP view for a Cross-IMP board", () => {
    const scored = scoreBoard(impBoard1, "XIMP");
    expect(travellerViews(scored).map((v) => v.id)).toEqual(["cross-imps"]);
  });

  it("gives the IMP view for a teams board", () => {
    const scored = scoreBoard(mpBoard1, "IMP");
    const [view] = travellerViews(scored);
    expect(view.id).toBe("imps");
    expect(view.toTable(scored).columns.map((c) => c.label)).toContain(
      "NS IMP",
    );
  });
});

describe("leaderboardViews", () => {
  it.each([
    ["PAIR_MP", ["percentage", "matchpoints"]],
    ["PAIR_XIMP", ["cross-imps"]],
    ["PAIR_SWISS_VP", ["vp"]],
    ["TEAM_SWISS_VP", ["vp"]],
    ["TEAM_BAM", ["percentage", "points"]],
  ])("gives %s its views and builds a row per line", (type, ids) => {
    const standings = standingsByType[type];
    const views = leaderboardViews(standings);
    expect(views.map((v) => v.id)).toEqual(ids);
    for (const view of views) {
      expect(view.toTable(standings).rows).toHaveLength(1);
    }
  });

  it("reads the type from the score for a two-winner direction, which has none", () => {
    // A two-winner Mitchell's NS / EW rankings carry only the score and pairs.
    const { overallScore, participants } = standingsByType.PAIR_MP;
    const direction = {
      overallScore,
      participants,
    } as OverallScoreAndParticipant;
    const views = leaderboardViews(direction);
    expect(views.map((v) => v.id)).toEqual(["percentage", "matchpoints"]);
    expect(views[0].toTable(direction).rows).toHaveLength(1);
  });

  it.each(["PAIR_MP", "PAIR_XIMP", "PAIR_SWISS_VP"])(
    "refuses to build a %s view from different standings",
    (type) => {
      const [view] = leaderboardViews(standingsByType[type]);
      expect(() => view.toTable(standingsByType.TEAM_SWISS_VP)).toThrow(
        /different standings type, got "TEAM_SWISS_VP"/,
      );
    },
  );
});
