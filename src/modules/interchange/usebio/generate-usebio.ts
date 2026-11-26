import { create } from "xmlbuilder2";
import {
  formatOutcomeForUsebio,
  formatContractCompact,
  formatLeadForUsebio,
  isAssignedOutcome,
} from "./format-contract";
import { totalTricksFor } from "./traveller-line";
import { BoardOutcome } from "@/model/score";
import { Card } from "@/model/common";
import { ScoringType, TournamentLevel } from "@/model/game-types";
import { masterPointFieldsFor } from "@/model/tournament-level";

/**
 * USEBIO 1.2 XML Generator
 *
 * Generates a valid USEBIO 1.2 XML file from game data using xmlbuilder2.
 * Reference: https://usebio.org/documentation/usebio-1.2.pdf
 */

/* ============================================================
   INPUT TYPES
============================================================ */

export type UsebioClub = {
  name: string;
  clubNumber: string;
};

export type UsebioPlayer = {
  firstName: string;
  lastName: string;
  nationalId: string | null;
};

export type UsebioPair = {
  pairNumber: string;
  direction: "N" | "E";
  /**
   * The section this pair belongs to (e.g. "A", "B"). Optional: when absent the
   * pair is placed in the event's single default section (`sectionName`).
   */
  section?: string;
  player1: UsebioPlayer;
  player2: UsebioPlayer;
};

export type UsebioBoardResult = {
  table: number;
  board: number;
  round: number;
  nsPairNumber: string;
  ewPairNumber: string;
  outcome: BoardOutcome;
  lead: Card | null;
  /**
   * The section this result was played in (e.g. "A", "B"). Optional: when
   * absent the result belongs to the event's single default section
   * (`sectionName`). Scoring/ranking are computed within a section, so the same
   * board number played in different sections is scored independently.
   */
  section?: string;
  /**
   * The contract score from North/South's side (SCORE), worked out by the
   * caller. Null is written as 0; a director-assigned line always shows 0.
   */
  score: number | null;
  /**
   * The line's matchpoints (MP) or IMPs (Cross-IMP) for each side, as scored by
   * the caller. Absent for a line that was not scored (a board not played).
   */
  lineScore?: { ns: number; ew: number };
};

/** One pair's placing within its section's ranking, worked out by the caller. */
export type UsebioPairPlacing = {
  section: string;
  /** The pair's number as written in the file (section-local). */
  pairNumber: string;
  /** Matchpoints: the percentage to two decimals, written to PERCENTAGE. */
  percentage?: string;
  /** Cross-IMP: average cross-IMPs per board, written to AVERAGE_SCORE. */
  averageScore?: string;
  /** Place in the ranking (within its direction for a two-winner event). */
  place: number;
};

/**
 * The MP/Butler/XIMP pairs event: the original flat "boards with per-line
 * scores + percentage ranking" shape. `kind` is optional and defaults to
 * "MP_PAIRS" so existing callers need no change.
 */
export type UsebioPairsData = {
  kind?: "MP_PAIRS";
  club: UsebioClub;
  eventName: string;
  eventDate: string;
  /**
   * The EBU tournament level, resolved to the three USEBIO EVENT masterpoint/
   * charge fields on export. Optional: when absent the default level
   * (NORMAL_CLUB) is used.
   */
  tournamentLevel?: TournamentLevel;
  scoringType: ScoringType;
  /**
   * The default section id, used for pairs/results that carry no `section` and
   * as the single SECTION for a one-section event.
   */
  sectionName: string;
  /**
   * The ordered list of section ids to emit, one `<SECTION>` each. Optional:
   * when absent (or empty) the export falls back to a single section using
   * `sectionName`, preserving the original single-section behaviour.
   */
  sections?: string[];
  boards: number;
  pairs: UsebioPair[];
  boardResults: UsebioBoardResult[];
  /**
   * Each placed pair's percentage and place, per section. A pair that is not
   * listed (without standing, or no scored board) is written with no
   * PERCENTAGE or PLACE.
   */
  placings: UsebioPairPlacing[];
  /**
   * 1 for one ranking across the field; 2 for a two-winner event (North/South
   * and East/West ranked separately). Defaults to 1.
   */
  winnerType?: 1 | 2;
};

/**
 * The data the USEBIO builder renders. A discriminated union on `kind`:
 * - MP_PAIRS (default): the pairs board-scored event (unchanged behaviour).
 * - SWISS_PAIRS: a Swiss Pairs event (matches per round, VP scored).
 * - SWISS_TEAMS: a Swiss Teams event (team matches per round, VP scored).
 */
export type UsebioGameData =
  | UsebioPairsData
  | UsebioSwissPairsData
  | UsebioSwissTeamsData
  | UsebioBoardComparisonTeamsData;

/* ---- Swiss Pairs ---- */

