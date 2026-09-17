import { create } from "xmlbuilder2";
import {
  formatOutcomeForUsebio,
  formatContractCompact,
  formatLeadForUsebio,
  isAdjustedScore,
  parseAdjustedScore,
} from "./format-contract";
import { totalTricksFor } from "./traveller-line";
import { outcomeToScore } from "@/scoring/traveller/common";
import { scoreMP as scorePairMP } from "@/scoring/traveller/pair/mp";
import { scoreIMP as scorePairIMP } from "@/scoring/traveller/pair/imp";
import { scoreXIMP as scorePairXIMP } from "@/scoring/traveller/pair/x-imp";
import { BoardOutcome } from "@/model/score";
import { Card, Deal, Directions, Rank, Suit, Suits } from "@/model/common";
import { vulnerabilityFor } from "@/model/deal";
import { ScoringType } from "@/db/games/types/scoring-type";

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
  scoringType: ScoringType;
  tables: number;
  sectionName: string;
  boards: number;
  pairs: UsebioPair[];
  boardResults: UsebioBoardResult[];
  /**
   * The dealt cards per board number (the four hands), when entered. Boards
   * absent from this map emit no HAND elements — exactly as before deals
   * existed. Optional so existing callers/tests need no change.
   */
  deals?: Map<number, Deal>;
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
  | UsebioSwissTeamsData;

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
  club: UsebioClub;
  eventName: string;
  eventDate: string;
  sectionName: string;
  boards: number;
  pairs: UsebioPair[];
  matches: UsebioSwissPairsMatch[];
  ranking: UsebioVpRankEntry[];
};

/* ---- Swiss Teams ---- */

/** A team in the Swiss Teams roster: a number, a name, and its four players. */
export type UsebioTeam = {
  teamNumber: string;
  teamName: string;
  sectionId: string;
  players: UsebioPlayer[];
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
  contract: string;
  playedBy: string;
  lead: string;
  tricks: string;
  score: string;
};

/** One Swiss Teams match: a round's team-vs-team encounter. */
export type UsebioSwissTeamsMatch = {
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
  club: UsebioClub;
  eventName: string;
  eventDate: string;
  sectionName: string;
  boards: number;
  teams: UsebioTeam[];
  matches: UsebioSwissTeamsMatch[];
  ranking: UsebioVpRankEntry[];
};

/* ============================================================
   SCORING TYPE MAPPING
============================================================ */

const SCORING_TYPE_MAP: Record<ScoringType, string> = {
  MP: "MATCH_POINTS",
  IMP: "BUTLER",
  XIMP: "CROSS_IMPS",
};

/* ============================================================
   ADJUSTED SCORE IMP VALUES

   For IMP/XIMP scoring, adjusted scores are assigned fixed IMP values:
     AVE+ (>50%) → +3 IMPs for that side
     AVE  (50%)  →  0 IMPs
     AVE- (<50%) → -3 IMPs for that side
============================================================ */

function adjustedImps(percent: number): number {
  if (percent > 50) return 3;
  if (percent < 50) return -3;
  return 0;
}

/* ============================================================
   SCORING-TYPE DESCRIPTORS

   The one place USEBIO branches on scoring type. Each descriptor knows how to
   turn a board's scorable lines into normalised { ns, ew } numbers, how to
   value an adjusted score, and whether its scores contribute to a MAX (only MP
   ranks as a percentage of a per-board maximum; IMP/XIMP accumulate raw IMPs).
   Adding a scoring type is one entry here rather than edits scattered across
   the board loop, computeBoardScores, and the ranking accumulator.
============================================================ */

type ScoreResult = { ns: number; ew: number };

interface UsebioScoreDescriptor {
  /** Score a board's scorable (non-adjusted) lines to { ns, ew } per line. */
  scoreLines: (board: number, lines: PairScoringLine[]) => LineScore[];
  /** Value an adjusted score for a board with `lineCount` results on it. */
  adjusted: (adj: { ns: number; ew: number }, lineCount: number) => ScoreResult;
  /** Whether a line's ns+ew contributes to the ranking MAX (MP only). */
  contributesToMax: boolean;
}

type PairScoringLine = { outcome: BoardOutcome; nsId: string; ewId: string };
type LineScore = { nsId: string; ewId: string; ns: number; ew: number };

