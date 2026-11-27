import type { TeamsCatalogMovementSummary } from "@/modules/movement-catalog/catalog-summary";
import type { MovementByTable } from "@/modules/movement-catalog/display/movementData";
import {
  americanWhistTeamsRounds,
  generateAmericanWhistTeams,
  isAmericanWhistTeamCount,
  type AmericanWhistTeamsSpec,
} from "@/modules/movement-catalog/generation/american-whist-teams/american-whist-teams";
import {
  CIRCULATION_ROUNDS,
  CIRCULATION_TEAMS,
  generateCirculationTeams,
  type CirculationTeamsSpec,
} from "@/modules/movement-catalog/generation/circulation-teams/circulation-teams";
import type { Tables } from "@/model/movement";

/**
 * The movements a Teams game can choose for its team count: American Whist
 * (generated, odd team counts) and Circulation (generated, four teams) at a
 * range of boards per round, and the teams library's movements. The picker
 * groups them by the boards a team plays.
 */

/** Where a teams movement option comes from. */
export type TeamsMovementRef =
  | { source: "americanWhist"; spec: AmericanWhistTeamsSpec }
  | { source: "circulation"; spec: CirculationTeamsSpec }
  | { source: "library"; id: number };

/** One teams movement the director can pick. */
export interface TeamsMovementOption {
  name: string;
  rounds: number;
  boardsPerRound: number;
  /** Boards each team plays (rounds × boards per round): the grouping key. */
  boardsPerTeam: number;
  /** Distinct boards in play across the session. */
  boardsInPlay: number;
  ref: TeamsMovementRef;
}

/**
 * The boards-per-round range American Whist is offered at, kept to sessions
 * where a team plays between `MIN` and `MAX` boards.
 */
export const AMERICAN_WHIST_BOARDS_PER_ROUND = { min: 2, max: 12 } as const;
export const AMERICAN_WHIST_BOARDS_PER_TEAM = { min: 12, max: 36 } as const;

/** The American Whist options for a team count (none for an even count). */
export function americanWhistOptions(teams: number): TeamsMovementOption[] {
  if (!isAmericanWhistTeamCount(teams)) return [];
  const rounds = americanWhistTeamsRounds(teams);
  const options: TeamsMovementOption[] = [];
  for (
    let boardsPerRound = AMERICAN_WHIST_BOARDS_PER_ROUND.min;
    boardsPerRound <= AMERICAN_WHIST_BOARDS_PER_ROUND.max;
    boardsPerRound++
  ) {
    const boardsPerTeam = rounds * boardsPerRound;
    if (
      boardsPerTeam < AMERICAN_WHIST_BOARDS_PER_TEAM.min ||
      boardsPerTeam > AMERICAN_WHIST_BOARDS_PER_TEAM.max
    ) {
      continue;
    }
    options.push({
      name: "American Whist",
      rounds,
      boardsPerRound,
      boardsPerTeam,
      boardsInPlay: teams * boardsPerRound,
      ref: { source: "americanWhist", spec: { teams, boardsPerRound } },
    });
  }
  return options;
}

/**
 * The Circulation options (four teams only): one to three boards to a table
 * at the start of each round, so a team plays 12, 24 or 36 boards.
 */
export function circulationOptions(teams: number): TeamsMovementOption[] {
  if (teams !== CIRCULATION_TEAMS) return [];
  return [1, 2, 3].map((boardsPerTable) => {
    const boardsPerRound = boardsPerTable * CIRCULATION_TEAMS;
    const boardsPerTeam = CIRCULATION_ROUNDS * boardsPerRound;
    return {
      name: "Circulation",
      rounds: CIRCULATION_ROUNDS,
      boardsPerRound,
      boardsPerTeam,
      boardsInPlay: boardsPerTeam,
      ref: { source: "circulation" as const, spec: { boardsPerRound } },
    };
  });
}

/**
 * Every movement a Teams game of `teams` teams can choose: American Whist and
 * Circulation first, then the library's movements (as `listTeamMovements`
 * returns them).
 */
export function teamsMovementOptions(
  teams: number,
  library: TeamsCatalogMovementSummary[],
): TeamsMovementOption[] {
  return [
    ...americanWhistOptions(teams),
    ...circulationOptions(teams),
    ...library.map((movement) => ({
      name: movement.name,
      rounds: movement.rounds,
      boardsPerRound: movement.boardsPerRound,
      boardsPerTeam: movement.rounds * movement.boardsPerRound,
      boardsInPlay: movement.boards,
      ref: { source: "library" as const, id: movement.id },
    })),
  ];
}

/**
 * An American Whist laid out by table for the movement preview, each round
 * showing the home team (NS) and visiting team (EW) by number, as the library
 * preview does.
 */
export function americanWhistPreview(
  spec: AmericanWhistTeamsSpec,
): MovementByTable[] {
  return teamsPreview(generateAmericanWhistTeams(spec));
}

/**
 * A Circulation laid out by table for the movement preview: each round shows
 * the home and visiting team and the round's boards (which every table plays).
 */
export function circulationPreview(
  spec: CirculationTeamsSpec,
): MovementByTable[] {
  return teamsPreview(generateCirculationTeams(spec));
}

/**
 * A Circulation by table for setting out the boards: each round shows only the
 * boards the table starts on (its quarter of the round's boards), which is
 * what goes on the table before the round begins.
 */
export function circulationSetOut(
  spec: CirculationTeamsSpec,
): MovementByTable[] {
  const quarter = spec.boardsPerRound / CIRCULATION_TEAMS;
  return circulationPreview(spec).map((table) => ({
    ...table,
    rounds: table.rounds.map((round) => {
      const boardStart = round.boardStart + (table.tableNumber - 1) * quarter;
      return { ...round, boardStart, boardEnd: boardStart + quarter - 1 };
    }),
  }));
}

/** A generated teams movement by table, teams shown by number. */
function teamsPreview(tables: Tables): MovementByTable[] {
  return tables.tables.map((table) => ({
    tableNumber: table.table,
    rounds: table.rounds.map((round) => ({
      roundNumber: round.round,
      ns: `${parseInt(round.participants.nsId, 10)}`,
      ew: `${parseInt(round.participants.ewId, 10)}`,
      boardStart: Math.min(...round.boards),
      boardEnd: Math.max(...round.boards),
    })),
  }));
}