/** One board's traveller line within a Swiss Pairs match. */
export type UsebioSwissBoard = {
  boardNumber: number;
  contract: string;
  playedBy: string;
  lead: string;
  tricks: string;
  score: string;
};

/** One Swiss Pairs match: a round's head-to-head between two pairs. */
export type UsebioSwissPairsMatch = {
  /** The SECTION this match is written under (see `sections`). */
  section?: string;
  round: number;
  nsPairNumber: string;
  ewPairNumber: string;
  /** Match victory points (integer) for each side. */
  nsScore: number;
  ewScore: number;
  boards: UsebioSwissBoard[];
};

/** One entry in a Swiss (VP) ranking. */
export type UsebioVpRankEntry = {
  /** Pair or team number. */
  number: string;
  sectionId: string;
  totalVP: number;
  place: number;
};

export type UsebioSwissPairsData = {
  kind: "SWISS_PAIRS";
  /**
   * The SECTIONs to write, in order. Each pair, team and match is written under
   * the section it names (`section` / `sectionId`). Absent: everything goes in
   * one SECTION named `sectionName`.
   */
  sections?: string[];
  club: UsebioClub;
  eventName: string;
  eventDate: string;
  /** EBU tournament level → USEBIO masterpoint/charge EVENT fields. */
  tournamentLevel?: TournamentLevel;
  sectionName: string;
  boards: number;
  pairs: UsebioPair[];
  matches: UsebioSwissPairsMatch[];
  ranking: UsebioVpRankEntry[];
};

/* ---- Swiss Teams ---- */

/**
 * One partnership within a team. A team normally fields two (its home NS pair
 * and its travelling EW pair); a mid-game substitution (EBU §2.4.7) adds a
 * further pair. The format itself does not cap the count; the limit of three
 * pairs (six distinct players) is the EBU rule for a teams-of-four event,
 * enforced when the handover is recorded (`MAX_PAIRS_PER_TEAM` in the
 * rulings module), not here. The `pairNumber` is an opaque identifier: USEBIO
 * only requires that each traveller line's NS_PAIR_NUMBER / EW_PAIR_NUMBER
 * matches a declared PAIR_NUMBER. We use the app's own pair id — the seat
 * ("1NS"), or the seat plus occupancy id for a substitute ("1NS#7") — the same
 * as the pairs export.
 */
export type UsebioTeamPair = {
  pairNumber: string;
  player1: UsebioPlayer;
  player2: UsebioPlayer;
};

/**
 * A team in the teams roster: a number, a name, and its partnerships (two, or
 * three once a substitute pair has come in).
 */
export type UsebioTeam = {
  teamNumber: string;
  teamName: string;
  sectionId: string;
  pairs: UsebioTeamPair[];
};

/** One board within a Swiss Teams match (both rooms), with the net IMPs. */
export type UsebioTeamBoard = {
  boardNumber: number;
  /** Net IMPs from the primary TEAM's perspective (may be negative). */
  imps: number;
  travellerLines: UsebioTeamTravellerLine[];
};

/** A traveller line for a Swiss Teams board, tagged with the room direction. */
export type UsebioTeamTravellerLine = {
  /** Which direction the primary team sat at this table ("NS"/"EW"). */
  direction: string;
  /**
   * The partnership that sat NS / EW at this table for this board, as a
   * {@link UsebioTeamPair.pairNumber}. Lets the file say WHICH of a team's
   * partnerships played the board (it matters once a substitute pair has come
   * in). Optional: omitted when a seat could not be resolved.
   */
  nsPairNumber?: string;
  ewPairNumber?: string;
  contract: string;
  playedBy: string;
  lead: string;
  tricks: string;
  score: string;
};

/** One Swiss Teams match: a round's team-vs-team encounter. */
export type UsebioSwissTeamsMatch = {
  /** The SECTION this match is written under (see `sections`). */
  section?: string;
  round: number;
  team: string;
  opposingTeam: string;
  startBoard: number;
  endBoard: number;
  /** Match victory points (integer) for each team. */
  teamScore: number;
  opposingTeamScore: number;
  boards: UsebioTeamBoard[];
};

export type UsebioSwissTeamsData = {
  kind: "SWISS_TEAMS";
  /**
   * The SECTIONs to write, in order. Each pair, team and match is written under
   * the section it names (`section` / `sectionId`). Absent: everything goes in
   * one SECTION named `sectionName`.
   */
  sections?: string[];
  club: UsebioClub;
  eventName: string;
  eventDate: string;
  /** EBU tournament level → USEBIO masterpoint/charge EVENT fields. */
  tournamentLevel?: TournamentLevel;
  sectionName: string;
  boards: number;
  teams: UsebioTeam[];
  matches: UsebioSwissTeamsMatch[];
  ranking: UsebioVpRankEntry[];
  /**
   * The USEBIO MATCH_SCORING_METHOD for the file. "VPS" for Swiss Teams (each
   * match scored to Victory Points); "IMPS" for aggregate-IMP teams (each match
   * scored by its net IMP margin, ranked on total IMPs). Defaults to "VPS" so
   * existing Swiss Teams callers are unaffected. When "IMPS", the numbers in
   * `matches[].teamScore` and `ranking[].totalVP` are IMPs, not VP.
   */
  matchScoringMethod?: "VPS" | "IMPS";
};

