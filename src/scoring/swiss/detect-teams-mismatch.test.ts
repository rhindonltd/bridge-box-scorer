import { describe, it, expect } from "vitest";
import { detectTeamsRoundMismatches } from "./detect-teams-mismatch";
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
