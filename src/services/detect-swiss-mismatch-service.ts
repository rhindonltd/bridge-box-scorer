import { getDb, type Db } from "@/db/games";
import { SectionLetter, parseSeat } from "@/model/participants";
import { getSectionMovement } from "@/db/games/queries/get-section-movement";
import {
  getSwissTeamsPriorHistory,
  getSwissTeamsCommittedRound,
} from "@/db/games/queries/swiss-teams-committed";
import { detectTeamsRoundMismatches } from "@/scoring/swiss/detect-teams-mismatch";
import {
  computeSectionLeaderboards,
  computeSectionLeaderboardsAsOf,
  type SectionLeaderboard,
} from "@/services/leaderboard-service";
import { getSwissBoardHistory, swissPairIdFromParticipant } from "@/db/games/queries/swiss-board-history";
import { getSwissCommittedRound } from "@/db/games/queries/swiss-committed-seating";
import {
  swissPairHomeSeat,
  type SwissDrawInput,
  type SwissHomeSeat,
  type SwissPairId,
} from "@/movement/swiss/swiss-pairing";
import { swissRoundBoardRange } from "@/services/materialize-swiss-round";
import { parseMismatch } from "@/model/swiss-mismatch";
import { boards } from "@/db/games/tables/boards";
import { matches } from "@/db/games/tables/matches";
import { eq } from "drizzle-orm";
import {
  detectRoundMismatches,
  type MismatchCandidate,
} from "@/scoring/swiss/detect-mismatch";

/**
 * EBU §3.5 mismatch DETECTION for a Swiss PAIRS section.
 *
 * After a retroactive score adjustment on an earlier round, the committed draws
 * of later rounds may no longer match what the corrected standings would have
 * produced. This service re-derives, for each already-committed round R (R ≥ 2),
 * the draw the CORRECTED standings-as-of-R would have given, diffs it against
 * what was actually played, and returns the pairs whose opponent changed by
 * more than 5 current VP — the §3.5 candidates a director then reviews.
 *
 * It is read-only and never rules: fault and the "valid alternatives" exception
 * are the director's call (they feed the existing `markMismatch` adjustment).
 */

/**
 * A detected §3.5 candidate — pairs OR teams — plus the location the director's
 * ruling targets. The §3.5.2 adjustment is applied through `markMismatch`,
 * which is keyed to a (round, table, board) room and a home-relative `side`;
 * those are resolved here from the committed seating so the review UI can emit
 * the ruling directly without re-deriving them.
 *
 * Participant ids are stable pair ids (pairs) or home-table team ids (teams);
 * `participantKind` tells the UI which it is, for the right wording.
 */
export interface SectionMismatchCandidate {
  section: SectionLetter;
  participantKind: "PAIR" | "TEAM";
  roundNumber: number;
  /** The mismatched pair/team (stable id). */
  mismatchedId: number;
  /** The opponent actually played (stable id). */
  actualOpponent: number;
  /** The opponent the corrected draw would have given (stable id). */
  correctOpponent: number;
  actualOpponentVp: number;
  correctOpponentVp: number;
  direction: MismatchCandidate["direction"];
  /** The table the mismatched pair/team sat at this round. */
  tableNumber: number;
  /** Which seat the mismatched side held there (NS/EW), for the MM token. */
  side: "NS" | "EW";
  /** A board number of that round, for the live-traveller push on apply. */
  boardNumber: number;
}

/** Decode each ranked leaderboard line into a stable pair id, best-first. */
function standingsOrder(
  board: SectionLeaderboard | undefined,
  tables: number,
): SwissPairId[] {
  if (!board) return [];
  const order: SwissPairId[] = [];
  const seen = new Set<SwissPairId>();
  for (const line of board.overallScore.lines as { pairId: string }[]) {
    const id = swissPairIdFromParticipant(line.pairId, tables);
    if (id != null && !seen.has(id)) {
      order.push(id);
      seen.add(id);
    }
  }
  return order;
}

/** A pair-id → current total VP map from the (as-of-now) section leaderboard. */
function currentVpByPair(
  board: SectionLeaderboard | undefined,
  tables: number,
): Map<SwissPairId, number> {
  const map = new Map<SwissPairId, number>();
  if (!board) return map;
  for (const line of board.overallScore.lines as {
    pairId: string;
    totalVP?: number;
  }[]) {
    const id = swissPairIdFromParticipant(line.pairId, tables);
    if (id != null) map.set(id, line.totalVP ?? 0);
  }
  return map;
}

/** Rounds that already carry a MISMATCH ruling, so detection won't re-flag. */
async function alreadyRuledRounds(
  db: Db,
  section: SectionLetter,
): Promise<Set<number>> {
  const rows = await db
    .select({ roundNumber: matches.roundNumber, ruling: matches.ruling })
    .from(matches)
    .where(eq(matches.section, section));
  const ruled = new Set<number>();
  for (const r of rows) {
    if (r.ruling != null && parseMismatch(r.ruling) != null) {
      ruled.add(r.roundNumber);
    }
  }
  return ruled;
}