/* ---- Board-a-Match Teams ---- */

/**
 * The USEBIO scoring tag for a board-comparison teams file: "BAM" for
 * Board-a-Match (points 0/0.5/1) or "PAB" for Point-a-Board (points 0/1/2).
 */
export type UsebioBoardComparisonScoring = "BAM" | "PAB";

/**
 * One board within a board-comparison team match (both rooms), with the board's
 * points for each side. Points are already on the file's scale (the assembler
 * applies BAM 0/0.5/1 or PAB 0/1/2). No cross-IMP points are emitted.
 */
export type UsebioBoardComparisonBoard = {
  boardNumber: number;
  /** Points for the primary team on this board, on the file's scale. */
  teamPoints: number;
  /** Points for the opposing team on this board, on the file's scale. */
  opposingTeamPoints: number;
  travellerLines: UsebioTeamTravellerLine[];
};

/** One board-comparison team match: a round's team-vs-team encounter. */
export type UsebioBoardComparisonMatch = {
  /** The SECTION this match is written under (see `sections`). */
  section?: string;
  round: number;
  team: string;
  opposingTeam: string;
  startBoard: number;
  endBoard: number;
  /** Total points won by each team across the match's comparable boards. */
  teamScore: number;
  opposingTeamScore: number;
  boards: UsebioBoardComparisonBoard[];
};

/** One team's placing in the board-comparison ranking (by total points won). */
export type UsebioBoardComparisonRankEntry = {
  number: string;
  sectionId: string;
  /** Total points won across the event, on the file's scale. */
  totalWon: number;
  place: number;
};

export type UsebioBoardComparisonTeamsData = {
  kind: "BOARD_COMPARISON_TEAMS";
  /**
   * The SECTIONs to write, in order. Each pair, team and match is written under
   * the section it names (`section` / `sectionId`). Absent: everything goes in
   * one SECTION named `sectionName`.
   */
  sections?: string[];
  /** Which scale/tag the file uses (BAM 0/0.5/1, PAB 0/1/2). */
  scoring: UsebioBoardComparisonScoring;
  club: UsebioClub;
  eventName: string;
  eventDate: string;
  /** EBU tournament level → USEBIO masterpoint/charge EVENT fields. */
  tournamentLevel?: TournamentLevel;
  sectionName: string;
  boards: number;
  teams: UsebioTeam[];
  matches: UsebioBoardComparisonMatch[];
  ranking: UsebioBoardComparisonRankEntry[];
};

/* ============================================================
   SCORING TYPE MAPPING
============================================================ */

const SCORING_TYPE_MAP: Record<ScoringType, string> = {
  MP: "MATCH_POINTS",
  // Aggregate teams IMPs: the match score is a summation of International Match
  // Points, which USEBIO tags IMPS.
  IMP: "IMPS",
  // Teams IMPs converted to Victory Points per round (Butler/datum style).
  IMP_VP: "BUTLER",
  XIMP: "CROSS_IMPS",
  BAM: "BAM",
  PAB: "PAB",
};

/* ============================================================
   GENERATOR
============================================================ */

/**
 * Render a USEBIO 1.2 document for any supported event kind. Dispatches on the
 * data's `kind` discriminator (a missing `kind` is treated as MP_PAIRS so
 * existing callers are unaffected).
 */
export function generateUsebioXml(data: UsebioGameData): string {
  switch (data.kind) {
    case "SWISS_PAIRS":
      return generateSwissPairsXml(data);
    case "SWISS_TEAMS":
      return generateSwissTeamsXml(data);
    case "BOARD_COMPARISON_TEAMS":
      return generateBoardComparisonTeamsXml(data);
    case "MP_PAIRS":
    case undefined:
      return generateMpPairsXml(data);
  }
}

/**
 * Create the shared document root: `<USEBIO Version="1.2">` with the CLUB
 * block, returning the `<EVENT>` element (with the given EVENT_TYPE) and the
 * document so the caller can finish it.
 */