const SCORE_DESCRIPTORS: Record<string, UsebioScoreDescriptor> = {
  MP: {
    scoreLines: (board, lines) =>
      scorePairMP(board, lines).map((l) => ({
        nsId: l.nsId,
        ewId: l.ewId,
        ns: l.nsMatchPoints,
        ew: l.ewMatchPoints,
      })),
    adjusted: (adj, lineCount) => {
      // MP: assign matchpoints as a percentage of the per-board maximum.
      const maxMp = 2 * (lineCount - 1);
      return {
        ns: Math.round((adj.ns / 100) * maxMp),
        ew: Math.round((adj.ew / 100) * maxMp),
      };
    },
    contributesToMax: true,
  },
  IMP: {
    scoreLines: (board, lines) =>
      scorePairIMP(board, lines).map((l) => ({
        nsId: l.nsId,
        ewId: l.ewId,
        ns: l.nsImps,
        ew: l.ewImps,
      })),
    adjusted: (adj) => ({ ns: adjustedImps(adj.ns), ew: adjustedImps(adj.ew) }),
    contributesToMax: false,
  },
  XIMP: {
    scoreLines: (board, lines) =>
      scorePairXIMP(board, lines).map((l) => ({
        nsId: l.nsId,
        ewId: l.ewId,
        ns: l.nsCrossImps,
        ew: l.ewCrossImps,
      })),
    adjusted: (adj) => ({ ns: adjustedImps(adj.ns), ew: adjustedImps(adj.ew) }),
    contributesToMax: false,
  },
};

/**
 * Resolve the descriptor for a scoring type, falling back to MP for an
 * unrecognised value (mirrors the `?? "MP"` fallback on the header's
 * BOARD_SCORING_METHOD, so malformed data still produces valid XML).
 */
function scoreDescriptorFor(scoringType: ScoringType): UsebioScoreDescriptor {
  return SCORE_DESCRIPTORS[scoringType] ?? SCORE_DESCRIPTORS.MP;
}

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
 * Open the single `<SESSION><SECTION>` wrapper the USEBIO structure nests
 * participants and boards inside, returning the SECTION element for the caller
 * to populate. The appliance runs one session per game; multi-section games
 * still export under one SECTION today (participants carry their own section
 * id), matching the pre-existing single-section export.
 */
function startSection(
  event: ReturnType<ReturnType<typeof create>["ele"]>,
  sectionId: string,
): ReturnType<ReturnType<typeof create>["ele"]> {
  const session = event.ele("SESSION", { SESSION_ID: "1" });
  return session.ele("SECTION", { SECTION_ID: sectionId });
}

/* ============================================================
   MP / BUTLER / XIMP PAIRS (unchanged behaviour)
============================================================ */

