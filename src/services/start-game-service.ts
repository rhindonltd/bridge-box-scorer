import "server-only";

import { Db, getDb } from "@/db/games";
import { boards } from "@/db/games/tables/boards";
import { findPairs } from "@/db/games/queries/find-pairs";
import { findSections } from "@/db/games/queries/find-sections";
import { getSectionMovement } from "@/db/games/queries/get-section-movement";

import { PairSeat, SectionLetter, parseSeat } from "@/model/participants";
import { SelectedMovement } from "@/model/selected-movement";
import { deriveExpectedSeats } from "@/model/expected-seats";
import {
  validateStart,
  StartValidationResult,
  StartProblem,
} from "@/model/start-validator";
import { AllSectionsValidationResult } from "@/model/validate-sections";

import {
  rehydrateSelectedMovement,
  RehydratedMovement,
  RehydratedTable,
} from "@/services/movement-rehydration";
import {
  materializeSections,
  roundRobinTeamsToMaterializable,
  MaterializableMovement,
  MaterializableTable,
} from "@/services/materialize-movement";
import { generateStandardMitchellWithSitOut } from "@/movement/mitchell/sit-out";
import {
  applySpecSitOutNoMissingPair,
  alignSpecMissingPair,
} from "@/movement/spec-sit-out";
import { swissTeamsRoundOne } from "@/movement/swiss-teams/swiss-teams-pairing";
import {
  swissTeamsRoundOneSeed,
  swissTeamsRoundToMaterializable,
} from "@/services/materialize-swiss-teams-round";
import { generateRoundRobinTeams } from "@/movement/round-robin-teams/round-robin-teams-pairing";

/**
 * Resolution of a single section: its validation and, when valid, the concrete
 * movement (with any single sit-out applied) ready to materialize.
 */
export interface ResolvedStart {
  validation: StartValidationResult;
  /** The movement to materialize, present only when validation.canStart. */
  movement: MaterializableMovement | null;
}

/**
 * Apply the appropriate sit-out transformation for a one-pair-short section.
 * Returns a MaterializableMovement with the dormant rounds flagged sitOut.
 *
 * `sitOutSeat` is section-qualified (e.g. "A3EW"); the sit-out helpers derive
 * the within-section phantom position id from its table + direction, so the
 * section prefix is harmless here.
 */
function applySitOut(
  selected: SelectedMovement,
  rehydrated: RehydratedMovement,
  sitOutSeat: PairSeat,
): MaterializableMovement {
  if (selected.source === "SWISS") {
    return applySwissRoundOneSitOut(rehydrated.movement, sitOutSeat);
  }

  if (selected.source === "MITCHELL") {
    if (!rehydrated.isStandardMitchell) {
      throw new Error(
        "Sit-out handling is only supported for Standard Mitchell movements.",
      );
    }
    return generateStandardMitchellWithSitOut(selected.mitchell, sitOutSeat);
  }

  // Database spec.
  if (rehydrated.missingPair !== null) {
    return alignSpecMissingPair(
      rehydrated.movement,
      rehydrated.missingPair,
      sitOutSeat,
    );
  }

  return applySpecSitOutNoMissingPair(rehydrated.movement, sitOutSeat);
}

/**
 * Resolve the movement to start for a single section given its selection and
 * the seats currently filled in that section. Shared by the read-only
 * start-check and the start handler so the gate and materialization agree.
 *
 * @param section  The section these seats belong to (their seat prefix).
 * @param selected  The section's selected movement, or null when none chosen.
 * @param seatedSeats  Section-qualified seats currently occupied in the section.
 */
export async function resolveSectionStart(
  section: SectionLetter,
  selected: SelectedMovement | null,
  seatedSeats: PairSeat[],
  gameId: string,
): Promise<ResolvedStart> {
  if (selected === null) {
    return {
      validation: validateStart(null, seatedSeats),
      movement: null,
    };
  }

  const rehydrated = await rehydrateSelectedMovement(selected);

  // Derive expected seats from the movement's round-1 layout (no sit-out yet),
  // excluding any built-in phantom, qualified to this section.
  const expected = deriveExpectedSeats(
    section,
    pairMovementToTables(rehydrated.movement),
    rehydrated.missingPair != null ? Number(rehydrated.missingPair) : null,
  );

  const validation = validateStart(expected, seatedSeats);

  // Swiss Teams has extra structural requirements the generic validator does
  // not know about: every table must be a complete team (no sit-out — that
  // would be half a team) and the team count must be even (odd counts need
  // three-way handling, which is out of scope). Layer these on top.
  if (selected.source === "SWISS_TEAMS") {
    return resolveSwissTeamsStart(section, selected, validation, gameId);
  }

  // Teams Round Robin shares Swiss Teams' structural requirements (a full team
  // at every table, an even team count) but, unlike Swiss Teams, its whole
  // fixed schedule is materialized at start rather than drawn round by round.
  if (selected.source === "ROUND_ROBIN_TEAMS") {
    return resolveRoundRobinTeamsStart(selected, validation);
  }

  if (!validation.canStart) {
    return { validation, movement: null };
  }

  const movement =
    validation.sitOutSeat !== null
      ? applySitOut(selected, rehydrated, validation.sitOutSeat)
      : toMaterializable(rehydrated.movement);

  return { validation, movement };
}

