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
  MaterializableMovement,
} from "@/services/materialize-movement";
import { generateStandardMitchellWithSitOut } from "@/movement/mitchell/sit-out";
import {
  applySpecSitOutNoMissingPair,
  alignSpecMissingPair,
} from "@/movement/spec-sit-out";

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

  const resolutions: SectionResolution[] = [];
  for (const s of sections) {
    const selected = await getSectionMovement(db, s.section);
    const seatedSeats = seatsBySection.get(s.section) ?? [];
    const resolved = await resolveSectionStart(
      s.section,
      selected,
      seatedSeats,
    );
    resolutions.push({ section: s.section, resolved });
  }

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
 * aggregate; problems are prefixed with their section label so the UI can show
 * which section is blocking. `sitOutSeat` is null at the aggregate level (each
 * section's sit-out is already applied internally on start).
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

  for (const s of aggregate.sections) {
    for (const p of s.validation.problems) {
      problems.push({
        ...p,
        message: `Section ${s.section}: ${p.message}`,
      });
    }
  }

  return {
    canStart: aggregate.canStart,
    sitOutSeat: null,
    problems,
  };
}

/**
 * Convert a rehydrated movement into the round-oriented Tables<"PAIR"> shape
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
