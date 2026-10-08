import { describe, it, expect } from "vitest";
import {
  detectTeamsRoundMismatches,
  detectTripleMismatches,
} from "./detect-teams-mismatch";
import {
  drawSwissTeamsRound,
  type TeamId,
} from "@/movement/swiss-teams/swiss-teams-pairing";

/** The ordinary pairing the teams engine gives for an even standings order. */
function correctOpponents(order: TeamId[]): Map<TeamId, TeamId> {
  const draw = drawSwissTeamsRound({
    teams: order.length,
    standings: order,
    playedOpponents: new Set(),
    oddRound: "BYE",
  });
  const map = new Map<TeamId, TeamId>();
  for (const m of draw.matches) {
    map.set(m.a, m.b);
    map.set(m.b, m.a);
  }
  return map;
}

describe("detectTeamsRoundMismatches", () => {
  it("flags a team whose committed opponent is > 5 VP from the correct one", () => {
    // Corrected ordinary order 1,2,3,4,5,6 → correct draw 1v2, 3v4, 5v6.
    const order: TeamId[] = [1, 2, 3, 4, 5, 6];
    // Committed instead paired 1v4 (swap with the 3v4 table): 1↔4, 3↔2, 5↔6.
    const committed = new Map<TeamId, TeamId>([
      [1, 4],
      [4, 1],
      [3, 2],
      [2, 3],
      [5, 6],
      [6, 5],
    ]);
    const vp = new Map<TeamId, number>([
      [1, 15],
      [2, 8], // correct opp of 1
      [3, 10],
      [4, 18], // actual opp of 1 → 18-8 = 10 (> 5), HIGHER
      [5, 9],
      [6, 7],
    ]);

    const candidates = detectTeamsRoundMismatches({
      roundNumber: 3,
      teams: 6,
      orderedOrdinary: order,
      playedOpponents: new Set(),
      committedOpponentByTeam: committed,
      currentVpByTeam: vp,
      excludedTeams: new Set(),
    });

    const t1 = candidates.find((c) => c.mismatchedTeam === 1);
    expect(t1).toBeDefined();
    expect(t1!.actualOpponent).toBe(4);
    expect(t1!.correctOpponent).toBe(2);
    expect(t1!.direction).toBe("HIGHER");
  });

  it("excludes teams in the round's triple/bye set", () => {
    const order: TeamId[] = [1, 2, 3, 4];
    // Committed 1v4, 2v3 (swapped from the correct 1v2, 3v4).
    const committed = new Map<TeamId, TeamId>([
      [1, 4],
      [4, 1],
      [2, 3],
      [3, 2],
    ]);
    const vp = new Map<TeamId, number>([
      [1, 10],
      [2, 2],
      [3, 10],
      [4, 20],
    ]);

    // Team 1 is in the triple this round → no candidate for it (nor against it).
    const candidates = detectTeamsRoundMismatches({
      roundNumber: 2,
      teams: 4,
      // Reduced ordinary field would normally exclude 1; here the correct draw
      // is computed on the full order but team 1 is excluded from candidates.
      orderedOrdinary: order,
      playedOpponents: new Set(),
      committedOpponentByTeam: committed,
      currentVpByTeam: vp,
      excludedTeams: new Set([1, 4]),
    });

    expect(candidates.every((c) => c.mismatchedTeam !== 1)).toBe(true);
    expect(candidates.every((c) => c.actualOpponent !== 1)).toBe(true);
  });

  it("flags nothing when committed matches the correct draw", () => {
    const order: TeamId[] = [1, 2, 3, 4, 5, 6];
    const committed = correctOpponents(order);
    const vp = new Map<TeamId, number>([
      [1, 20],
      [2, 0],
      [3, 15],
      [4, 5],
      [5, 11],
      [6, 9],
    ]);

    const candidates = detectTeamsRoundMismatches({
      roundNumber: 2,
      teams: 6,
      orderedOrdinary: order,
      playedOpponents: new Set(),
      committedOpponentByTeam: committed,
      currentVpByTeam: vp,
      excludedTeams: new Set(),
    });
    expect(candidates).toHaveLength(0);
  });

  it("does not flag a swap within the 5 VP threshold", () => {
    const order: TeamId[] = [1, 2, 3, 4, 5, 6];
    const committed = new Map<TeamId, TeamId>([
      [1, 4],
      [4, 1],
      [3, 2],
      [2, 3],
      [5, 6],
      [6, 5],
    ]);
    const vp = new Map<TeamId, number>([
      [1, 12],
      [2, 10],
      [3, 10],
      [4, 15], // 15 - 10 = 5, not > 5
      [5, 9],
      [6, 7],
    ]);

    const candidates = detectTeamsRoundMismatches({
      roundNumber: 3,
      teams: 6,
      orderedOrdinary: order,
      playedOpponents: new Set(),
      committedOpponentByTeam: committed,
      currentVpByTeam: vp,
      excludedTeams: new Set(),
    });
    expect(candidates).toHaveLength(0);
  });

  it("returns nothing for an odd ordinary field", () => {
    const candidates = detectTeamsRoundMismatches({
      roundNumber: 2,
      teams: 5,
      orderedOrdinary: [1, 2, 3],
      playedOpponents: new Set(),
      committedOpponentByTeam: new Map(),
      currentVpByTeam: new Map(),
      excludedTeams: new Set(),
    });
    expect(candidates).toHaveLength(0);
  });
});

