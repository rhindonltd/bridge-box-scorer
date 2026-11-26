import type { OverallScore } from "@/model/leaderboard";
import type {
  PairsMatchResult,
  RoomResult,
  ScoredLine,
  TeamMatchResult,
} from "@/model/event-detail";
import type { ScoringFormat } from "@/model/event-format";
import type { ScoringType, TournamentLevel } from "@/model/game-types";
import type { AssignedTeam } from "@/model/participants";
import { stripSectionPrefix } from "@/model/pair-label";
import type { BoardOutcome } from "@/model/score";
import type {
  UsebioBoardComparisonTeamsData,
  UsebioBoardResult,
  UsebioClub,
  UsebioGameData,
  UsebioPair,
  UsebioPairPlacing,
  UsebioPairsData,
  UsebioPlayer,
  UsebioSwissPairsData,
  UsebioSwissTeamsData,
  UsebioTeam,
  UsebioTeamTravellerLine,
} from "./generate-usebio";
import { buildTravellerLine } from "./traveller-line";
import {
  buildTeamPairing,
  type TeamOccupancy,
  type TeamPairing,
} from "./team-pairing";

/**
 * Lay a scored event out as USEBIO data. Every number comes from the scoring
 * run (`scoreEvent`) the leaderboard uses; this only chooses what goes where
 * in the file. See docs/design/interchange.md (E1–E12).
 */

/** A pair that can appear in the file: a seated pair, or a handover stand-in. */
export interface UsebioRosterPair {
  /** The id its results carry (a scored id, so a stand-in's has `#<n>`). */
  id: string;
  /** The seat it started at, for its direction. */
  seat: string;
  player1: UsebioPlayer;
  player2: UsebioPlayer;
}

/** One scored field, written as one SECTION. */
export interface UsebioField {
  /** The field the results were scored in (a section, or the combined label). */
  field: string;
  /** The SECTION_ID it is written under. */
  sectionId: string;
  /**
   * Board-pooled pairs: write pair numbers with their section ("A1NS"), as a
   * field pooling several sections needs. Otherwise they are section-local.
   */
  qualified: boolean;
  standings: OverallScore;
  /** A two-winner pairs event: each direction ranked on its own. */
  directional?: { ns: OverallScore; ew: OverallScore };
}

/** Everything the file is laid out from. */
export interface UsebioSnapshot {
  format: ScoringFormat;
  scoringType: ScoringType;
  club: UsebioClub;
  eventName: string;
  eventDate: string;
  sectionName: string;
  tournamentLevel?: TournamentLevel;
  /** The fields to write, one SECTION each, in order. */
  fields: UsebioField[];
  pairs: UsebioRosterPair[];
  /** The teams roster, in numbering order (teams games). */
  teams: AssignedTeam[];
  /** Seat occupancies, to name each team's partnerships (teams games). */
  occupancies: readonly TeamOccupancy[];
  lines: ScoredLine[];
  pairsMatches: PairsMatchResult[];
  teamMatches: TeamMatchResult[];
}

/** Lay a scored event out as the USEBIO data for its format. */
export function buildUsebioData(snapshot: UsebioSnapshot): UsebioGameData {
  switch (snapshot.format) {
    case "SWISS_PAIRS_VP":
      return swissPairsData(snapshot);
    case "TEAMS_VP":
    case "TEAMS_IMP_AGG":
      return swissTeamsData(snapshot);
    case "TEAMS_BAM":
    case "TEAMS_PAB":
      return boardComparisonData(snapshot);
    case "PAIRS_BOARD":
      return pairsData(snapshot);
  }
}

/** The direction a pair is listed under: where it started. */
function directionOf(seat: string): "N" | "E" {
  return seat.endsWith("NS") ? "N" : "E";
}

/** A ranked line's id: `pairId` (pairs) or `teamId` (teams). */
function idOf(line: OverallScore["lines"][number]): string {
  return "pairId" in line ? line.pairId : line.teamId;
}