/**
 * Resolve a Swiss Teams section's start. On top of the base seat validation it
 * rejects a sit-out (a team must have both its pairs) and an odd team count,
 * then — when valid — materializes round 1 by drawing a random team pairing
 * (seeded per game+section) and expanding it into open/closed-room board rows.
 */
function resolveSwissTeamsStart(
  section: SectionLetter,
  selected: Extract<SelectedMovement, { source: "SWISS_TEAMS" }>,
  baseValidation: StartValidationResult,
  gameId: string,
): ResolvedStart {
  const { teams, boardsPerRound, oddHandling = "BYE" } = selected.swissTeams;
  // Swiss Teams supports an odd count via a bye; the triangle alternative is
  // not yet implemented, so an odd TRIANGLE selection is rejected as a gap.
  const validation = validateTeamsStructure(baseValidation, teams, {
    label: "Swiss Teams",
    oddHandling,
  });

  if (!validation.canStart) {
    return { validation, movement: null };
  }

  // Random round-1 pairing, seeded per game+section so a retried start is
  // reproducible, then expanded into the two-table (open/closed) board rows.
  // An odd field byes the bottom table in round 1 (see swissTeamsRoundOne).
  const { matches, byeTeamId } = swissTeamsRoundOne(
    teams,
    swissTeamsRoundOneSeed(gameId, section),
  );
  const movement = swissTeamsRoundToMaterializable(
    1,
    boardsPerRound,
    matches,
    byeTeamId,
  );

  return { validation, movement };
}

/**
 * The structural validations both teams formats share, on top of the base seat
 * validation: every table must hold a full team (no single sit-out — that would
 * be half a team). `label` names the format in the director-facing messages.
 *
 * Odd team counts: by default an odd count is rejected (Round Robin, and Swiss
 * Teams with no odd handling). When `oddHandling` is supplied (Swiss Teams),
 * "BYE" permits an odd count (one team sits out each round) while "TRIANGLE" is
 * rejected as not-yet-implemented, so the choice is gated cleanly.
 */
function validateTeamsStructure(
  baseValidation: StartValidationResult,
  teams: number,
  options: { label: string; oddHandling?: "BYE" | "TRIANGLE" },
): StartValidationResult {
  const { label, oddHandling } = options;
  const problems: StartProblem[] = [...baseValidation.problems];

  if (baseValidation.sitOutSeat !== null) {
    problems.push({
      code: "TEAMS_SIT_OUT_NOT_ALLOWED",
      message: `${label} needs a full team at every table — seat both pairs or remove the table. Sit-outs are not supported.`,
    });
  }

  if (teams % 2 !== 0) {
    if (oddHandling === "TRIANGLE") {
      problems.push({
        code: "ODD_TEAM_COUNT",
        message: `${label} with a three-way triangle for an odd number of teams is not supported yet — choose the bye option, or add/remove a table.`,
      });
    } else if (oddHandling !== "BYE") {
      // No odd handling for this format/choice: an odd count is rejected.
      problems.push({
        code: "ODD_TEAM_COUNT",
        message: `${label} needs an even number of teams — you have ${teams}. Add or remove a table before starting.`,
      });
    }
    // oddHandling === "BYE": an odd count is allowed (a team byes each round).
  }

  return { canStart: problems.length === 0, sitOutSeat: null, problems };
}

/**
 * Resolve a Teams Round Robin section's start. It layers the shared teams
 * structural validations (full team per table, even team count) on the base
 * seat validation, then — when valid — generates the WHOLE fixed schedule
 * (every team plays every other once) and materializes all of its rounds up
 * front. There is no live draw: the schedule is deterministic from the spec.
 */
