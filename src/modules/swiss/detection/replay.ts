import type { SectionLetter } from "@/model/participants";
import { parseMismatches } from "@/model/swiss-mismatch";
import type { TeamId } from "@/model/teams-match-layout";
import type { SwissPairId } from "@/modules/swiss/pairs/swiss-pairing";
import type { SwissBoardHistory } from "@/modules/swiss/pairs/history";
import type { SwissCommittedRound } from "@/modules/swiss/pairs/committed-round";
import {
  pairsDrawInput,
  type SwissPairsDrawSpec,
} from "@/modules/swiss/pairs/draw-input";
import { swissRoundBoardRange } from "@/modules/swiss/board-ranges";
import { chooseTeamTriple } from "@/modules/swiss/teams/swiss-teams-pairing";
import type { SwissTeamsCommittedRound } from "@/modules/swiss/teams/history";
import {
  detectRoundMismatches,
  type MismatchCandidate,
} from "@/modules/swiss/detection/detect-mismatch";
import {
  detectTeamsRoundMismatches,
  detectTripleMismatches,
} from "@/modules/swiss/detection/detect-teams-mismatch";

/** A §3.5 mismatch candidate for one section, ready for the director's review. */
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

/* ---------- already ruled ---------- */

/** A side the director has already ruled mismatched, on one match. */
export interface RuledMismatch {
  round: number;
  id: number;
  boardStart: number;
  boardEnd: number;
}

/** The `matches` columns the ruled-mismatch decode reads. */
export interface RulingMatchRow {
  roundNumber: number;
  home: string;
  opponent: string | null;
  boardStart: number;
  boardEnd: number;
  ruling: string | null;
}

/**
 * The sides already ruled mismatched, from a section's match rows. Each ruled
 * side is recorded with its round and the boards of the match it was ruled on.
 * `idOf` decodes a match's `home`/`opponent` into the stable id a candidate
 * carries (a Swiss pair number, or a team's home table).
 */
export function ruledMismatches(
  rows: readonly RulingMatchRow[],
  idOf: (participant: string) => number | null,
): RuledMismatch[] {
  const ruled: RuledMismatch[] = [];
  for (const r of rows) {
    if (r.ruling == null) continue;
    for (const { side } of parseMismatches(r.ruling)) {
      const participant = side === "NS" ? r.home : r.opponent;
      const id = participant != null ? idOf(participant) : null;
      if (id == null) continue;
      ruled.push({
        round: r.roundNumber,
        id,
        boardStart: r.boardStart,
        boardEnd: r.boardEnd,
      });
    }
  }
  return ruled;
}

/**
 * Drop the candidates already ruled. Only THAT candidate is dropped — a ruling
 * for one pair leaves every other candidate in the round (including its own
 * opponent's) listed.
 */
function withoutRuled(
  candidates: SectionMismatchCandidate[],
  ruled: readonly RuledMismatch[],
): SectionMismatchCandidate[] {
  return candidates.filter(
    (c) =>
      !ruled.some(
        (r) =>
          r.round === c.roundNumber &&
          r.id === c.mismatchedId &&
          c.boardNumber >= r.boardStart &&
          c.boardNumber <= r.boardEnd,
      ),
  );
}

/* ---------- Swiss Pairs ---------- */

/** One committed pairs round, as the replay needs it. */
export interface PairsRoundReplay {
  roundNumber: number;
  /** The field in corrected standings order as of the start of this round. */
  standingsAsOf: SwissPairId[];
  /** History of the rounds before this one. */
  priorHistory: SwissBoardHistory;
  /** What was actually drawn. */
  committed: SwissCommittedRound;
}

/**
 * Detect §3.5 mismatch candidates across one Swiss PAIRS section.
 *
 * For each committed round, it rebuilds the corrected draw input (history over
 * earlier rounds + corrected standings as of the round) and diffs the replayed
 * draw against the committed seating. A pair the director has already ruled
 * mismatched is not listed again; the round's other candidates still are.
 */
