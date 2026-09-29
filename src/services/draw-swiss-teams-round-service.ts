import "server-only";

import { getDb, type Db } from "@/db/games";
import { getSectionMovement } from "@/db/games/queries/get-section-movement";
import { computeSectionLeaderboards } from "@/services/leaderboard-service";
import { materializeSwissTeamsRound } from "@/services/materialize-swiss-teams-round";
import {
  drawSwissTeamsRound,
  teamIds,
  teamOpponentKey,
  type TeamId,
  type TeamsMatch,
  type TeamsTriangle,
} from "@/movement/swiss-teams/swiss-teams-pairing";
import {
  resolveSwissTeamsMatchNames,
  type NamedTeamsSeating,
} from "@/services/swiss-teams-seating-names";
import { SectionLetter, parseSeat } from "@/model/participants";

/**
 * Why a Swiss Teams draw could not proceed. Surfaced to the director so the
 * "Draw next round" control can explain the block.
 */
export type DrawSwissTeamsRejection =
  | "NOT_SWISS_TEAMS"
  | "ROUND_INCOMPLETE"
  | "EVENT_COMPLETE"
  | "ODD_TEAM_COUNT";

/**
 * A previewed (but NOT committed) Swiss Teams draw: the proposed matches (stable
 * team ids the client echoes back on commit), the odd-field resolution (bye or
 * triangle), resolved team names for display, and the repeat advisory. Nothing
 * is written to the DB by a preview.
 */
export type PreviewSwissTeamsResult =
  | {
      ok: true;
      roundNumber: number;
      teams: number;
      matches: TeamsMatch[];
      byeTeamId: TeamId | null;
      triangle: TeamsTriangle | null;
      named: NamedTeamsSeating;
      hadUnavoidableRepeat: boolean;
    }
  | { ok: false; reason: DrawSwissTeamsRejection };

/** Outcome of committing a Swiss Teams round. */
export type CommitSwissTeamsResult =
  | { ok: true; roundNumber: number }
  | { ok: false; reason: DrawSwissTeamsRejection | "INVALID_MATCHES" };

/** The current-round number and the matches already played, from board rows. */
interface SwissTeamsHistory {
  highestRound: number;
  playedOpponents: Set<string>;
  /** Teams that have already had a bye (recovered from SIT_OUT rows). */
  hadBye: Set<TeamId>;
  /** Teams that have already been in a triangle (recovered from 3-cycles). */
  hadTriangle: Set<TeamId>;
}

/**
 * Reduce a section's board rows to the Swiss Teams history the draw needs: the
 * highest round materialized so far, the set of team matchups already played,
 * the teams that have already had a bye, and the teams that have already been
 * in a triangle.
 *
 * A played match is recovered from each home table's row — the NS seat is the
 * home team and the EW seat encodes the opponent's home table. A bye is a
 * SIT_OUT row: its NS seat is the bye team's home table and its EW is a phantom
 * (not a real opponent), so it is recorded as a bye rather than a played match.
 * A triangle is three tables in one round whose home→opponent references form a
 * directed 3-cycle (A→B→C→A); its three teams are recorded as having had a
 * triangle. All three of a triangle's pairwise matchups are still recorded in
 * `playedOpponents` (each of the cycle's edges is an opponent key).
 */
async function getSwissTeamsHistory(
  db: Db,
  section: SectionLetter,
): Promise<SwissTeamsHistory> {
  const { boards } = await import("@/db/games/tables/boards");
  const { eq } = await import("drizzle-orm");

  const rows = await db
    .select({
      roundNumber: boards.roundNumber,
      ns: boards.ns,
      ew: boards.ew,
      status: boards.status,
    })
    .from(boards)
    .where(eq(boards.section, section));

  const playedOpponents = new Set<string>();
  const hadBye = new Set<TeamId>();
  let highestRound = 0;

  // Per-round home→opponent edges, used after the pass to detect triangles.
  const edgesByRound = new Map<number, Map<TeamId, TeamId>>();

  for (const row of rows) {
    highestRound = Math.max(highestRound, row.roundNumber);

    // A SIT_OUT row is a bye: record the sitting team, not a played match.
    if (row.status === "SIT_OUT") {
      try {
        hadBye.add(parseSeat(row.ns).tableNumber);
      } catch {
        // A non-seat NS id (should not occur) is skipped.
      }
      continue;
    }

    try {
      const home = parseSeat(row.ns);
      const away = parseSeat(row.ew);
      playedOpponents.add(teamOpponentKey(home.tableNumber, away.tableNumber));

      const edges =
        edgesByRound.get(row.roundNumber) ?? new Map<TeamId, TeamId>();
      edges.set(home.tableNumber, away.tableNumber);
      edgesByRound.set(row.roundNumber, edges);
    } catch {
      // A non-seat id (should not occur for teams) is skipped.
    }
  }

  const hadTriangle = recoverTriangleTeams(edgesByRound);

  return { highestRound, playedOpponents, hadBye, hadTriangle };
}