function startUsebioDoc(
  club: UsebioClub,
  eventType: string,
): {
  doc: ReturnType<typeof create>;
  event: ReturnType<ReturnType<typeof create>["ele"]>;
} {
  // Real USEBIO files declare the DTD and use the iso-8859-1 prolog.
  const doc = create({ version: "1.0", encoding: "iso-8859-1" });
  doc.dtd({
    name: "USEBIO",
    sysID: "http://www.ebu.co.uk/usebio/usebio_v1_2.dtd",
  });
  const root = doc.ele("USEBIO", { Version: "1.2" });

  const clubEl = root.ele("CLUB");
  clubEl.ele("CLUB_NAME").txt(club.name);
  clubEl.ele("CLUB_ID_NUMBER").txt(club.clubNumber);

  const event = root.ele("EVENT", { EVENT_TYPE: eventType });
  return { doc, event };
}

/**
 * Append the EBU masterpoint/charge EVENT fields derived from the game's
 * tournament level: `<MASTER_POINT_SCALE>`, `<MASTER_POINT_TYPE>` and
 * `<P2P_CHARGE_RATE>`. The EBU reads these to set the charge rate and decide
 * which Master Points / NGS updates to award. Emitted for every event kind so
 * all exported files are consistent; a missing level falls back to the default
 * (NORMAL_CLUB).
 */
function appendMasterPointFields(
  event: ReturnType<ReturnType<typeof create>["ele"]>,
  tournamentLevel: TournamentLevel | undefined,
): void {
  const { masterPointScale, masterPointType, p2pChargeRate } =
    masterPointFieldsFor(tournamentLevel);
  event.ele("MASTER_POINT_SCALE").txt(masterPointScale);
  event.ele("MASTER_POINT_TYPE").txt(masterPointType);
  event.ele("P2P_CHARGE_RATE").txt(p2pChargeRate);
}

/**
 * The SECTIONs a Swiss or teams file is written in, each with a test for
 * whether a pair, team or match (by its section) belongs to it. With no
 * section list everything goes in one SECTION named after the event's section,
 * as a single-section file always has.
 */
function sectionPlan(data: {
  sections?: string[];
  sectionName: string;
}): { id: string; has: (section: string | undefined) => boolean }[] {
  if (!data.sections || data.sections.length === 0) {
    return [{ id: data.sectionName || "A", has: () => true }];
  }
  return data.sections.map((id) => ({
    id,
    has: (section: string | undefined) => section === id,
  }));
}

/* ============================================================
   MP / XIMP PAIRS
============================================================ */

function generateMpPairsXml(data: UsebioPairsData): string {
  const { doc, event } = startUsebioDoc(data.club, "PAIRS");

  // The ordered sections to emit, one <SECTION> each. Fall back to the single
  // default section when no explicit list is supplied (original behaviour).
  const sectionIds =
    data.sections && data.sections.length > 0
      ? data.sections
      : [data.sectionName || "A"];
  const defaultSection = data.sectionName || "A";

  const ewPairs = data.pairs.filter((p) => p.direction === "E").length;

  // EVENT header.
  event
    .ele("BOARD_SCORING_METHOD")
    .txt(SCORING_TYPE_MAP[data.scoringType] ?? "MATCH_POINTS");
  event.ele("EVENT_DESCRIPTION").txt(data.eventName);
  event.ele("DATE").txt(formatDate(data.eventDate));
  appendMasterPointFields(event, data.tournamentLevel);
  event.ele("SESSION_COUNT").txt("1");
  event.ele("SECTION_COUNT").txt(String(sectionIds.length));
  event.ele("PAIRS").txt(String(data.pairs.length));
  event.ele("BOARDS_PLAYED").txt(String(data.boards));
  // 1: one ranking across all pairs; 2: North/South and East/West separately.
  event.ele("WINNER_TYPE").txt(String(data.winnerType ?? 1));
  event.ele("EW_PAIRS").txt(String(ewPairs));

  // One SESSION wraps all sections; each section is a separate <SECTION> with
  // its own participants, boards and placings.
  const session = event.ele("SESSION", { SESSION_ID: "1" });

  for (const sectionId of sectionIds) {
    const inSection = (section: string | undefined) =>
      (section ?? defaultSection) === sectionId;
    const section = session.ele("SECTION", { SECTION_ID: sectionId });
    appendSectionContent(
      section,
      data.scoringType,
      data.pairs.filter((p) => inSection(p.section)),
      data.boardResults.filter((r) => inSection(r.section)),
      data.placings.filter((p) => p.section === sectionId),
    );
  }

  return doc.end({ prettyPrint: true, indent: "  " });
}

/**
 * Populate a single `<SECTION>` with its PARTICIPANTS (each pair carrying its
 * inline placing) and its BOARD/TRAVELLER_LINE elements, from the section's
 * already-scored results and placings.
 */