function eventInfo(s: UsebioSnapshot) {
  return {
    club: s.club,
    eventName: s.eventName,
    eventDate: s.eventDate,
    tournamentLevel: s.tournamentLevel,
    sectionName: s.sectionName || "A",
    sections: s.fields.map((f) => f.sectionId),
  };
}

/* ============================================================
   BOARD-POOLED PAIRS (MP, Cross-IMP)
============================================================ */

/** The placing written for a pair: percentage (MP) or average (Cross-IMP). */
function placingOf(
  line: OverallScore["lines"][number],
): Pick<UsebioPairPlacing, "percentage" | "averageScore"> {
  if ("totalMP" in line) {
    // No comparable board yet (a top of 0) shows as the average, 50%, as on
    // the leaderboard.
    const percentage = line.maxMP > 0 ? (line.totalMP / line.maxMP) * 100 : 50;
    return { percentage: percentage.toFixed(2) };
  }
  /* v8 ignore next -- a board-pooled pairs field is ranked on MP or Cross-IMP */
  return {
    averageScore: ("crossImps" in line ? line.crossImps : 0).toFixed(2),
  };
}

function pairsData(s: UsebioSnapshot): UsebioPairsData {
  const pairs: UsebioPair[] = [];
  const boardResults: UsebioBoardResult[] = [];
  const placings: UsebioPairPlacing[] = [];
  const boards = new Set<number>();

  for (const f of s.fields) {
    const number = (id: string) => (f.qualified ? id : stripSectionPrefix(id));
    const lines = s.lines
      .filter((l) => l.field === f.field)
      .sort(
        (a, b) =>
          a.boardNumber - b.boardNumber ||
          a.roundNumber - b.roundNumber ||
          a.tableNumber - b.tableNumber,
      );

    // A pair is listed only if it has a result in the field (E6).
    const played = new Set(lines.flatMap((l) => [l.ns, l.ew]));
    for (const p of s.pairs) {
      if (!played.has(p.id)) continue;
      pairs.push({
        pairNumber: number(p.id),
        direction: directionOf(p.seat),
        section: f.sectionId,
        player1: p.player1,
        player2: p.player2,
      });
    }

    for (const l of lines) {
      boards.add(l.boardNumber);
      boardResults.push({
        table: l.tableNumber,
        board: l.boardNumber,
        round: l.roundNumber,
        nsPairNumber: number(l.ns),
        ewPairNumber: number(l.ew),
        outcome: l.outcome,
        lead: l.lead,
        section: f.sectionId,
        score: l.nsScore,
        lineScore: { ns: l.nsValue, ew: l.ewValue },
      });
    }

    // A two-winner event places each pair within its own direction (E5).
    const ranked = f.directional
      ? [...f.directional.ns.lines, ...f.directional.ew.lines]
      : f.standings.lines;
    for (const line of ranked) {
      placings.push({
        section: f.sectionId,
        pairNumber: number(idOf(line)),
        place: line.rank,
        ...placingOf(line),
      });
    }
  }

  return {
    kind: "MP_PAIRS",
    ...eventInfo(s),
    scoringType: s.scoringType,
    boards: boards.size,
    pairs,
    boardResults,
    placings,
    winnerType: s.fields.some((f) => f.directional) ? 2 : 1,
  };
}

/* ============================================================
   SWISS PAIRS
============================================================ */

