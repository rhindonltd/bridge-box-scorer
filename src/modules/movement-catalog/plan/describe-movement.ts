import { Tables } from "@/model/movement";
import type { MovementPlan } from "@/model/movement-plan";
import { SelectedMovement } from "@/model/selected-movement";
import { generateMitchell } from "@/modules/movement-catalog/generation/mitchell/mitchell";
import { generateAmericanWhistTeams } from "@/modules/movement-catalog/generation/american-whist-teams/american-whist-teams";
import { generateCirculationTeams } from "@/modules/movement-catalog/generation/circulation-teams/circulation-teams";
import { generateThurnerTeams } from "@/modules/movement-catalog/generation/thurner-teams/thurner-teams";
import { generateStaggerTeams } from "@/modules/movement-catalog/generation/stagger-teams/stagger-teams";
import { generateHeadToHeadTeams } from "@/modules/movement-catalog/generation/head-to-head-teams/head-to-head-teams";
import { boardRangeForSet } from "@/modules/movement-catalog/shared";
import { isSupportedTeamsMovement } from "@/modules/movement-catalog/teams/teams-library";

/**
 * A fixed movement selection: every source except the two Swiss ones, whose
 * rounds are drawn live by the swiss module rather than fixed up front.
 */
export type FixedSelectedMovement = Extract<
  SelectedMovement,
  {
    source:
      | "SPEC"
      | "TEAMS_SPEC"
      | "MITCHELL"
      | "AMERICAN_WHIST_TEAMS"
      | "CIRCULATION_TEAMS"
      | "THURNER_TEAMS"
      | "STAGGER_TEAMS"
      | "HEAD_TO_HEAD_TEAMS";
  }
>;

/**
 * A fixed movement laid out with every seat filled, before any sit-out is
 * applied. The start check derives the expected seats from `layout`'s round 1
 * and validates the seating; `planMovement` then turns the description into the
 * plan to write, applying the sit-out the validation chose.
 */
export interface MovementDescription {
  selected: FixedSelectedMovement;
  /**
   * The movement with concrete board numbers and no sit-out flagged. A stored
   * spec's board-set indices are expanded with the selection's boards-per-round.
   * A generated teams movement (American Whist, Circulation, Thurner,
   * Stagger, head-to-head) is its whole fixed schedule.
   */
  layout: MovementPlan;
  /** A stored movement's built-in phantom pair number, or null when it has none. */
  missingPair: number | null;
}

/** One table of a stored movement, as read from movements.db. */
export interface StoredMovementTable {
  tableNumber: number;
  rounds: { roundNumber: number; ns: string; ew: string; boardSet: number }[];
}

/**
 * Convert a generated movement into a layout. A round's boards are a run of
 * consecutive numbers listed in the order the table plays them; when that
 * starts part-way through the run (a Circulation's boards pass round the
 * tables) the start is kept as `firstBoard`, and a table sharing its boards
 * with another this round (a Thurner's satellite) keeps that table as
 * `sharesWith` (a Thurner's satellite, or a Stagger's partner tables). Only Web Mitchell uses more than
 * one physical copy of the boards, so every other round plays copy "A".
 */
function generatedLayout(tables: Tables): MovementPlan {
  return tables.tables.map((table) => ({
    tableNumber: table.table,
    rounds: table.rounds.map((round) => {
      const boardStart = Math.min(...round.boards);
      const firstBoard = round.boards[0];
      return {
        roundNumber: round.round,
        ns: round.participants.nsId,
        ew: round.participants.ewId,
        boardStart,
        boardEnd: Math.max(...round.boards),
        ...(firstBoard === boardStart ? {} : { firstBoard }),
        ...(round.sharesWith == null ? {} : { sharesWith: round.sharesWith }),
        boardCopy: round.boardCopy ?? "A",
      };
    }),
  }));
}

/**
 * Describe a generated movement (a Mitchell variant, or an American Whist,
 * Circulation, Thurner, Stagger or head-to-head teams movement). No database access: the layout comes
 * from the selection's spec.
 */