function appendSectionContent(
  section: ReturnType<ReturnType<typeof create>["ele"]>,
  scoringType: ScoringType,
  pairs: UsebioPair[],
  boardResults: UsebioBoardResult[],
  placings: UsebioPairPlacing[],
): void {
  // Placings per pair (inline on each PAIR, USEBIO-style) rather than a
  // separate RANKING block. A pair with no placing (without standing, or no
  // scored board) stays a PARTICIPANT with no PERCENTAGE/PLACE.
  const rankByPair = new Map(placings.map((r) => [r.pairNumber, r]));

  // PARTICIPANTS — each pair carries its placing inline.
  const participants = section.ele("PARTICIPANTS");
  for (const pair of pairs) {
    const dir = pair.direction === "N" ? "NS" : "EW";
    const pairEl = participants.ele("PAIR");
    pairEl.ele("PAIR_NUMBER").txt(pair.pairNumber);
    pairEl.ele("DIRECTION").txt(dir);

    const rank = rankByPair.get(pair.pairNumber);
    if (rank) {
      if (rank.percentage !== undefined) {
        pairEl.ele("PERCENTAGE").txt(rank.percentage);
      }
      if (rank.averageScore !== undefined) {
        pairEl.ele("AVERAGE_SCORE").txt(rank.averageScore);
      }
      pairEl.ele("PLACE").txt(String(rank.place));
    }

    addPlayer(pairEl, pair.player1);
    addPlayer(pairEl, pair.player2);
  }

  // BOARD elements (one per board number), each with its TRAVELLER_LINEs.
  const boardGroups = groupBy(boardResults, (r) => r.board);
  const boardNumbers = [...boardGroups.keys()].sort((a, b) => a - b);

  for (const boardNum of boardNumbers) {
    const boardEl = section.ele("BOARD");
    boardEl.ele("BOARD_NUMBER").txt(String(boardNum));

    // Note: the dealt cards (HAND / VULNERABILITY) are intentionally NOT emitted
    // here. Deal information is exported separately as a PBN file; the USEBIO
    // file carries only players and results (BridgeWebs takes both files).

    for (const result of boardGroups.get(boardNum)!) {
      const lineEl = boardEl.ele("TRAVELLER_LINE");
      lineEl.ele("NS_PAIR_NUMBER").txt(result.nsPairNumber);
      lineEl.ele("EW_PAIR_NUMBER").txt(result.ewPairNumber);

      if (isAssignedOutcome(result.outcome)) {
        // A director-assigned line (artificial adjusted or weighted assigned)
        // has no single played contract to report.
        lineEl.ele("CONTRACT").txt("");
        lineEl.ele("PLAYED_BY").txt("");
        lineEl.ele("LEAD").txt("");
        lineEl.ele("TRICKS").txt("");
        lineEl.ele("SCORE").txt("0");
      } else {
        lineEl.ele("CONTRACT").txt(formatContractCompact(result.outcome));
        lineEl
          .ele("PLAYED_BY")
          .txt(formatOutcomeForUsebio(result.outcome).declarer);
        lineEl.ele("LEAD").txt(formatLeadForUsebio(result.lead));
        lineEl.ele("TRICKS").txt(totalTricksFor(result.outcome));
        lineEl.ele("SCORE").txt(String(result.score ?? 0));
      }

      if (result.lineScore) {
        appendLineScore(lineEl, scoringType, result.lineScore);
      }
    }
  }
}

/* ============================================================
   SWISS PAIRS
============================================================ */

function generateSwissPairsXml(data: UsebioSwissPairsData): string {
  const { doc, event } = startUsebioDoc(data.club, "SWISS_PAIRS");

  const ewPairs = data.pairs.filter((p) => p.direction === "E").length;

  // EVENT header.
  event.ele("MATCH_SCORING_METHOD").txt("VPS");
  event.ele("EVENT_DESCRIPTION").txt(data.eventName);
  event.ele("DATE").txt(formatDate(data.eventDate));
  appendMasterPointFields(event, data.tournamentLevel);
  const plan = sectionPlan(data);
  event.ele("SESSION_COUNT").txt("1");
  event.ele("SECTION_COUNT").txt(String(plan.length));
  event.ele("PAIRS").txt(String(data.pairs.length));
  event.ele("BOARDS_PLAYED").txt(String(data.boards));
  event.ele("WINNER_TYPE").txt("1");
  event.ele("EW_PAIRS").txt(String(ewPairs));

  const session = event.ele("SESSION", { SESSION_ID: "1" });
  const rankByPair = new Map(data.ranking.map((r) => [r.number, r]));
  for (const { id, has } of plan) {
    appendSwissPairsSection(
      session.ele("SECTION", { SECTION_ID: id }),
      data.pairs.filter((p) => has(p.section)),
      data.matches.filter((m) => has(m.section)),
      rankByPair,
    );
  }

  return doc.end({ prettyPrint: true, indent: "  " });
}