/**
 * Find every team that was in a triangle, from the per-round home→opponent
 * edges. A triangle is a directed 3-cycle x→y→z→x through three distinct
 * tables (an ordinary match is mutual, x→y and y→x, and is not a 3-cycle).
 */
function recoverTriangleTeams(
  edgesByRound: Map<number, Map<TeamId, TeamId>>,
): Set<TeamId> {
  const inTriangle = new Set<TeamId>();

  for (const edges of edgesByRound.values()) {
    for (const [x, y] of edges) {
      if (edges.get(y) === x) continue; // mutual = ordinary two-team match
      const z = edges.get(y);
      if (z === undefined) continue;
      if (edges.get(z) === x && new Set([x, y, z]).size === 3) {
        inTriangle.add(x);
        inTriangle.add(y);
        inTriangle.add(z);
      }
    }
  }

  return inTriangle;
}

/**
 * Whether a round is safe to draw from: every playable board has a final result
 * (CONFIRMED or OVERRIDDEN). A bye's SIT_OUT boards are never played, so they
 * count as complete (they don't block the next draw). An empty round is not
 * "complete".
 */
async function isRoundComplete(
  db: Db,
  section: SectionLetter,
  roundNumber: number,
): Promise<boolean> {
  const { boards } = await import("@/db/games/tables/boards");
  const { and, eq } = await import("drizzle-orm");

  const rows = await db
    .select({ status: boards.status })
    .from(boards)
    .where(
      and(eq(boards.section, section), eq(boards.roundNumber, roundNumber)),
    );

  if (rows.length === 0) return false;
  return rows.every(
    (r) =>
      r.status === "CONFIRMED" ||
      r.status === "OVERRIDDEN" ||
      r.status === "SIT_OUT",
  );
}

/**
 * Build the ranked team standings (best team first) as stable team ids from the
 * section leaderboard. The team overall lines are keyed by the team's home NS
 * seat (e.g. "A1NS"), already ranked; map each back to its home table number.
 * Any team not yet ranked is appended in id order so the field is complete.
 */
async function rankedStandings(
  db: Db,
  gameId: string,
  section: SectionLetter,
  teams: number,
): Promise<TeamId[]> {
  const sections = await computeSectionLeaderboards(db, gameId);
  const sectionBoard = sections.find((s) => s.section === section);

  const ordered: TeamId[] = [];
  const seen = new Set<TeamId>();

  if (sectionBoard) {
    for (const line of sectionBoard.overallScore.lines as {
      teamId: string;
    }[]) {
      try {
        const id = parseSeat(line.teamId).tableNumber;
        if (!seen.has(id)) {
          ordered.push(id);
          seen.add(id);
        }
      } catch {
        // Skip a non-seat team id (should not occur).
      }
    }
  }

  for (const id of teamIds(teams)) {
    if (!seen.has(id)) {
      ordered.push(id);
      seen.add(id);
    }
  }

  return ordered;
}

/** Everything needed to draw or validate the next teams round after checks pass. */
interface TeamsDrawContext {
  db: Db;
  teams: number;
  boardsPerRound: number;
  oddHandling: "BYE" | "TRIANGLE";
  nextRound: number;
  standings: TeamId[];
  playedOpponents: ReadonlySet<string>;
  hadBye: ReadonlySet<TeamId>;
  hadTriangle: ReadonlySet<TeamId>;
}

/**
 * Resolve and validate the preconditions for drawing the next Swiss Teams round
 * and assemble the pure-engine inputs. Returns a rejection reason when the
 * section isn't Swiss Teams, an odd field can't be resolved, the event is
 * complete, or the current round isn't fully scored — so both preview and
 * commit reject cleanly and identically.
 */
async function resolveTeamsDrawContext(
  gameId: string,
  section: SectionLetter,
): Promise<TeamsDrawContext | { reason: DrawSwissTeamsRejection }> {
  const db = await getDb(gameId);
  if (!db) {
    throw new Error("Game db does not exist");
  }

  const selected = await getSectionMovement(db, section);
  if (!selected || selected.source !== "SWISS_TEAMS") {
    return { reason: "NOT_SWISS_TEAMS" };
  }

  const {
    teams,
    rounds: totalRounds,
    boardsPerRound,
    oddHandling = "BYE",
  } = selected.swissTeams;

  // An odd field is resolved by a bye or a triangle (both supported); a
  // triangle needs at least three teams to form the three-way.
  if (teams % 2 !== 0 && oddHandling === "TRIANGLE" && teams < 3) {
    return { reason: "ODD_TEAM_COUNT" };
  }

  const { highestRound, playedOpponents, hadBye, hadTriangle } =
    await getSwissTeamsHistory(db, section);
  const currentRound = highestRound;

  if (currentRound >= totalRounds) {
    return { reason: "EVENT_COMPLETE" };
  }

  if (currentRound >= 1 && !(await isRoundComplete(db, section, currentRound))) {
    return { reason: "ROUND_INCOMPLETE" };
  }

  const standings = await rankedStandings(db, gameId, section, teams);

  return {
    db,
    teams,
    boardsPerRound,
    oddHandling,
    nextRound: currentRound + 1,
    standings,
    playedOpponents,
    hadBye,
    hadTriangle,
  };
}