describe("detectTripleMismatches", () => {
  // A committed triple {3,4,5}; comparisons 3-4 (board 20), 3-5 (board 25),
  // 4-5 (board 30). The corrected trio is {4,5,6} (team 3 should be out, team 6
  // in). So teams 4 and 5 each faced team 3 when they should have faced team 6.
  const comparisons = [
    { low: 3, high: 4, boardStart: 20, boardEnd: 22 },
    { low: 3, high: 5, boardStart: 25, boardEnd: 27 },
    { low: 4, high: 5, boardStart: 30, boardEnd: 32 },
  ];

  it("flags a team that faced the wrong third team (> 5 VP gap)", () => {
    const vp = new Map<TeamId, number>([
      [3, 2], // the wrong opponent (committed, dropped from correct trio)
      [4, 10],
      [5, 10],
      [6, 18], // the correct opponent → |2 - 18| = 16 > 5
    ]);

    const candidates = detectTripleMismatches({
      roundNumber: 4,
      committedMembers: [3, 4, 5],
      correctMembers: [4, 5, 6],
      comparisons,
      currentVpByTeam: vp,
    });

    // Teams 4 and 5 each faced team 3 (wrong) instead of team 6 (correct).
    const t4 = candidates.find((c) => c.mismatchedTeam === 4);
    const t5 = candidates.find((c) => c.mismatchedTeam === 5);
    expect(t4).toBeDefined();
    expect(t4!.actualOpponent).toBe(3);
    expect(t4!.correctOpponent).toBe(6);
    expect(t4!.direction).toBe("LOWER"); // actual (2) < correct (18)
    // The board pins comparison 3-4 (board 20), so the ruling hits that match.
    expect(t4!.boardNumber).toBe(20);
    expect(t5).toBeDefined();
    expect(t5!.actualOpponent).toBe(3);
    expect(t5!.boardNumber).toBe(25); // comparison 3-5
    // Team 3 was dropped from the correct trio → not reported (manual ruling).
    expect(candidates.every((c) => c.mismatchedTeam !== 3)).toBe(true);
  });

  it("flags nothing when the committed trio equals the correct trio", () => {
    const candidates = detectTripleMismatches({
      roundNumber: 4,
      committedMembers: [3, 4, 5],
      correctMembers: [3, 4, 5],
      comparisons,
      currentVpByTeam: new Map([
        [3, 1],
        [4, 20],
        [5, 10],
      ]),
    });
    expect(candidates).toHaveLength(0);
  });

  it("does not flag a wrong-third-team swap within the 5 VP threshold", () => {
    const vp = new Map<TeamId, number>([
      [3, 13], // wrong opponent
      [4, 10],
      [5, 10],
      [6, 18], // correct opponent → |13 - 18| = 5, not > 5
    ]);
    const candidates = detectTripleMismatches({
      roundNumber: 4,
      committedMembers: [3, 4, 5],
      correctMembers: [4, 5, 6],
      comparisons,
      currentVpByTeam: vp,
    });
    expect(candidates).toHaveLength(0);
  });
});