/**
 * Detect §3.5 mismatch candidates for one section, routing to the pairs or
 * teams detector by the section's Swiss movement. A non-Swiss section (or a
 * section with no movement) has no mismatches.
 */
export async function detectSectionMismatches(
  gameId: string,
  section: SectionLetter,
): Promise<SectionMismatchCandidate[]> {
  const db = await getDb(gameId);
  if (!db) throw new Error("Game db does not exist");

  const selected = await getSectionMovement(db, section);
  if (!selected) return [];
  if (selected.source === "SWISS") {
    return detectPairsSectionMismatches(gameId, db, section, selected.swiss);
  }
  if (selected.source === "SWISS_TEAMS") {
    return detectTeamsSectionMismatches(gameId, db, section, selected.swissTeams);
  }
  return [];
}

/**
 * Detect §3.5 mismatch candidates across one Swiss PAIRS section.
 *
 * For each committed round from 2 up to the highest played, it rebuilds the
 * corrected as-of-R draw input (history over rounds < R + corrected
 * standings-as-of-R) and diffs the replayed draw against the committed seating.
 * Rounds already carrying a director mismatch ruling are skipped.
 */
async function detectPairsSectionMismatches(
  gameId: string,
  db: Db,
  section: SectionLetter,
  swiss: {
    tables: number;
    boardsPerRound: number;
    stationaryPairs?: number[];
    oddHandling?: "BYE" | "HALF_MATCHES";
    oddRoundPlan?: ("BYE" | "HALF_MATCHES")[];
  },
): Promise<SectionMismatchCandidate[]> {
  const {
    tables,
    boardsPerRound,
    stationaryPairs,
    oddHandling = "BYE",
    oddRoundPlan,
  } = swiss;

  const history = await getSwissBoardHistory(db, section, tables);
  const highestRound = history.highestRound;
  if (highestRound < 2) return [];

  const stationary = new Map<SwissPairId, SwissHomeSeat>();
  for (const pairId of stationaryPairs ?? []) {
    stationary.set(pairId, swissPairHomeSeat(tables, pairId));
  }

  // Current VP (as of now) for the > 5 comparison, from the full leaderboard.
  const nowSections = await computeSectionLeaderboards(db, gameId);
  const vpByPair = currentVpByPair(
    nowSections.find((s) => s.section === section),
    tables,
  );

  const ruled = await alreadyRuledRounds(db, section);

  const candidates: SectionMismatchCandidate[] = [];

  for (let round = 2; round <= highestRound; round++) {
    if (ruled.has(round)) continue;

    const committed = await getSwissCommittedRound(db, section, tables, round);

    // Corrected standings as of this round (rounds < round, current values).
    const asOf = await computeSectionLeaderboardsAsOf(db, gameId, round);
    const order = standingsOrder(
      asOf.find((s) => s.section === section),
      tables,
    );

    // History the round-R draw consumed (rounds < round).
    const priorHistory = await getSwissBoardHistory(db, section, tables, round);

    const roundOddHandling =
      oddHandling === "HALF_MATCHES" &&
      (oddRoundPlan?.[round - 1] ?? "BYE") === "HALF_MATCHES"
        ? "HALF_MATCHES"
        : "BYE";

    const correctedInput: SwissDrawInput = {
      tables,
      standings: order,
      playedOpponents: priorHistory.playedOpponents,
      hadBye: priorHistory.hadBye,
      hadHalfMatch: priorHistory.hadHalfMatch,
      oddHandling: roundOddHandling,
      directionCounts: priorHistory.directionCounts,
      stationary,
    };

    const found = detectRoundMismatches({
      roundNumber: round,
      correctedInput,
      committedOpponentByPair: committed.opponentByPair,
      currentVpByPair: vpByPair,
      committedExcludedPairs: committed.excludedPairs,
    });

    const { boardStart } = swissRoundBoardRange(round, boardsPerRound);

    for (const c of found) {
      // Resolve the table + seat the mismatched pair sat at, so the ruling can
      // target the right (round, table, board) room with the right home side.
      const table = committed.tables.find(
        (t) => t.ns === c.mismatchedPair || t.ew === c.mismatchedPair,
      );
      // A candidate always comes from a real head-to-head table (half-match
      // rounds are skipped upstream), so `table` is defined; guard defensively.
      /* v8 ignore next */
      if (!table) continue;

      candidates.push({
        section,
        participantKind: "PAIR",
        roundNumber: c.roundNumber,
        mismatchedId: c.mismatchedPair,
        actualOpponent: c.actualOpponent,
        correctOpponent: c.correctOpponent,
        actualOpponentVp: c.actualOpponentVp,
        correctOpponentVp: c.correctOpponentVp,
        direction: c.direction,
        tableNumber: table.tableNumber,
        side: table.ns === c.mismatchedPair ? "NS" : "EW",
        boardNumber: boardStart,
      });
    }
  }

  return candidates;
}