/** One Swiss Pairs SECTION: its pairs with inline placings, then its matches. */
function appendSwissPairsSection(
  section: ReturnType<ReturnType<typeof create>["ele"]>,
  pairs: UsebioPair[],
  matches: UsebioSwissPairsMatch[],
  rankByPair: Map<string, UsebioVpRankEntry>,
): void {
  const participants = section.ele("PARTICIPANTS");
  for (const pair of pairs) {
    const dir = pair.direction === "N" ? "NS" : "EW";
    const pairEl = participants.ele("PAIR");
    pairEl.ele("PAIR_NUMBER").txt(pair.pairNumber);
    pairEl.ele("DIRECTION").txt(dir);

    const rank = rankByPair.get(pair.pairNumber);
    if (rank) {
      pairEl.ele("TOTAL_SCORE").txt(String(rank.totalVP));
      pairEl.ele("PLACE").txt(String(rank.place));
    }

    addPlayer(pairEl, pair.player1);
    addPlayer(pairEl, pair.player2);
  }

  // One MATCH per round/table pairing. Pair numbers live at the match level, so
  // the nested traveller lines do not repeat them.
  for (const match of matches) {
    const matchEl = section.ele("MATCH");
    matchEl.ele("ROUND_NUMBER").txt(String(match.round));
    matchEl.ele("NS_PAIR_NUMBER").txt(match.nsPairNumber);
    matchEl.ele("EW_PAIR_NUMBER").txt(match.ewPairNumber);
    matchEl.ele("NS_SCORE").txt(String(match.nsScore));
    matchEl.ele("EW_SCORE").txt(String(match.ewScore));

    for (const board of match.boards) {
      const boardEl = matchEl.ele("BOARD");
      boardEl.ele("BOARD_NUMBER").txt(String(board.boardNumber));
      const line = boardEl.ele("TRAVELLER_LINE");
      appendTravellerDetail(line, board);
    }
  }
}

/* ============================================================
   SWISS TEAMS
============================================================ */

function generateSwissTeamsXml(data: UsebioSwissTeamsData): string {
  const { doc, event } = startUsebioDoc(data.club, "SWISS_TEAMS");

  // EVENT header. A Swiss Teams file scores each match to Victory Points (VPS);
  // an aggregate-IMP teams file scores each match by its net IMP margin (IMPS)
  // and ranks on total IMPs. The per-match TEAM_SCORE and TOTAL_SCORE carry
  // whichever unit this method names.
  event.ele("MATCH_SCORING_METHOD").txt(data.matchScoringMethod ?? "VPS");
  event.ele("EVENT_DESCRIPTION").txt(data.eventName);
  event.ele("DATE").txt(formatDate(data.eventDate));
  appendMasterPointFields(event, data.tournamentLevel);
  const plan = sectionPlan(data);
  event.ele("SESSION_COUNT").txt("1");
  event.ele("SECTION_COUNT").txt(String(plan.length));
  event.ele("BOARDS_PLAYED").txt(String(data.boards));
  event.ele("WINNER_TYPE").txt("1");
  // Each team declares its partnerships as <PAIR> blocks (not just a flat
  // player list), and board results are tagged with pair numbers.
  event.ele("TEAM_PAIRING_AVAILABLE").txt("Y");

  const session = event.ele("SESSION", { SESSION_ID: "1" });
  const rankByTeam = new Map(data.ranking.map((r) => [r.number, r]));
  for (const { id, has } of plan) {
    appendSwissTeamsSection(
      session.ele("SECTION", { SECTION_ID: id }),
      data.teams.filter((t) => has(t.sectionId)),
      data.matches.filter((m) => has(m.section)),
      rankByTeam,
    );
  }

  return doc.end({ prettyPrint: true, indent: "  " });
}

/** One Swiss Teams SECTION: its teams with inline placings, then its matches. */
function appendSwissTeamsSection(
  section: ReturnType<ReturnType<typeof create>["ele"]>,
  teams: UsebioTeam[],
  matches: UsebioSwissTeamsMatch[],
  rankByTeam: Map<string, UsebioVpRankEntry>,
): void {
  // Team roster: each TEAM carries its id and name (both DTD attributes), its
  // placing, and its partnerships (<PAIR> blocks).
  const participants = section.ele("PARTICIPANTS");
  for (const team of teams) {
    const teamEl = participants.ele("TEAM", {
      TEAM_ID: team.teamNumber,
      TEAM_NAME: team.teamName,
    });

    const rank = rankByTeam.get(team.teamNumber);
    if (rank) {
      teamEl.ele("TOTAL_SCORE").txt(String(rank.totalVP));
      teamEl.ele("PLACE").txt(String(rank.place));
    }

    addTeamPairs(teamEl, team.pairs);
  }

  // One MATCH per round: the primary TEAM vs its OPPOSING_TEAM over a board
  // range, with per-board net IMPs and both rooms' traveller lines.
  for (const match of matches) {
    const matchEl = section.ele("MATCH");
    matchEl.ele("ROUND_NUMBER").txt(String(match.round));
    matchEl.ele("TEAM").txt(match.team);
    matchEl.ele("OPPOSING_TEAM").txt(match.opposingTeam);
    matchEl.ele("START_BOARD_NUMBER").txt(String(match.startBoard));
    matchEl.ele("END_BOARD_NUMBER").txt(String(match.endBoard));
    matchEl.ele("TEAM_SCORE").txt(String(match.teamScore));
    matchEl.ele("OPPOSING_TEAM_SCORE").txt(String(match.opposingTeamScore));

    for (const board of match.boards) {
      const boardEl = matchEl.ele("BOARD", { EVENT_TYPE: "SWISS_TEAMS" });
      boardEl.ele("BOARD_NUMBER").txt(String(board.boardNumber));
      boardEl.ele("IMPS").txt(String(board.imps));
      for (const line of board.travellerLines) {
        const lineEl = boardEl.ele("TRAVELLER_LINE");
        appendTeamLineIdentity(lineEl, line);
        appendTravellerDetail(lineEl, line);
      }
    }
  }
}

