import { parseSeat } from "@/model/participants";
import type { SwissTeamsOddRound } from "@/model/selected-movement";
import {
  teamIds,
  type TeamId,
  type TeamsMatch,
} from "@/model/teams-match-layout";
import {
  continueLongTriple,
  roundOddResolution,
  type OddHandling,
  type OddRoundResolution,
  type TeamsTriple,
} from "@/modules/swiss/teams/swiss-teams-pairing";
import type { SwissTeamsTripleRecord } from "@/modules/swiss/teams/history";
import type { RankedStandings } from "@/modules/swiss/standings-decode";

/** A ranked standings line for a team, before names are resolved. */
export interface RankedSwissTeam {
  id: TeamId;
  total: number;
  rank: number;
  tied: boolean;
}

/**
 * The field in draw order (best team first) as stable team ids, from the
 * section's ranked standings. The team lines are keyed by the team's home NS
 * seat (e.g. "A1NS"), already ranked; each maps back to its home table number.
 * Any team not yet ranked is appended in id order so the field is complete.
 */
export function swissTeamsField(
  standings: RankedStandings | undefined,
  teams: number,
): { order: TeamId[]; ranked: RankedSwissTeam[] } {
  const order: TeamId[] = [];
  const ranked: RankedSwissTeam[] = [];
  const seen = new Set<TeamId>();

  if (standings) {
    // Lines are already ranked best-first and (for Swiss Teams VP) carry the
    // running VP total the field is ranked on plus its rank/tie flags.
    for (const line of standings.overallScore.lines as {
      teamId: string;
      totalVP?: number;
      rank: number;
      tied: boolean;
    }[]) {
      try {
        const id = parseSeat(line.teamId).tableNumber;
        if (!seen.has(id)) {
          order.push(id);
          ranked.push({
            id,
            total: line.totalVP ?? 0,
            rank: line.rank,
            tied: line.tied,
          });
          seen.add(id);
        }
      } catch {
        // Skip a non-seat team id (should not occur).
      }
    }
  }

  // Append any team not yet ranked, lowest priority, with a zero total.
  const lastRank = ranked.length > 0 ? ranked[ranked.length - 1].rank : 0;
  for (const id of teamIds(teams)) {
    if (!seen.has(id)) {
      order.push(id);
      ranked.push({ id, total: 0, rank: lastRank + 1, tied: false });
      seen.add(id);
    }
  }

  return { order, ranked };
}

/**
 * Resolve the next round's odd-team handling and, when it is the second slot of
 * a long triple, the fixed triple to reuse.
 *
 * A long triple occupies two adjacent plan entries sharing a `group`. If the
 * next round's entry is `{ kind: "LONG"; group g }` AND the PREVIOUS round's
 * entry is the same group, the next round is that triple's SECOND slot: its
 * three teams are fixed by the first slot (recovered from the triples played
 * so far), advanced to slot 2 via {@link continueLongTriple}. No fresh triple
 * is drawn. In every other case (bye, short, or a long triple's first slot)
 * there is no fixed triple.
 */
export function resolveTeamsOddRound(
  oddHandling: OddHandling,
  oddRoundPlan: SwissTeamsOddRound[] | undefined,
  nextRound: number,
  triples: SwissTeamsTripleRecord[],
): { oddRound: OddRoundResolution; fixedTriple: TeamsTriple | null } {
  const plan = oddRoundPlan as OddRoundResolution[] | undefined;
  const oddRound = roundOddResolution(oddHandling, plan, nextRound);

  if (typeof oddRound !== "object" || oddRound.kind !== "LONG") {
    return { oddRound, fixedTriple: null };
  }

  const prev = plan?.[nextRound - 2];
  const isSecondSlot =
    typeof prev === "object" &&
    prev.kind === "LONG" &&
    prev.group === oddRound.group;
  if (!isSecondSlot) {
    return { oddRound, fixedTriple: null };
  }

  // The first slot was the previous round; find that long triple's teams.
  const firstRound = nextRound - 1;
  const firstSlot = triples.find(
    (t) => t.kind === "LONG" && t.rounds.includes(firstRound),
  );
  if (!firstSlot) {
    // The first slot isn't recoverable yet (shouldn't happen once it is
    // materialized); fall back to drawing a fresh long triple.
    return { oddRound, fixedTriple: null };
  }

  const [a, b, c] = firstSlot.teams;
  const fixedTriple = continueLongTriple({
    a,
    b,
    c,
    kind: "LONG",
    group: oddRound.group,
    slot: 1,
  });
  return { oddRound, fixedTriple };
}

/**
 * Whether a set of team matches (+ bye/triple) is a structurally valid round
 * for a field of `teams` teams: every team appears exactly once across the
 * matches, the bye, and the triple, and each is a real team id. Advisory
 * issues (a repeat pairing) are NOT checked here — those are the director's
 * call and don't block a commit.
 */
export function isStructurallyValidTeamsRound(
  teams: number,
  matches: TeamsMatch[],
  byeTeamId: TeamId | null,
  triple: TeamsTriple | null,
): boolean {
  const seen: TeamId[] = [];
  for (const m of matches) seen.push(m.a, m.b);
  if (byeTeamId != null) seen.push(byeTeamId);
  if (triple != null) seen.push(triple.a, triple.b, triple.c);

  const expected = teamIds(teams);
  if (seen.length !== expected.length) return false;
  if (new Set(seen).size !== seen.length) return false;
  return seen.every((id) => id >= 1 && id <= teams);
}