/**
 * Compute (but do NOT commit) the next Swiss Teams round for a section.
 *
 * Runs the same preconditions as the commit, draws from current standings +
 * history (avoiding repeat opponents; byeing or triangling the bottom of the
 * field for an odd count), and resolves team names so the director can review
 * the proposed matches before accepting. Nothing is written and nothing is
 * broadcast. Since the current round is fully scored (a precondition),
 * standings are stable, so the preview matches what a subsequent commit of the
 * same draw would produce.
 */
export async function previewNextSwissTeamsRound(
  gameId: string,
  section: SectionLetter,
): Promise<PreviewSwissTeamsResult> {
  const ctx = await resolveTeamsDrawContext(gameId, section);
  if ("reason" in ctx) {
    return { ok: false, reason: ctx.reason };
  }

  const draw = drawSwissTeamsRound({
    teams: ctx.teams,
    standings: ctx.standings,
    playedOpponents: ctx.playedOpponents,
    oddHandling: ctx.oddHandling,
    hadBye: ctx.hadBye,
    hadTriangle: ctx.hadTriangle,
  });

  const named = await resolveSwissTeamsMatchNames(
    ctx.db,
    section,
    draw.matches,
    draw.byeTeamId,
    draw.triangle,
  );

  return {
    ok: true,
    roundNumber: ctx.nextRound,
    teams: ctx.teams,
    matches: draw.matches,
    byeTeamId: draw.byeTeamId,
    triangle: draw.triangle,
    named,
    hadUnavoidableRepeat: draw.hadUnavoidableRepeat,
  };
}

/**
 * Whether a set of team matches (+ bye/triangle) is a structurally valid round
 * for a field of `teams` teams: every team appears exactly once across the
 * matches, the bye, and the triangle, and each is a real team id. Advisory
 * issues (a repeat pairing) are NOT checked here — those are the director's
 * call and don't block a commit.
 */
function isStructurallyValidTeamsRound(
  teams: number,
  matches: TeamsMatch[],
  byeTeamId: TeamId | null,
  triangle: TeamsTriangle | null,
): boolean {
  const seen: TeamId[] = [];
  for (const m of matches) seen.push(m.a, m.b);
  if (byeTeamId != null) seen.push(byeTeamId);
  if (triangle != null) seen.push(triangle.a, triangle.b, triangle.c);

  const expected = teamIds(teams);
  if (seen.length !== expected.length) return false;
  if (new Set(seen).size !== seen.length) return false;
  return seen.every((id) => id >= 1 && id <= teams);
}

/**
 * Commit the next Swiss Teams round with the EXACT matches the director
 * accepted. Re-checks the same preconditions (so a stale commit can't slip a
 * round in after the event moved on), then validates that the round is
 * structurally sound (every team placed exactly once). Materializes that round
 * — the open/closed-room board rows plus any bye sit-out or triangle — and
 * reports the round number. It does NOT advance the timer; the caller
 * broadcasts the live updates.
 *
 * Today the director cannot yet edit a teams draw, so the committed matches are
 * the previewed ones; taking them as an argument (rather than re-drawing) keeps
 * this ready for editing (option 3) without a further reshape.
 */
export async function commitNextSwissTeamsRound(
  gameId: string,
  section: SectionLetter,
  matches: TeamsMatch[],
  byeTeamId: TeamId | null,
  triangle: TeamsTriangle | null,
): Promise<CommitSwissTeamsResult> {
  const ctx = await resolveTeamsDrawContext(gameId, section);
  if ("reason" in ctx) {
    return { ok: false, reason: ctx.reason };
  }

  if (!isStructurallyValidTeamsRound(ctx.teams, matches, byeTeamId, triangle)) {
    return { ok: false, reason: "INVALID_MATCHES" };
  }

  await materializeSwissTeamsRound(
    gameId,
    section,
    ctx.nextRound,
    ctx.boardsPerRound,
    matches,
    byeTeamId,
    triangle,
  );

  return { ok: true, roundNumber: ctx.nextRound };
}