/**
 * Generate the USEBIO XML for a board-comparison teams event (Board-a-Match or
 * Point-a-Board).
 *
 * Structurally identical to the Swiss Teams file, but scored by board
 * comparison: BOARD_SCORING_METHOD and MATCH_SCORING_METHOD are both the
 * scoring tag ("BAM" or "PAB"), each board carries the two teams' points
 * (already on the file's scale) rather than net IMPs, each match's TEAM_SCORE
 * is the team's total points won, and the ranking is by total points won. No
 * cross-IMP points are emitted on traveller lines.
 */
function generateBoardComparisonTeamsXml(
  data: UsebioBoardComparisonTeamsData,
): string {
  const { doc, event } = startUsebioDoc(data.club, "TEAMS");

  event.ele("BOARD_SCORING_METHOD").txt(data.scoring);
  event.ele("MATCH_SCORING_METHOD").txt(data.scoring);
  event.ele("EVENT_DESCRIPTION").txt(data.eventName);
  event.ele("DATE").txt(formatDate(data.eventDate));
  appendMasterPointFields(event, data.tournamentLevel);
  const plan = sectionPlan(data);
  event.ele("SESSION_COUNT").txt("1");
  event.ele("SECTION_COUNT").txt(String(plan.length));
  event.ele("BOARDS_PLAYED").txt(String(data.boards));
  event.ele("WINNER_TYPE").txt("1");
  // Partnerships are declared as <PAIR> blocks and board results are tagged
  // with pair numbers (see the Swiss Teams generator).
  event.ele("TEAM_PAIRING_AVAILABLE").txt("Y");

  const session = event.ele("SESSION", { SESSION_ID: "1" });
  const rankByTeam = new Map(data.ranking.map((r) => [r.number, r]));
  for (const { id, has } of plan) {
    appendBoardComparisonSection(
      session.ele("SECTION", { SECTION_ID: id }),
      data.teams.filter((t) => has(t.sectionId)),
      data.matches.filter((m) => has(m.section)),
      rankByTeam,
    );
  }

  return doc.end({ prettyPrint: true, indent: "  " });
}

/** One board-comparison SECTION: its teams with placings, then its matches. */
function appendBoardComparisonSection(
  section: ReturnType<ReturnType<typeof create>["ele"]>,
  teams: UsebioTeam[],
  matches: UsebioBoardComparisonMatch[],
  rankByTeam: Map<string, UsebioBoardComparisonRankEntry>,
): void {
  const participants = section.ele("PARTICIPANTS");
  for (const team of teams) {
    const teamEl = participants.ele("TEAM", {
      TEAM_ID: team.teamNumber,
      TEAM_NAME: team.teamName,
    });

    const rank = rankByTeam.get(team.teamNumber);
    if (rank) {
      teamEl.ele("TOTAL_SCORE").txt(String(rank.totalWon));
      teamEl.ele("PLACE").txt(String(rank.place));
    }

    addTeamPairs(teamEl, team.pairs);
  }

  for (const match of matches) {
    const matchEl = section.ele("MATCH");
    matchEl.ele("ROUND_NUMBER").txt(String(match.round));
    matchEl.ele("TEAM").txt(match.team);
    matchEl.ele("OPPOSING_TEAM").txt(match.opposingTeam);
    matchEl.ele("START_BOARD_NUMBER").txt(String(match.startBoard));
    matchEl.ele("END_BOARD_NUMBER").txt(String(match.endBoard));
    matchEl.ele("TEAM_SCORE").txt(String(match.teamScore));
    matchEl.ele("OPPOSING_TEAM_SCORE").txt(String(match.opposingTeamScore));

    for (const board of match.boards) {
      const boardEl = matchEl.ele("BOARD", { EVENT_TYPE: "TEAMS" });
      boardEl.ele("BOARD_NUMBER").txt(String(board.boardNumber));
      boardEl.ele("TEAM_POINTS").txt(String(board.teamPoints));
      boardEl.ele("OPPOSING_TEAM_POINTS").txt(String(board.opposingTeamPoints));
      for (const line of board.travellerLines) {
        const lineEl = boardEl.ele("TRAVELLER_LINE");
        appendTeamLineIdentity(lineEl, line);
        appendTravellerDetail(lineEl, line);
      }
    }
  }
}