function swissPairsData(s: UsebioSnapshot): UsebioSwissPairsData {
  const data: UsebioSwissPairsData = {
    kind: "SWISS_PAIRS",
    ...eventInfo(s),
    boards: 0,
    pairs: [],
    matches: [],
    ranking: [],
  };
  const boards = new Set<number>();

  for (const f of s.fields) {
    const matches = s.pairsMatches.filter((m) => m.field === f.field);
    const listed = new Set(f.standings.lines.map(idOf));
    for (const m of matches) {
      listed.add(m.ns);
      listed.add(m.ew);
      for (const b of m.boards) boards.add(b.boardNumber);
      data.matches.push({
        section: f.sectionId,
        round: m.round,
        nsPairNumber: m.ns,
        ewPairNumber: m.ew,
        nsScore: m.nsVp,
        ewScore: m.ewVp,
        boards: m.boards.map((room) => ({
          boardNumber: room.boardNumber,
          ...travellerLineOf(room),
        })),
      });
    }

    for (const p of s.pairs) {
      if (!listed.has(p.id)) continue;
      data.pairs.push({
        pairNumber: p.id,
        direction: directionOf(p.seat),
        section: f.sectionId,
        player1: p.player1,
        player2: p.player2,
      });
    }

    for (const line of f.standings.lines) {
      /* v8 ignore next -- a Swiss Pairs field is ranked on Victory Points */
      if (!("totalVP" in line)) continue;
      data.ranking.push({
        number: idOf(line),
        sectionId: f.sectionId,
        totalVP: line.totalVP,
        place: line.rank,
      });
    }
  }

  data.boards = boards.size;
  return data;
}

/** A traveller line's detail from one table's result. */
function travellerLineOf(room: RoomResult) {
  return buildTravellerLine(
    room.outcome ?? ("NP" as BoardOutcome),
    room.lead,
    room.nsScore,
  );
}

/* ============================================================
   TEAMS (Victory Points, aggregate IMPs, board comparison)
============================================================ */

/** The teams roster numbered 1..N, with each team's partnerships. */
function teamsRoster(s: UsebioSnapshot) {
  const numberByTeamId = new Map<string, string>();
  s.teams.forEach((team, i) => numberByTeamId.set(team.id, String(i + 1)));
  const pairing = buildTeamPairing(s.teams, s.occupancies);
  const numberOf = (id: string) => numberByTeamId.get(id) ?? id;
  return { numberOf, pairing };
}

/** The teams of a field: those it ranks or that played a match in it (E6). */
function fieldTeams(
  s: UsebioSnapshot,
  f: UsebioField,
  matches: TeamMatchResult[],
  numberOf: (id: string) => string,
  pairing: TeamPairing,
): UsebioTeam[] {
  const listed = new Set(f.standings.lines.map(idOf));
  for (const m of matches) {
    listed.add(m.home);
    listed.add(m.opponent);
  }
  return s.teams
    .filter((team) => listed.has(team.id))
    .map((team) => ({
      teamNumber: numberOf(team.id),
      teamName: team.name,
      sectionId: f.sectionId,
      /* v8 ignore next -- buildTeamPairing has an entry for every roster team */
      pairs: pairing.pairsByTeamId.get(team.id) ?? [],
    }));
}

/**
 * The traveller lines of one board of a team match: the home team's own table
 * (it sat NS) and the opponent's table (it sat EW), where each was played.
 */
function teamTravellerLines(
  board: TeamMatchResult["boards"][number],
  pairing: TeamPairing,
): UsebioTeamTravellerLine[] {
  const lines: UsebioTeamTravellerLine[] = [];
  if (board.homeRoom) lines.push(teamLine(board.homeRoom, "NS", pairing));
  if (board.awayRoom) lines.push(teamLine(board.awayRoom, "EW", pairing));
  return lines;
}

function teamLine(
  room: RoomResult,
  direction: string,
  pairing: TeamPairing,
): UsebioTeamTravellerLine {
  // A room played the wrong way round keeps its ids; the partnership that held
  // the North/South cards is the one recorded East/West.
  const ns = room.seatsSwapped ? room.ew : room.ns;
  const ew = room.seatsSwapped ? room.ns : room.ew;
  return {
    direction,
    nsPairNumber: pairing.pairNumberFor(ns, room.boardNumber),
    ewPairNumber: pairing.pairNumberFor(ew, room.boardNumber),
    ...travellerLineOf(room),
  };
}

/** A match's first and last board numbers. */
function boardSpan(m: TeamMatchResult) {
  /* v8 ignore start -- a recorded match always has at least one board */
  return {
    startBoard: m.boards[0]?.boardNumber ?? 0,
    endBoard: m.boards[m.boards.length - 1]?.boardNumber ?? 0,
  };
  /* v8 ignore stop */
}

