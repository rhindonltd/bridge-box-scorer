import { Board } from "@/db/games/tables/boards";
import { Pair } from "@/model/participants";
import { BridgeGame } from "@/db/game-index/schema";
import { Club } from "@/db/system/schema";
import { BoardOutcome } from "@/model/score";
import { Card } from "@/model/common";
import { rank } from "@/scoring/overall/rank";
import {
  scoreSwissVpRound,
  type SwissRoundMode,
} from "@/scoring/swiss/swiss-vp-round";
import { buildTravellerLine } from "./traveller-line";
import {
  UsebioClub,
  UsebioPair,
  UsebioSwissBoard,
  UsebioSwissPairsData,
  UsebioSwissPairsMatch,
  UsebioVpRankEntry,
} from "./generate-usebio";

/**
 * Assemble the USEBIO Swiss Pairs data from a game's pairs and board rows.
 *
 * The export is scored EXACTLY as the live leaderboard: each pair is measured
 * against the whole section field (cross-IMP or matchpoint, by `mode`) over the
 * round's boards, converted to Victory Points on the discrete (integer) scale.
 * Both consume the same per-round routine ({@link scoreSwissVpRound}), so the
 * file and the standings cannot drift.
 *
 * One `MATCH` is emitted per REAL head-to-head half: an ordinary round's table
 * (a full-round match on the 20-VP scale) or one of a "2 half matches" group's
 * two real halves (on the 10-VP half-scale). The anchor of a half-match group
 * therefore emits TWO matches (one per opponent) and each non-anchor one. The
 * compensated half a non-anchor missed has only a phantom opponent, so it is
 * NOT a match — its VP is folded into that pair's `TOTAL_SCORE` (the ranking)
 * only.
 *
 * `mode` is the game's Swiss VP mode (`"XIMP"` or `"MP"`); an IMP-scored Swiss
 * game (which has no leaderboard VP mode) is exported as cross-IMP ("XIMP") so
 * the file is a coherent Swiss VP document.
 */
export function assembleSwissPairs(
  game: BridgeGame,
  club: Club,
  pairs: Pair[],
  boardRows: Board[],
  mode: SwissRoundMode = "XIMP",
): UsebioSwissPairsData {
  const usebioClub: UsebioClub = {
    name: club.name,
    clubNumber: club.clubNumber,
  };

  const usebioPairs: UsebioPair[] = pairs.map((pair) => ({
    pairNumber: pair.initialSeat,
    direction: pair.initialSeat.endsWith("NS") ? "N" : "E",
    player1: pair.player1,
    player2: pair.player2,
  }));

  const { matches, totals } = buildMatches(boardRows, mode);
  const ranking = buildRanking(totals);

  const boardNumbers = new Set(boardRows.map((b) => b.boardNumber));

  return {
    kind: "SWISS_PAIRS",
    club: usebioClub,
    eventName: game.eventName,
    eventDate: game.eventDate,
    sectionName: game.sectionName || "A",
    boards: boardNumbers.size,
    pairs: usebioPairs,
    matches,
    ranking,
  };
}

/** The final result on a board: a director override wins over the confirmed. */
function boardResultOf(row: Board): BoardOutcome | null {
  return row.directorOverrideResult ?? row.confirmedResult ?? null;
}

/**
 * Score every round with the shared per-round routine, turning each real-half
 * MATCH into a USEBIO match and accumulating each pair's round VP into the
 * session total (which the ranking is built from).
 *
 * The per-pair session total is the SUM of each round's `pairVp` — NOT the sum
 * of the emitted match scores — because a non-anchor's compensated half carries
 * VP but is never a match. This keeps `TOTAL_SCORE` equal to the leaderboard.
 */
function buildMatches(
  boardRows: Board[],
  mode: SwissRoundMode,
): {
  matches: UsebioSwissPairsMatch[];
  totals: Map<string, number>;
} {
  // Group rows by round so each round is scored against its own field, and so
  // the emitted MATCH carries the right round number.
  const rowsByRound = new Map<number, Board[]>();
  for (const row of boardRows) {
    if (row.status === "SIT_OUT") continue;
    const arr = rowsByRound.get(row.roundNumber) ?? [];
    arr.push(row);
    rowsByRound.set(row.roundNumber, arr);
  }

  const totals = new Map<string, number>();
  const addVp = (pairId: string, vp: number): void => {
    totals.set(pairId, (totals.get(pairId) ?? 0) + vp);
  };

  const matches: UsebioSwissPairsMatch[] = [];

  for (const round of Array.from(rowsByRound.keys()).sort((a, b) => a - b)) {
    const rows = rowsByRound.get(round)!;
    const { pairVp, matches: roundMatches } = scoreSwissVpRound(rows, mode);

    // Session total: sum each real pair's round VP (incl. a compensated half).
    for (const [pairId, vp] of pairVp) addVp(pairId, vp);

    // One USEBIO MATCH per real head-to-head half this round.
    for (const m of roundMatches) {
      matches.push({
        round,
        nsPairNumber: m.nsId,
        ewPairNumber: m.ewId,
        nsScore: m.nsVp,
        ewScore: m.ewVp,
        boards: travellerBoards(rows, m.nsId, m.ewId, m.boardNumbers),
      });
    }
  }

  return { matches, totals };
}

/**
 * Build the traveller boards for one match: the physical table row for each of
 * the half's board numbers (the row where this NS/EW pair sat), in board order.
 */
function travellerBoards(
  rows: Board[],
  nsId: string,
  ewId: string,
  boardNumbers: number[],
): UsebioSwissBoard[] {
  return boardNumbers.map((boardNumber) => {
    const row = rows.find(
      (r) =>
        r.boardNumber === boardNumber &&
        ((r.ns === nsId && r.ew === ewId) || (r.ns === ewId && r.ew === nsId)),
    );
    const outcome = (row ? boardResultOf(row) : null) ?? ("NP" as BoardOutcome);
    const lead = (row?.directorOverrideLead ??
      row?.confirmedLead ??
      null) as Card | null;
    const line = buildTravellerLine(boardNumber, outcome, lead);
    return { boardNumber, ...line };
  });
}

/** Rank pairs by total VP (highest first), ties share a place. */
function buildRanking(totals: Map<string, number>): UsebioVpRankEntry[] {
  const ranked = rank(
    Array.from(totals.entries()).map(([pairId, totalVP]) => ({
      pairId,
      totalVP,
    })),
    (row) => row.totalVP,
  );

  return ranked.map((row) => ({
    number: row.pairId,
    sectionId: sectionOf(row.pairId),
    totalVP: row.totalVP,
    place: row.rank,
  }));
}

/** Section letter from a section-qualified seat (e.g. "A1NS" -> "A"). */
function sectionOf(pairId: string): string {
  const match = /^([A-Z]+)\d+(?:NS|EW)$/.exec(pairId);
  return match ? match[1] : "A";
}