function resolveRoundRobinTeamsStart(
  selected: Extract<SelectedMovement, { source: "ROUND_ROBIN_TEAMS" }>,
  baseValidation: StartValidationResult,
): ResolvedStart {
  const { teams, rounds, boardsPerRound } = selected.roundRobinTeams;
  // Round Robin has no odd handling: an odd team count is always rejected.
  const validation = validateTeamsStructure(baseValidation, teams, {
    label: "Round Robin Teams",
  });

  if (!validation.canStart) {
    return { validation, movement: null };
  }

  const generated = generateRoundRobinTeams({ teams, rounds, boardsPerRound });
  const movement = roundRobinTeamsToMaterializable(generated);

  return { validation, movement };
}

/**
 * A section's resolved start plus its letter, used to gather all sections.
 */
interface SectionResolution {
  section: SectionLetter;
  resolved: ResolvedStart;
}

/**
 * Resolve every section of a game: read the sections, group the seated pairs by
 * section, and resolve each against its own movement. Returns per-section
 * resolutions plus the aggregate validation (all-or-nothing).
 */
async function resolveAllSections(
  gameId: string,
  db: Db,
): Promise<{
  aggregate: AllSectionsValidationResult;
  resolutions: SectionResolution[];
}> {
  const [sections, pairs] = await Promise.all([findSections(db), findPairs(db)]);

  // Group seated seats by their section prefix.
  const seatsBySection = new Map<SectionLetter, PairSeat[]>();
  for (const pair of pairs) {
    const { section } = parseSeat(pair.initialSeat);
    const list = seatsBySection.get(section) ?? [];
    list.push(pair.initialSeat);
    seatsBySection.set(section, list);
  }

  // Sections are independent, so resolve them concurrently (each reads its own
  // movement and rehydrates it). Promise.all preserves `sections` order.
  const resolutions: SectionResolution[] = await Promise.all(
    sections.map(async (s) => {
      const selected = await getSectionMovement(db, s.section);
      const seatedSeats = seatsBySection.get(s.section) ?? [];
      const resolved = await resolveSectionStart(
        s.section,
        selected,
        seatedSeats,
        gameId,
      );
      return { section: s.section, resolved };
    }),
  );

  // Each section is already resolved to a StartValidationResult; aggregate
  // them all-or-nothing (matching validateSections' contract).
  const sectionsResult = resolutions.map((r) => ({
    section: r.section,
    validation: r.resolved.validation,
  }));
  const canStart =
    sectionsResult.length > 0 &&
    sectionsResult.every((s) => s.validation.canStart);

  return {
    aggregate: { canStart, sections: sectionsResult },
    resolutions,
  };
}

/**
 * Flatten a per-section aggregate into the flat StartValidationResult shape the
 * start-check API and client currently consume. `canStart` is the all-or-nothing
 * aggregate; each problem is tagged with its `section` so the UI can group by
 * section. `sitOutSeat` is null at the aggregate level (each section's sit-out
 * is already applied internally on start).
 */
function flattenAggregate(
  aggregate: AllSectionsValidationResult,
): StartValidationResult {
  const problems: StartProblem[] = [];

  if (aggregate.sections.length === 0) {
    return {
      canStart: false,
      sitOutSeat: null,
      problems: [
        {
          code: "NO_MOVEMENT_SELECTED",
          message: "Add at least one section before starting the game.",
        },
      ],
    };
  }

  // Tag each problem with its section so the UI can group by section. The
  // message stays plain (the grouping shows which section); the section field
  // is the structured source of truth.
  for (const s of aggregate.sections) {
    for (const p of s.validation.problems) {
      problems.push({ ...p, section: s.section });
    }
  }

  return {
    canStart: aggregate.canStart,
    sitOutSeat: null,
    problems,
  };
}

/**
 * Convert a rehydrated movement into the round-oriented Tables shape
 * used by deriveExpectedSeats. Only round 1 participants matter for expected seats,
 * but we map all rounds for completeness.
 */
function pairMovementToTables(movement: RehydratedTable[]): {
  tables: {
    table: number;
    rounds: {
      round: number;
      boards: number[];
      participants: { nsId: string; ewId: string };
    }[];
  }[];
} {
  return {
    tables: movement.map((table) => ({
      table: table.tableNumber,
      rounds: table.rounds.map((round) => ({
        round: round.roundNumber,
        // Rehydrated rounds always carry a valid inclusive board range
        // (Mitchell uses boardsForSet, DB specs use boardRangeForSet, both with
        // a positive boardsPerRound), so boardEnd is never below boardStart;
        // the `: []` arm is defensive only.
        /* v8 ignore next 3 */
        boards:
          round.boardEnd >= round.boardStart
            ? rangeInclusive(round.boardStart, round.boardEnd)
            : [],
        participants: { nsId: round.ns, ewId: round.ew },
      })),
    })),
  };
}

