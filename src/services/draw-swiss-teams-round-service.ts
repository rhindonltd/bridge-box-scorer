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
}

/**
 * Reduce a section's board rows to the Swiss Teams history the draw needs: the
 * highest round materialized so far and the set of team matchups already
 * played. A match is recovered from each home table's row — the NS seat is the
 * home team and the EW seat encodes the opponent's home table.
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
    })
    .from(boards)
    .where(eq(boards.section, section));

  const playedOpponents = new Set<string>();
  let highestRound = 0;

  for (const row of rows) {
    highestRound = Math.max(highestRound, row.roundNumber);
    try {
      const home = parseSeat(row.ns);
      const away = parseSeat(row.ew);
      playedOpponents.add(
        teamOpponentKey(home.tableNumber, away.tableNumber),
      );
    } catch {
      // A non-seat id (should not occur for teams) is skipped.
    }
  }

  return { highestRound, playedOpponents };
}

/**
 * Whether every board in a round has a final result (CONFIRMED or OVERRIDDEN),
 * so the round is safe to draw from. Swiss Teams has no sit-outs, so every
 * board is playable. An empty round is not "complete".
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
    (r) => r.status === "CONFIRMED" || r.status === "OVERRIDDEN",
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
 * Teams movement, the team count is even (three-way handling is out of scope),
 * the current round is fully scored, and the event has rounds remaining. When
 * all hold, it draws the next round from current standings (avoiding repeat
 * opponents), materializes its open/closed-room board rows, and reports whether
 * a repeat was unavoidable. It does NOT advance the timer.
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

  const { teams, rounds: totalRounds, boardsPerRound } = selected.swissTeams;

  if (teams % 2 !== 0) {
    return { ok: false, reason: "ODD_TEAM_COUNT" };
  }

  const { highestRound, playedOpponents } = await getSwissTeamsHistory(
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

  const draw = drawSwissTeamsRound({ teams, standings, playedOpponents });
  const nextRound = currentRound + 1;

  await materializeSwissTeamsRound(
    gameId,
    section,
    nextRound,
    boardsPerRound,
    draw.matches,
  );

  return {
    ok: true,
    roundNumber: nextRound,
    hadUnavoidableRepeat: draw.hadUnavoidableRepeat,
  };
}