/** Decode a teams leaderboard line's seat id into its home-table team id. */
function teamIdOf(pairId: string): number | null {
  try {
    return parseSeat(pairId).tableNumber;
  } catch {
    return null;
  }
}

/** Each team's current (as-of-now) total VP, from the teams leaderboard. */
function currentVpByTeam(
  board: SectionLeaderboard | undefined,
): Map<number, number> {
  const map = new Map<number, number>();
  if (!board) return map;
  for (const line of board.overallScore.lines as {
    teamId: string;
    totalVP?: number;
  }[]) {
    const id = teamIdOf(line.teamId);
    if (id != null) map.set(id, line.totalVP ?? 0);
  }
  return map;
}

/** Team ids in corrected standing order (best first), from the as-of board. */
function teamStandingsOrder(board: SectionLeaderboard | undefined): number[] {
  if (!board) return [];
  const order: number[] = [];
  const seen = new Set<number>();
  for (const line of board.overallScore.lines as { teamId: string }[]) {
    const id = teamIdOf(line.teamId);
    if (id != null && !seen.has(id)) {
      order.push(id);
      seen.add(id);
    }
  }
  return order;
}

/**
 * Detect §3.5 mismatch candidates across one Swiss TEAMS section.
 *
 * Mirrors the pairs path, with two teams-specific points: the deterministic
 * teams draw is replayed (its round-1 RNG is never involved in later rounds),
 * and the odd-field TRIPLE/BYE teams of a round are EXCLUDED (the ordinary
 * tables are still assessed). For round R the corrected standings are reduced
 * to the ordinary field — the round's actual triple/bye teams removed — so the
 * engine simply pairs the ordinary teams with no odd-handling.
 */
async function detectTeamsSectionMismatches(
  gameId: string,
  db: Db,
  section: SectionLetter,
  swissTeams: { teams: number; boardsPerRound: number },
): Promise<SectionMismatchCandidate[]> {
  const { teams, boardsPerRound } = swissTeams;

  // Highest round + skip set, from the (unfiltered) prior history of the whole
  // event is simplest via the committed rounds; find the highest round first.
  const highestRound = await highestTeamsRound(db, section);
  if (highestRound < 2) return [];

  const nowSections = await computeSectionLeaderboards(db, gameId);
  const vpByTeam = currentVpByTeam(
    nowSections.find((s) => s.section === section),
  );

  const ruled = await alreadyRuledRounds(db, section);

  const candidates: SectionMismatchCandidate[] = [];

  for (let round = 2; round <= highestRound; round++) {
    if (ruled.has(round)) continue;

    const committed = await getSwissTeamsCommittedRound(db, section, round);
    // Nothing to assess if every team this round was in the triple/bye.
    if (committed.opponentByTeam.size === 0) continue;

    const asOf = await computeSectionLeaderboardsAsOf(db, gameId, round);
    const fullOrder = teamStandingsOrder(asOf.find((s) => s.section === section));
    // Reduce to the ordinary field: drop the round's triple/bye teams.
    const orderedOrdinary = fullOrder.filter(
      (id) => !committed.excludedTeams.has(id),
    );

    const prior = await getSwissTeamsPriorHistory(db, section, round);

    const found = detectTeamsRoundMismatches({
      roundNumber: round,
      teams,
      orderedOrdinary,
      playedOpponents: prior.playedOpponents,
      committedOpponentByTeam: committed.opponentByTeam,
      currentVpByTeam: vpByTeam,
      excludedTeams: committed.excludedTeams,
    });

    const { boardStart } = swissRoundBoardRange(round, boardsPerRound);

    for (const c of found) {
      // The mismatched team sits NS at its own home table; the ruling token is
      // home-relative, so `side` is always NS for the acted (home) team.
      const tableNumber = committed.homeTableByTeam.get(c.mismatchedTeam);
      /* v8 ignore next */
      if (tableNumber == null) continue;

      candidates.push({
        section,
        participantKind: "TEAM",
        roundNumber: c.roundNumber,
        mismatchedId: c.mismatchedTeam,
        actualOpponent: c.actualOpponent,
        correctOpponent: c.correctOpponent,
        actualOpponentVp: c.actualOpponentVp,
        correctOpponentVp: c.correctOpponentVp,
        direction: c.direction,
        tableNumber,
        side: "NS",
        boardNumber: boardStart,
      });
    }
  }

  return candidates;
}

/** The highest round materialized in a teams section (0 when none). */
async function highestTeamsRound(
  db: Db,
  section: SectionLetter,
): Promise<number> {
  const rows = await db
    .select({ roundNumber: boards.roundNumber })
    .from(boards)
    .where(eq(boards.section, section));
  let highest = 0;
  for (const r of rows) highest = Math.max(highest, r.roundNumber);
  return highest;
}