export function describeGeneratedMovement(
  selected: Extract<
    FixedSelectedMovement,
    {
      source:
        | "MITCHELL"
        | "AMERICAN_WHIST_TEAMS"
        | "CIRCULATION_TEAMS"
        | "THURNER_TEAMS"
        | "STAGGER_TEAMS"
        | "HEAD_TO_HEAD_TEAMS";
    }
  >,
): MovementDescription {
  if (selected.source === "MITCHELL") {
    // Dispatch through generateMitchell so every variant flag (skip,
    // shareAndRelay, hesitation, web, americanWhist) is honoured.
    return {
      selected,
      layout: generatedLayout(generateMitchell(selected.mitchell)),
      missingPair: null,
    };
  }

  if (selected.source === "CIRCULATION_TEAMS") {
    // Circulation: the whole fixed schedule for its four teams.
    return {
      selected,
      layout: generatedLayout(
        generateCirculationTeams(selected.circulationTeams),
      ),
      missingPair: null,
    };
  }

  if (selected.source === "THURNER_TEAMS") {
    // Thurner: the whole fixed schedule, every table filled.
    return {
      selected,
      layout: generatedLayout(generateThurnerTeams(selected.thurnerTeams)),
      missingPair: null,
    };
  }

  if (selected.source === "HEAD_TO_HEAD_TEAMS") {
    // Head-to-head: both stanzas, each table starting on its own half.
    return {
      selected,
      layout: generatedLayout(generateHeadToHeadTeams(selected.headToHeadTeams)),
      missingPair: null,
    };
  }

  if (selected.source === "STAGGER_TEAMS") {
    // Stagger: the whole fixed schedule, every table filled.
    return {
      selected,
      layout: generatedLayout(generateStaggerTeams(selected.staggerTeams)),
      missingPair: null,
    };
  }

  // American Whist: the whole fixed schedule, every table filled.
  return {
    selected,
    layout: generatedLayout(
      generateAmericanWhistTeams(selected.americanWhistTeams),
    ),
    missingPair: null,
  };
}

/**
 * Describe a stored movement from its rows in movements.db, expanding each
 * round's board-set index into concrete board numbers with the selection's
 * boards-per-round. A missing pair of 0 (or none) means the movement has no
 * built-in phantom.
 */
export function describeStoredMovement(
  selected: Extract<FixedSelectedMovement, { source: "SPEC" }>,
  tables: StoredMovementTable[],
  missingPair: number | null | undefined,
): MovementDescription {
  return {
    selected,
    layout: tables.map((table) => ({
      tableNumber: table.tableNumber,
      rounds: table.rounds.map((round) => ({
        roundNumber: round.roundNumber,
        ns: round.ns,
        ew: round.ew,
        ...boardRangeForSet(round.boardSet, selected.boardsPerRound),
        // Seeded specs are single-copy; Web logistics for those live in the
        // seeded data itself, not as a distinct copy label here.
        boardCopy: "A",
      })),
    })),
    missingPair: missingPair != null && missingPair > 0 ? missingPair : null,
  };
}

/**
 * Describe a stored teams movement from its rows in movements.db. Table T is
 * team T's home table: its home pair ("${T}NS") sits North/South there every
 * round, against the visiting team's away pair ("${V}EW"). Each round's
 * board-set index is expanded with the selection's boards-per-round. Throws
 * when the movement is not one the app can run (see
 * `isSupportedTeamsMovement`); selecting one is refused before this.
 */
export function describeStoredTeamsMovement(
  selected: Extract<FixedSelectedMovement, { source: "TEAMS_SPEC" }>,
  tables: StoredMovementTable[],
): MovementDescription {
  if (!isSupportedTeamsMovement(tables)) {
    throw new Error(
      `Teams movement ${selected.specId} is not a supported teams movement`,
    );
  }
  return {
    selected,
    layout: tables.map((table) => ({
      tableNumber: table.tableNumber,
      rounds: table.rounds.map((round) => ({
        roundNumber: round.roundNumber,
        ns: `${round.ns}NS`,
        ew: `${round.ew}EW`,
        ...boardRangeForSet(round.boardSet, selected.boardsPerRound),
        boardCopy: "A",
      })),
    })),
    missingPair: null,
  };
}