function generateMpPairsXml(data: UsebioPairsData): string {
  const { doc, event } = startUsebioDoc(data.club, "PAIRS");

  // Placings per pair (inline on each PAIR, USEBIO-style) rather than a
  // separate RANKING block.
  const ranking = computeOverallRanking(data);
  const rankByPair = new Map(ranking.map((r) => [r.pairNumber, r]));
  const ewPairs = data.pairs.filter((p) => p.direction === "E").length;

  // EVENT header.
  event
    .ele("BOARD_SCORING_METHOD")
    .txt(SCORING_TYPE_MAP[data.scoringType] ?? "MATCH_POINTS");
  event.ele("EVENT_DESCRIPTION").txt(data.eventName);
  event.ele("DATE").txt(formatDate(data.eventDate));
  event.ele("SESSION_COUNT").txt("1");
  event.ele("SECTION_COUNT").txt("1");
  event.ele("PAIRS").txt(String(data.pairs.length));
  event.ele("BOARDS_PLAYED").txt(String(data.boards));
  // One combined ranking across all pairs (not a two-winner NS/EW event).
  event.ele("WINNER_TYPE").txt("1");
  event.ele("EW_PAIRS").txt(String(ewPairs));

  const section = startSection(event, data.sectionName || "A");

  // PARTICIPANTS — each pair carries its placing inline.
  const participants = section.ele("PARTICIPANTS");
  for (const pair of data.pairs) {
    const dir = pair.direction === "N" ? "NS" : "EW";
    const pairEl = participants.ele("PAIR");
    pairEl.ele("PAIR_NUMBER").txt(pair.pairNumber);
    pairEl.ele("DIRECTION").txt(dir);

    const rank = rankByPair.get(pair.pairNumber);
    if (rank) {
      pairEl.ele("PERCENTAGE").txt(rank.percentage);
      pairEl.ele("PLACE").txt(String(rank.place));
    }

    addPlayer(pairEl, pair.player1);
    addPlayer(pairEl, pair.player2);
  }

  // BOARD elements (one per board number), each with its TRAVELLER_LINEs.
  const boardGroups = groupBy(data.boardResults, (r) => r.board);
  const boardNumbers = [...boardGroups.keys()].sort((a, b) => a - b);

  for (const boardNum of boardNumbers) {
    const results = boardGroups.get(boardNum)!;
    const scoredLines = computeBoardScores(boardNum, results, data.scoringType);

    const boardEl = section.ele("BOARD");
    boardEl.ele("BOARD_NUMBER").txt(String(boardNum));

    // Emit the dealt cards (HAND per direction, with the derived dealer) when
    // a deal has been entered for this board. Boards without a deal emit no
    // HAND elements, exactly as before.
    const deal = data.deals?.get(boardNum);
    if (deal) {
      appendHands(boardEl, boardNum, deal);
    }

    for (const result of results) {
      const key = resultKey(result);
      const lineEl = boardEl.ele("TRAVELLER_LINE");
      lineEl.ele("NS_PAIR_NUMBER").txt(result.nsPairNumber);
      lineEl.ele("EW_PAIR_NUMBER").txt(result.ewPairNumber);

      if (isAdjustedScore(result.outcome)) {
        const adj = parseAdjustedScore(result.outcome);
        lineEl.ele("CONTRACT").txt("");
        lineEl.ele("PLAYED_BY").txt("");
        lineEl.ele("LEAD").txt("");
        lineEl.ele("TRICKS").txt("");
        lineEl.ele("SCORE").txt("0");

        // `adj` is always non-null here because isAdjustedScore() and
        // parseAdjustedScore() share the same regex; `?? { ns: 0, ew: 0 }` is
        // unreachable defensive code.
        /* v8 ignore next */
        const line = scoreDescriptorFor(data.scoringType).adjusted(
          adj ?? { ns: 0, ew: 0 },
          results.length,
        );
        appendLineScore(lineEl, data.scoringType, line);
      } else {
        const contract = formatContractCompact(result.outcome);
        const declarer = formatOutcomeForUsebio(result.outcome).declarer;
        const score = outcomeToScore(boardNum, result.outcome);
        const lead = formatLeadForUsebio(result.lead);
        const lineScore = scoredLines.get(key);

        lineEl.ele("CONTRACT").txt(contract);
        lineEl.ele("PLAYED_BY").txt(declarer);
        lineEl.ele("LEAD").txt(lead);
        lineEl.ele("TRICKS").txt(totalTricksFor(result.outcome));
        lineEl.ele("SCORE").txt(String(score ?? 0));

        if (lineScore) {
          appendLineScore(lineEl, data.scoringType, lineScore);
        }
      }
    }
  }

  return doc.end({ prettyPrint: true, indent: "  " });
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
  event.ele("SESSION_COUNT").txt("1");
  event.ele("SECTION_COUNT").txt("1");
  event.ele("PAIRS").txt(String(data.pairs.length));
  event.ele("BOARDS_PLAYED").txt(String(data.boards));
  event.ele("WINNER_TYPE").txt("1");
  event.ele("EW_PAIRS").txt(String(ewPairs));

  const section = startSection(event, data.sectionName || "A");

  // Global pairs roster with inline placings.
  const rankByPair = new Map(data.ranking.map((r) => [r.number, r]));
  const participants = section.ele("PARTICIPANTS");
  for (const pair of data.pairs) {
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
  for (const match of data.matches) {
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

  return doc.end({ prettyPrint: true, indent: "  " });
}

/* ============================================================
   SWISS TEAMS
============================================================ */

function generateSwissTeamsXml(data: UsebioSwissTeamsData): string {
  const { doc, event } = startUsebioDoc(data.club, "SWISS_TEAMS");

  // EVENT header.
  event.ele("MATCH_SCORING_METHOD").txt("VPS");
  event.ele("EVENT_DESCRIPTION").txt(data.eventName);
  event.ele("DATE").txt(formatDate(data.eventDate));
  event.ele("SESSION_COUNT").txt("1");
  event.ele("SECTION_COUNT").txt("1");
  event.ele("BOARDS_PLAYED").txt(String(data.boards));
  event.ele("WINNER_TYPE").txt("1");

  const section = startSection(event, data.sectionName || "A");

  // Global team roster: each TEAM carries its id and name (both DTD
  // attributes), its placing, and its four players.
  const rankByTeam = new Map(data.ranking.map((r) => [r.number, r]));
  const participants = section.ele("PARTICIPANTS");
  for (const team of data.teams) {
    const teamEl = participants.ele("TEAM", {
      TEAM_ID: team.teamNumber,
      TEAM_NAME: team.teamName,
    });

    const rank = rankByTeam.get(team.teamNumber);
    if (rank) {
      teamEl.ele("TOTAL_SCORE").txt(String(rank.totalVP));
      teamEl.ele("PLACE").txt(String(rank.place));
    }

    for (const player of team.players) {
      addPlayer(teamEl, player);
    }
  }

  // One MATCH per round: the primary TEAM vs its OPPOSING_TEAM over a board
  // range, with per-board net IMPs and both rooms' traveller lines.
  for (const match of data.matches) {
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
        lineEl.ele("DIRECTION").txt(line.direction);
        appendTravellerDetail(lineEl, line);
      }
    }
  }

  return doc.end({ prettyPrint: true, indent: "  " });
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

function addPlayer(parentEl: ReturnType<typeof create>, player: UsebioPlayer) {
  const playerEl = parentEl.ele("PLAYER");
  playerEl.ele("PLAYER_NAME").txt(`${player.firstName} ${player.lastName}`);
  if (player.nationalId) {
    playerEl.ele("NATIONAL_ID_NUMBER").txt(player.nationalId);
  }
}

/** USEBIO HAND suit element names, in the standard high-to-low suit order. */
const USEBIO_SUIT_ELEMENT: Record<Suit, string> = {
  S: "SPADES",
  H: "HEARTS",
  D: "DIAMONDS",
  C: "CLUBS",
};

/** Rank order (high to low) for laying a suit's cards out in a HAND element. */
const RANK_ORDER: readonly Rank[] = [
  "A", "K", "Q", "J", "T", "9", "8", "7", "6", "5", "4", "3", "2",
];

/** USEBIO VULNERABILITY text for a board's vulnerability. */
const USEBIO_VULNERABILITY: Record<
  ReturnType<typeof vulnerabilityFor>,
  string
> = {
  Love: "Love",
  NS: "North-South",
  EW: "East-West",
  All: "All",
};

/**
 * Append a board's dealt cards to its BOARD element: the board VULNERABILITY
 * (derived from the board number) followed by the four HAND elements. Each HAND
 * carries the seat DIRECTION and one element per suit holding that suit's ranks
 * high-to-low (empty for a void). This matches the USEBIO 1.2 DTD, which has no
 * dealer element on BOARD/HAND — the dealer is implied by the board number.
 */
function appendHands(
  boardEl: ReturnType<ReturnType<typeof create>["ele"]>,
  boardNumber: number,
  deal: Deal,
): void {
  boardEl
    .ele("VULNERABILITY")
    .txt(USEBIO_VULNERABILITY[vulnerabilityFor(boardNumber)]);

  for (const dir of Directions) {
    const handEl = boardEl.ele("HAND");
    handEl.ele("DIRECTION").txt(dir);

    // Group this hand's cards by suit, ranks high-to-low.
    const bySuit: Record<Suit, Rank[]> = { S: [], H: [], D: [], C: [] };
    for (const card of deal[dir]) {
      const rank = card[0] as Rank;
      const suit = card[1] as Suit;
      bySuit[suit].push(rank);
    }

    for (const suit of Suits) {
      const ranks = bySuit[suit]
        .sort((a, b) => RANK_ORDER.indexOf(a) - RANK_ORDER.indexOf(b))
        .join("");
      handEl.ele(USEBIO_SUIT_ELEMENT[suit]).txt(ranks);
    }
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

function resultKey(r: UsebioBoardResult): string {
  return `${r.board}-${r.nsPairNumber}-${r.ewPairNumber}`;
}

/**
 * Write a line's NS/EW score onto a RESULT element using the USEBIO element
 * names for the scoring type (match points for MP, IMPs for IMP/XIMP). Shared
 * by the normal-result and adjusted-score branches.
 */
function appendLineScore(
  resultEl: ReturnType<ReturnType<typeof create>["ele"]>,
  scoringType: ScoringType,
  line: ScoreResult,
): void {
  if (scoringType === "MP") {
    resultEl.ele("NS_MATCH_POINTS").txt(String(line.ns));
    resultEl.ele("EW_MATCH_POINTS").txt(String(line.ew));
  } else {
    resultEl.ele("NS_IMPS").txt(String(line.ns));
    resultEl.ele("EW_IMPS").txt(String(line.ew));
  }
}

/** Running per-pair totals used to build the overall ranking. */
type PairTotals = { total: number; max: number; direction: string };

/**
 * Add a pair's contribution for one board into the totals map, creating the
 * entry on first sight. `maxDelta` is only added for scoring types that rank as
 * a percentage of a maximum (MP); IMP/XIMP pass 0. Collapses the four
 * copy-pasted get-or-create-then-add blocks the ranking previously had.
 */
function accumulate(
  totals: Map<string, PairTotals>,
  pairId: string,
  direction: "NS" | "EW",
  scoreDelta: number,
  maxDelta: number,
): void {
  const entry = totals.get(pairId) ?? { total: 0, max: 0, direction };
  entry.total += scoreDelta;
  entry.max += maxDelta > 0 ? maxDelta : 0;
  totals.set(pairId, entry);
}

/**
 * Computes per-line scores for a board, excluding adjusted scores from the
 * computation. Returns MP for MP scoring, or IMPs for IMP/XIMP scoring,
 * normalised to { ns, ew } via the scoring-type descriptor.
 */
function computeBoardScores(
  board: number,
  results: UsebioBoardResult[],
  scoringType: ScoringType,
): Map<string, ScoreResult> {
  // Filter out adjusted scores — they don't participate in normal scoring.
  const lines: PairScoringLine[] = results
    .filter((r) => !isAdjustedScore(r.outcome))
    .map((r) => ({
      outcome: r.outcome,
      nsId: r.nsPairNumber,
      ewId: r.ewPairNumber,
    }));

  const map = new Map<string, ScoreResult>();
  for (const line of scoreDescriptorFor(scoringType).scoreLines(board, lines)) {
    map.set(`${board}-${line.nsId}-${line.ewId}`, {
      ns: line.ns,
      ew: line.ew,
    });
  }
  return map;
}

type RankEntry = {
  pairNumber: string;
  direction: string;
  totalScore: number;
  maxScore: number;
  percentage: string;
  place: number;
};

function computeOverallRanking(data: UsebioPairsData): RankEntry[] {
  const totals = new Map<string, PairTotals>();
  const descriptor = scoreDescriptorFor(data.scoringType);

  const boardGroups = groupBy(data.boardResults, (r) => r.board);

  for (const [boardNum, results] of boardGroups) {
    const scoredLines = computeBoardScores(boardNum, results, data.scoringType);

    // Normally scored lines. For MP the per-board maximum a pair can earn is
    // ns+ew (they split the same pot); IMP/XIMP have no such maximum.
    for (const [key, lineScore] of scoredLines) {
      const [, nsId, ewId] = key.split("-");
      const maxForBoard = descriptor.contributesToMax
        ? lineScore.ns + lineScore.ew
        : 0;
      accumulate(totals, nsId, "NS", lineScore.ns, maxForBoard);
      accumulate(totals, ewId, "EW", lineScore.ew, maxForBoard);
    }

    // Adjusted scores, valued via the same descriptor as the board loop.
    for (const result of results) {
      if (!isAdjustedScore(result.outcome)) continue;
      const adj = parseAdjustedScore(result.outcome);
      /* v8 ignore next -- unreachable: isAdjustedScore() passing guarantees
         parseAdjustedScore() returns non-null (shared regex). */
      if (!adj) continue;

      const line = descriptor.adjusted(adj, results.length);
      const maxForBoard = descriptor.contributesToMax
        ? 2 * (results.length - 1)
        : 0;
      accumulate(totals, result.nsPairNumber, "NS", line.ns, maxForBoard);
      accumulate(totals, result.ewPairNumber, "EW", line.ew, maxForBoard);
    }
  }

  const entries: RankEntry[] = [];
  for (const [pairNumber, pairData] of totals) {
    const percentage =
      pairData.max > 0
        ? ((pairData.total / pairData.max) * 100).toFixed(2)
        : "0.00";
    entries.push({
      pairNumber,
      direction: pairData.direction,
      totalScore: pairData.total,
      maxScore: pairData.max,
      percentage,
      place: 0,
    });
  }

  entries.sort((a, b) => parseFloat(b.percentage) - parseFloat(a.percentage));

  let place = 1;
  for (let i = 0; i < entries.length; i++) {
    if (i > 0 && entries[i].percentage !== entries[i - 1].percentage) {
      place = i + 1;
    }
    entries[i].place = place;
  }

  return entries;
}