/* ============================================================
   HELPERS
============================================================ */

/**
 * Append the shared traveller-line detail elements (contract, declarer, lead,
 * tricks, score). Used by both Swiss variants; the caller adds any leading
 * elements (e.g. the teams DIRECTION) first.
 */
function appendTravellerDetail(
  lineEl: ReturnType<ReturnType<typeof create>["ele"]>,
  detail: {
    contract: string;
    playedBy: string;
    lead: string;
    tricks: string;
    score: string;
  },
): void {
  lineEl.ele("CONTRACT").txt(detail.contract);
  lineEl.ele("PLAYED_BY").txt(detail.playedBy);
  lineEl.ele("LEAD").txt(detail.lead);
  lineEl.ele("TRICKS").txt(detail.tricks);
  lineEl.ele("SCORE").txt(detail.score);
}

/**
 * Write a team's partnerships under its `<TEAM>`: one `<PAIR>` per partnership,
 * each with its `<PAIR_NUMBER>` and two `<PLAYER>`s. The traveller lines'
 * NS_PAIR_NUMBER / EW_PAIR_NUMBER refer back to these numbers.
 */
function addTeamPairs(
  teamEl: ReturnType<ReturnType<typeof create>["ele"]>,
  pairs: UsebioTeamPair[],
): void {
  for (const pair of pairs) {
    const pairEl = teamEl.ele("PAIR");
    pairEl.ele("PAIR_NUMBER").txt(pair.pairNumber);
    addPlayer(pairEl, pair.player1);
    addPlayer(pairEl, pair.player2);
  }
}

/**
 * Write a team traveller line's leading identity: the room DIRECTION, then —
 * when resolved — which partnership sat NS and EW (the pairs that played this
 * particular board).
 */
function appendTeamLineIdentity(
  lineEl: ReturnType<ReturnType<typeof create>["ele"]>,
  line: UsebioTeamTravellerLine,
): void {
  lineEl.ele("DIRECTION").txt(line.direction);
  if (line.nsPairNumber) lineEl.ele("NS_PAIR_NUMBER").txt(line.nsPairNumber);
  if (line.ewPairNumber) lineEl.ele("EW_PAIR_NUMBER").txt(line.ewPairNumber);
}

function addPlayer(parentEl: ReturnType<typeof create>, player: UsebioPlayer) {
  const playerEl = parentEl.ele("PLAYER");
  playerEl.ele("PLAYER_NAME").txt(`${player.firstName} ${player.lastName}`);
  if (player.nationalId) {
    playerEl.ele("NATIONAL_ID_NUMBER").txt(player.nationalId);
  }
}

function formatDate(isoDate: string): string {
  const d = new Date(isoDate);
  if (isNaN(d.getTime())) return isoDate;

  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();

  return `${day}/${month}/${year}`;
}

function groupBy<T, K>(items: T[], keyFn: (item: T) => K): Map<K, T[]> {
  const map = new Map<K, T[]>();
  for (const item of items) {
    const key = keyFn(item);
    const group = map.get(key) ?? [];
    group.push(item);
    map.set(key, group);
  }
  return map;
}

/**
 * The USEBIO 1.2 traveller-line element suffix for each scoring type's
 * per-line figures (`NS_<suffix>` / `EW_<suffix>`), matching the board scoring
 * method in the file header. A pairs file is scored on matchpoints or
 * cross-IMPs; the other scoring types fall back to matchpoints, as the header
 * does for an unknown type.
 */
const LINE_SCORE_SUFFIX: Record<ScoringType, string> = {
  MP: "MATCH_POINTS",
  XIMP: "CROSS_IMP_POINTS",
  IMP: "AGGREGATE_POINTS",
  IMP_VP: "BUTLER_POINTS",
  BAM: "MATCH_POINTS",
  PAB: "MATCH_POINTS",
};

/** Write a line's NS/EW figures under the scoring type's element names. */
function appendLineScore(
  resultEl: ReturnType<ReturnType<typeof create>["ele"]>,
  scoringType: ScoringType,
  line: { ns: number; ew: number },
): void {
  const suffix = LINE_SCORE_SUFFIX[scoringType] ?? "MATCH_POINTS";
  resultEl.ele(`NS_${suffix}`).txt(String(line.ns));
  resultEl.ele(`EW_${suffix}`).txt(String(line.ew));
}