function swissTeamsData(s: UsebioSnapshot): UsebioSwissTeamsData {
  const { numberOf, pairing } = teamsRoster(s);
  const isImps = s.format === "TEAMS_IMP_AGG";
  const data: UsebioSwissTeamsData = {
    kind: "SWISS_TEAMS",
    ...eventInfo(s),
    boards: 0,
    teams: [],
    matches: [],
    ranking: [],
    matchScoringMethod: isImps ? "IMPS" : "VPS",
  };
  const boards = new Set<number>();

  for (const f of s.fields) {
    const matches = s.teamMatches.filter((m) => m.field === f.field);
    data.teams.push(...fieldTeams(s, f, matches, numberOf, pairing));
    for (const m of matches) {
      for (const b of m.boards) boards.add(b.boardNumber);
      data.matches.push({
        section: f.sectionId,
        round: m.round,
        team: numberOf(m.home),
        opposingTeam: numberOf(m.opponent),
        ...boardSpan(m),
        teamScore: m.homeScore,
        opposingTeamScore: m.opponentScore,
        boards: m.boards.map((b) => ({
          boardNumber: b.boardNumber,
          imps: b.home ?? 0,
          travellerLines: teamTravellerLines(b, pairing),
        })),
      });
    }
    for (const line of f.standings.lines) {
      data.ranking.push({
        number: numberOf(idOf(line)),
        sectionId: f.sectionId,
        // Aggregate IMPs files carry total IMPs in the same field.
        totalVP: "totalImps" in line ? line.totalImps : teamVpOf(line),
        place: line.rank,
      });
    }
  }

  data.boards = boards.size;
  return data;
}

function boardComparisonData(
  s: UsebioSnapshot,
): UsebioBoardComparisonTeamsData {
  const { numberOf, pairing } = teamsRoster(s);
  const scoring = s.format === "TEAMS_PAB" ? "PAB" : "BAM";
  // Board-a-match scores a board 1 / ½ / 0, point-a-board 2 / 1 / 0.
  const points = scoring === "PAB" ? 2 : 1;
  const data: UsebioBoardComparisonTeamsData = {
    kind: "BOARD_COMPARISON_TEAMS",
    scoring,
    ...eventInfo(s),
    boards: 0,
    teams: [],
    matches: [],
    ranking: [],
  };
  const boards = new Set<number>();

  for (const f of s.fields) {
    const matches = s.teamMatches.filter((m) => m.field === f.field);
    data.teams.push(...fieldTeams(s, f, matches, numberOf, pairing));
    for (const m of matches) {
      for (const b of m.boards) boards.add(b.boardNumber);
      data.matches.push({
        section: f.sectionId,
        round: m.round,
        team: numberOf(m.home),
        opposingTeam: numberOf(m.opponent),
        ...boardSpan(m),
        teamScore: m.homeScore * points,
        opposingTeamScore: m.opponentScore * points,
        boards: m.boards.map((b) => ({
          boardNumber: b.boardNumber,
          teamPoints: (b.home ?? 0) * points,
          opposingTeamPoints: b.home == null ? 0 : (1 - b.home) * points,
          travellerLines: teamTravellerLines(b, pairing),
        })),
      });
    }
    for (const line of f.standings.lines) {
      data.ranking.push({
        number: numberOf(idOf(line)),
        sectionId: f.sectionId,
        /* v8 ignore next -- a board-comparison field is ranked on boards won */
        totalWon: ("totalWon" in line ? line.totalWon : 0) * points,
        place: line.rank,
      });
    }
  }

  data.boards = boards.size;
  return data;
}

/** A Swiss Teams line's total Victory Points. */
function teamVpOf(line: OverallScore["lines"][number]): number {
  /* v8 ignore next -- a Swiss Teams field is ranked on Victory Points */
  return "totalVP" in line ? line.totalVP : 0;
}