function rangeInclusive(start: number, end: number): number[] {
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

/**
 * Apply a round-1 bye to a Swiss positional layout.
 *
 * With an odd field one seat is empty; `sitOutSeat` is that empty seat, and the
 * pair sitting the OTHER direction at the same table is the bye pair (round 1 is
 * positional, so each table holds exactly its two pairs). That table is emitted
 * as a sit-out: the bye pair keeps the table with a phantom opponent and its
 * boards are flagged SIT_OUT (played by no one). Every other table materializes
 * normally.
 */
function applySwissRoundOneSitOut(
  movement: RehydratedTable[],
  sitOutSeat: PairSeat,
): MaterializableMovement {
  const { tableNumber, direction } = parseSeat(sitOutSeat);

  return movement.map((table): MaterializableTable => {
    const round = table.rounds[0];
    const base = {
      roundNumber: round.roundNumber,
      boardStart: round.boardStart,
      boardEnd: round.boardEnd,
      boardCopy: round.boardCopy,
    };

    if (table.tableNumber !== tableNumber) {
      return {
        tableNumber: table.tableNumber,
        rounds: [{ ...base, ns: round.ns, ew: round.ew }],
      };
    }

    // The bye pair is the one sitting the opposite direction to the empty seat.
    const byePair = direction === "NS" ? round.ew : round.ns;
    return {
      tableNumber: table.tableNumber,
      rounds: [
        {
          ...base,
          // Keep the bye pair on NS with a phantom opponent, flagged sit-out —
          // matching the representation the board-history reader expects (the
          // phantom is not a valid seat, so it is never read as a pair).
          ns: byePair,
          ew: "PHANTOM",
          sitOut: true,
        },
      ],
    };
  });
}

/**
 * Convert a rehydrated DB movement to a MaterializableMovement with no sit-out
 * flags (used when the movement is exactly filled).
 */
function toMaterializable(movement: RehydratedTable[]): MaterializableMovement {
  return movement.map((table) => ({
    tableNumber: table.tableNumber,
    rounds: table.rounds.map((round) => ({
      roundNumber: round.roundNumber,
      ns: round.ns,
      ew: round.ew,
      boardStart: round.boardStart,
      boardEnd: round.boardEnd,
      boardCopy: round.boardCopy,
    })),
  }));
}

/**
 * Read-only check of whether a game can be started, across all sections. Reads
 * each section's selection and the current seating and runs the same resolution
 * as the start handler, without writing anything. Used by the start-check
 * endpoint so the UI can enable/disable the Start button and show reasons.
 */
export async function checkStart(
  gameId: string,
  db: Db,
): Promise<StartValidationResult> {
  const { aggregate } = await resolveAllSections(gameId, db);
  return flattenAggregate(aggregate);
}

/**
 * Start a game: read each section's selection and seating, validate all
 * sections (all-or-nothing), and — only when every section is valid —
 * materialize every section's boards + assignments in one transaction.
 * Idempotent-guarded against a game whose boards have already been materialized.
 *
 * Returns the flattened validation result; when it cannot start, nothing is
 * written.
 */
export async function startGame(
  gameId: string,
): Promise<StartValidationResult> {
  const db = await getDb(gameId);
  if (!db) {
    throw new Error("Game db does not exist");
  }

  // Guard against double materialization.
  const existing = await db
    .select({ n: boards.boardNumber })
    .from(boards)
    .limit(1);
  if (existing.length > 0) {
    return {
      canStart: false,
      sitOutSeat: null,
      problems: [
        {
          code: "NO_MOVEMENT_SELECTED",
          message: "This game has already been started.",
        },
      ],
    };
  }

  const { aggregate, resolutions } = await resolveAllSections(gameId, db);

  if (!aggregate.canStart) {
    return flattenAggregate(aggregate);
  }

  const sectionMovements = resolutions
    .filter((r) => r.resolved.movement !== null)
    .map((r) => ({
      section: r.section,
      movement: r.resolved.movement as MaterializableMovement,
    }));

  await materializeSections(gameId, sectionMovements);

  return flattenAggregate(aggregate);
}