export function detectSwissPairsMismatches(
  section: SectionLetter,
  spec: SwissPairsDrawSpec & { boardsPerRound: number },
  rounds: readonly PairsRoundReplay[],
  currentVpByPair: Map<SwissPairId, number>,
  ruled: readonly RuledMismatch[],
): SectionMismatchCandidate[] {
  const candidates: SectionMismatchCandidate[] = [];

  for (const {
    roundNumber,
    standingsAsOf,
    priorHistory,
    committed,
  } of rounds) {
    const found = detectRoundMismatches({
      roundNumber,
      correctedInput: pairsDrawInput(
        spec,
        roundNumber,
        standingsAsOf,
        priorHistory,
      ),
      committedOpponentByPair: committed.opponentByPair,
      currentVpByPair,
      committedExcludedPairs: committed.excludedPairs,
    });

    const { boardStart } = swissRoundBoardRange(
      roundNumber,
      spec.boardsPerRound,
    );

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

  return withoutRuled(candidates, ruled);
}

/* ---------- Swiss Teams ---------- */

/**
 * Whether a committed teams round has anything to assess: an ordinary table or
 * a triple. (A round can be all-triple with no ordinary tables.)
 */
export function teamsRoundToAssess(
  committed: SwissTeamsCommittedRound,
): boolean {
  return committed.opponentByTeam.size > 0 || committed.triples.length > 0;
}

/** One committed teams round, as the replay needs it. */
export interface TeamsRoundReplay {
  roundNumber: number;
  /** The FULL field in corrected standings order as of the start of this round. */
  standingsAsOf: TeamId[];
  /** Matchups played and triples entered over the rounds before this one. */
  prior: {
    playedOpponents: ReadonlySet<string>;
    hadTriple: ReadonlySet<TeamId>;
  };
  /** What was actually drawn. */
  committed: SwissTeamsCommittedRound;
}

/**
 * Detect §3.5 mismatch candidates across one Swiss TEAMS section.
 *
 * Mirrors the pairs path, with two teams-specific points: the deterministic
 * teams draw is replayed (its round-1 RNG is never involved in later rounds),
 * and the odd-field handling is assessed in two passes. For round R the
 * corrected standings are reduced to the ordinary field (triple/bye teams
 * removed) and the ordinary head-to-head tables are diffed as normal; then the
 * round's committed TRIPLE is assessed separately (F21 Part B) by replaying the
 * deterministic trio selection on the FULL standings and flagging a team that
 * faced the wrong third team. A BYE team is still left alone.
 */
export function detectSwissTeamsMismatches(
  section: SectionLetter,
  spec: { teams: number; boardsPerRound: number },
  rounds: readonly TeamsRoundReplay[],
  currentVpByTeam: Map<TeamId, number>,
  ruled: readonly RuledMismatch[],
): SectionMismatchCandidate[] {
  const { teams, boardsPerRound } = spec;
  const candidates: SectionMismatchCandidate[] = [];

  for (const {
    roundNumber: round,
    standingsAsOf,
    prior,
    committed,
  } of rounds) {
    if (!teamsRoundToAssess(committed)) continue;

    // Reduce to the ordinary field: drop the round's triple/bye teams.
    const orderedOrdinary = standingsAsOf.filter(
      (id) => !committed.excludedTeams.has(id),
    );

    // --- Ordinary head-to-head tables ---
    if (committed.opponentByTeam.size > 0) {
      const found = detectTeamsRoundMismatches({
        roundNumber: round,
        teams,
        orderedOrdinary,
        playedOpponents: prior.playedOpponents,
        committedOpponentByTeam: committed.opponentByTeam,
        currentVpByTeam,
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

    // --- Triple-internal §3.5 detection (F21 Part B) ---
    // The correct trio is the deterministic bottom-3 of the corrected FULL
    // standings that have not already been in a triple — the same selection the
    // draw used. If it differs from the committed trio, a team faced the wrong
    // third team.
    for (const triple of committed.triples) {
      // Only the round that CHOSE the trio is a clean replay. A LONG triple's
      // second slot reuses the first slot's teams (not re-chosen), which shows
      // up as its members already being in `prior.hadTriple`; skip those (and
      // any other already-tripled member) rather than replay a fresh choice
      // that would falsely diff. Left to a manual director ruling.
      if (triple.members.some((m) => prior.hadTriple.has(m))) continue;

      const correctMembers = chooseTeamTriple(standingsAsOf, prior.hadTriple);

      const found = detectTripleMismatches({
        roundNumber: round,
        committedMembers: triple.members,
        correctMembers,
        comparisons: triple.comparisons,
        currentVpByTeam,
      });

      for (const c of found) {
        // In a triple each team sits NS at its own home table; the ruling is
        // home-relative so `side` is NS for the mismatched (home) team. The
        // candidate's boardNumber pins the specific 10-VP comparison.
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
          tableNumber: c.mismatchedTeam,
          side: "NS",
          boardNumber: c.boardNumber,
        });
      }
    }
  }

  return withoutRuled(candidates, ruled);
}
