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
} from "@/movement/swiss-teams/swiss-teams-pairing";
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

/** Outcome of a Swiss Teams draw attempt: the drawn round, or a rejection. */
export type DrawSwissTeamsResult =
  | { ok: true; roundNumber: number; hadUnavoidableRepeat: boolean }
  | { ok: false; reason: DrawSwissTeamsRejection };

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

/**
 * Draw and materialize the next Swiss Teams round for a section.
 *
 * Preconditions (so the caller can reject cleanly): the section is a Swiss
 * Teams movement, the current round is fully scored, and the event has rounds
 * remaining. An odd team count is allowed when the movement's `oddHandling` is
 * "BYE" (a team sits out each round); the "TRIANGLE" alternative is not yet
 * implemented and is rejected. When all hold, it draws the next round from
 * current standings (avoiding repeat opponents, byeing the lowest-ranked team
 * without a prior bye when the field is odd), materializes its open/closed-room
 * board rows plus any bye sit-out, and reports whether a repeat was
 * unavoidable. It does NOT advance the timer.
 */
export async function drawNextSwissTeamsRound(
  gameId: string,
  section: SectionLetter,
): Promise<DrawSwissTeamsResult> {
  const db = await getDb(gameId);
  if (!db) {
    throw new Error("Game db does not exist");
  }

  const selected = await getSectionMovement(db, section);
  if (!selected || selected.source !== "SWISS_TEAMS") {
    return { ok: false, reason: "NOT_SWISS_TEAMS" };
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
    return { ok: false, reason: "ODD_TEAM_COUNT" };
  }

  const { highestRound, playedOpponents, hadBye, hadTriangle } =
    await getSwissTeamsHistory(db, section);
  const currentRound = highestRound;

  if (currentRound >= totalRounds) {
    return { ok: false, reason: "EVENT_COMPLETE" };
  }

  if (currentRound >= 1 && !(await isRoundComplete(db, section, currentRound))) {
    return { ok: false, reason: "ROUND_INCOMPLETE" };
  }

  const standings = await rankedStandings(db, gameId, section, teams);

  const draw = drawSwissTeamsRound({
    teams,
    standings,
    playedOpponents,
    oddHandling,
    hadBye,
    hadTriangle,
  });
  const nextRound = currentRound + 1;

  await materializeSwissTeamsRound(
    gameId,
    section,
    nextRound,
    boardsPerRound,
    draw.matches,
    draw.byeTeamId,
    draw.triangle,
  );

  return {
    ok: true,
    roundNumber: nextRound,
    hadUnavoidableRepeat: draw.hadUnavoidableRepeat,
  };
}
