import type { TeamsCatalogMovementSummary } from "@/modules/movement-catalog/catalog-summary";
import type { MovementByTable } from "@/modules/movement-catalog/display/movementData";
import {
  americanWhistTeamsRounds,
  generateAmericanWhistTeams,
  isAmericanWhistTeamCount,
  type AmericanWhistTeamsSpec,
} from "@/modules/movement-catalog/generation/american-whist-teams/american-whist-teams";

/**
 * The movements a Teams game can choose for its team count: American Whist
 * (generated, odd team counts) at a range of boards per round, and the teams
 * library's movements. The picker groups them by the boards a team plays.
 */

/** Where a teams movement option comes from. */
export type TeamsMovementRef =
  | { source: "americanWhist"; spec: AmericanWhistTeamsSpec }
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
 * Every movement a Teams game of `teams` teams can choose: American Whist
 * first, then the library's movements (as `listTeamMovements` returns them).
 */
export function teamsMovementOptions(
  teams: number,
  library: TeamsCatalogMovementSummary[],
): TeamsMovementOption[] {
  return [
    ...americanWhistOptions(teams),
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
  return generateAmericanWhistTeams(spec).tables.map((table) => ({
    tableNumber: table.table,
    rounds: table.rounds.map((round) => ({
      roundNumber: round.round,
      ns: `${parseInt(round.participants.nsId, 10)}`,
      ew: `${parseInt(round.participants.ewId, 10)}`,
      boardStart: round.boards[0],
      boardEnd: round.boards[round.boards.length - 1],
    })),
  }));
}
