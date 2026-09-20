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
}

/**
 * Reduce a section's board rows to the Swiss Teams history the draw needs: the
 * highest round materialized so far, the set of team matchups already played,
 * and the teams that have already had a bye.
 *
 * A played match is recovered from each home table's row — the NS seat is the
 * home team and the EW seat encodes the opponent's home table. A bye is a
 * SIT_OUT row: its NS seat is the bye team's home table and its EW is a phantom
 * (not a real opponent), so it is recorded as a bye rather than a played match.
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
    } catch {
      // A non-seat id (should not occur for teams) is skipped.
    }
  }

  return { highestRound, playedOpponents, hadBye };
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

  // An odd field is only drawable via a bye; the triangle alternative is not
  // yet implemented, so an odd TRIANGLE event is rejected.
  if (teams % 2 !== 0 && oddHandling !== "BYE") {
    return { ok: false, reason: "ODD_TEAM_COUNT" };
  }

  const { highestRound, playedOpponents, hadBye } = await getSwissTeamsHistory(
    db,
    section,
  );
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
    hadBye,
  });
  const nextRound = currentRound + 1;

  await materializeSwissTeamsRound(
    gameId,
    section,
    nextRound,
    boardsPerRound,
    draw.matches,
    draw.byeTeamId,
  );

  return {
    ok: true,
    roundNumber: nextRound,
    hadUnavoidableRepeat: draw.hadUnavoidableRepeat,
  };
}
