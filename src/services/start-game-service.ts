import "server-only";

import { Db, getDb } from "@/db/games";
import { boards } from "@/db/games/tables/boards";
import { findPairs } from "@/db/games/queries/find-pairs";
import { findSections } from "@/db/games/queries/find-sections";
import { getSectionMovement } from "@/db/games/queries/get-section-movement";
import { readExpectedLateSeats } from "@/db/games/queries/expected-late-seats";

import { PairSeat, SectionLetter, parseSeat } from "@/model/participants";
import { SelectedMovement } from "@/model/selected-movement";
import {
  aggregateSections,
  checkHalfMatchField,
  expectedSeatsFromLayout,
  flattenSections,
  validateStart,
  validateTeamsStructure,
  type AllSectionsValidationResult,
  type StartValidationResult,
} from "@/modules/seating";

import { MovementPlan } from "@/model/movement-plan";
import {
  materializeSections,
  sectionParticipantId,
  type SeatAnchor,
} from "@/services/materialize-movement";
import {
  planMovement,
  type MovementDescription,
} from "@/modules/movement-catalog";
import { describeMovement } from "@/modules/movement-catalog/server";
import {
  swissHomeAnchors,
  swissPairsRoundOnePlan,
  swissRoundOneIsHalfMatch,
  swissRoundOneLayout,
  swissTeamsRoundOnePlan,
} from "@/modules/swiss";

/**
 * Resolution of a single section: its validation and, when valid, the concrete
 * movement (with any single sit-out applied) ready to materialize.
 */
export interface ResolvedStart {
  validation: StartValidationResult;
  /** The movement to materialize, present only when validation.canStart. */
  movement: MovementPlan | null;
  /**
   * Explicit seat → anchor ids for the materializer (Swiss Pairs only, where a
   * pair's board id is its stable number rather than its round-1 position).
   * Absent → the materializer derives them from the round-1 layout.
   */
  anchors?: SeatAnchor[];
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
  expectedLateSeats: PairSeat[] = [],
): Promise<ResolvedStart> {
  if (selected === null) {
    return {
      validation: validateStart(null, seatedSeats, expectedLateSeats),
      movement: null,
    };
  }

  // Swiss rounds are drawn live, so the catalog has no schedule for them; only
  // their positional round 1 is checked against the seating here.
  if (selected.source === "SWISS" || selected.source === "SWISS_TEAMS") {
    const { tables, boardsPerRound } =
      selected.source === "SWISS"
        ? selected.swiss
        : {
            tables: selected.swissTeams.teams,
            boardsPerRound: selected.swissTeams.boardsPerRound,
          };
    const expected = expectedSeatsFromLayout(
      section,
      swissRoundOneLayout(tables, boardsPerRound),
      null,
    );
    const validation = validateStart(expected, seatedSeats, expectedLateSeats);

    // Swiss Teams has extra structural requirements the generic validator does
    // not know about: every table must be a complete team (no sit-out — that
    // would be half a team) and an odd team count needs odd handling. Layer
    // these on top.
    if (selected.source === "SWISS_TEAMS") {
      return resolveSwissTeamsStart(section, selected, validation, gameId);
    }

    // Swiss Pairs with "2 half matches" odd handling needs a group-size guard
    // the generic validator doesn't know about (a group needs three pairs), and
    // when round 1 itself is a half-match round it materializes the group
    // rather than a bye. A BYE round (or an even field) falls through to the
    // ordinary positional round 1.
    return resolveSwissPairsStart(section, selected, validation);
  }

  const description = await describeMovement(selected);

  // Derive expected seats from the movement's round-1 layout (no sit-out yet),
  // excluding any built-in phantom, qualified to this section.
  const expected = expectedSeatsFromLayout(
    section,
    description.layout,
    description.missingPair,
  );

  const validation = validateStart(expected, seatedSeats, expectedLateSeats);

  // A fixed teams movement (American Whist, Circulation, Thurner, Stagger,
  // head-to-head or a stored teams movement) shares Swiss Teams' full-team-per-table rule, but fills every
  // table every round, so any team count it was built for can start. Its whole
  // schedule is materialized at start.
  if (
    selected.source === "AMERICAN_WHIST_TEAMS" ||
    selected.source === "CIRCULATION_TEAMS" ||
    selected.source === "THURNER_TEAMS" ||
    selected.source === "STAGGER_TEAMS" ||
    selected.source === "HEAD_TO_HEAD_TEAMS" ||
    selected.source === "TEAMS_SPEC"
  ) {
    return resolveFixedTeamsStart(section, description, validation);
  }

  if (!validation.canStart) {
    return { validation, movement: null };
  }

  return {
    validation,
    movement: planMovement(description, { sitOutSeat: validation.sitOutSeat }),
  };
}

/**
 * Resolve a Swiss Pairs section's start: the base seat check plus the
 * "2 half matches" group-size check, then — when valid — round 1 (a half-match
 * group, an ordinary bye, or a full even round) with every seat anchored to its
 * pair's stable Swiss number.
 */
function resolveSwissPairsStart(
  section: SectionLetter,
  selected: Extract<SelectedMovement, { source: "SWISS" }>,
  baseValidation: StartValidationResult,
): ResolvedStart {
  const { tables } = selected.swiss;
  // Only an odd field (one empty seat) engages odd handling at all.
  const halfMatch = swissRoundOneIsHalfMatch(
    selected.swiss,
    baseValidation.sitOutSeat !== null,
  );
  const validation = checkHalfMatchField(baseValidation, { halfMatch, tables });

  if (!validation.canStart) {
    return { validation, movement: null };
  }

  return {
    validation,
    movement: swissPairsRoundOnePlan(selected.swiss, validation.sitOutSeat),
    anchors: swissPairAnchors(section, tables),
  };
}

/**
 * Every seat's anchor id in a Swiss Pairs section: the pair's stable Swiss
 * number, section-qualified ("A1".."A8" with 4 tables). An empty seat has no
 * occupancy, so its entry updates nothing.
 */
function swissPairAnchors(
  section: SectionLetter,
  tables: number,
): SeatAnchor[] {
  return swissHomeAnchors(tables).map(({ tableNumber, direction, pairId }) => ({
    seat: `${section}${tableNumber}${direction}` as PairSeat,
    anchorId: sectionParticipantId(section, `${pairId}`),
  }));
}

/**
 * Resolve a Swiss Teams section's start. On top of the base seat validation it
 * rejects a sit-out (a team must have both its pairs) and an odd team count it
 * cannot handle, then — when valid — plans round 1.
 */
function resolveSwissTeamsStart(
  section: SectionLetter,
  selected: Extract<SelectedMovement, { source: "SWISS_TEAMS" }>,
  baseValidation: StartValidationResult,
  gameId: string,
): ResolvedStart {
  const { teams, oddHandling = "BYE" } = selected.swissTeams;
  // Swiss Teams resolves an odd count via a bye or a triple (both supported);
  // a triple needs at least three teams to form the three-way.
  const validation = validateTeamsStructure(baseValidation, teams, {
    label: "Swiss Teams",
    oddHandling,
  });

  if (!validation.canStart) {
    return { validation, movement: null };
  }

  return {
    validation,
    movement: swissTeamsRoundOnePlan(selected.swissTeams, gameId, section),
    anchors: teamsAnchors(section, teams),
  };
}

/**
 * Every seat's anchor id in a teams section: a team is the two pairs seated at
 * its home table, so each pair keeps its own seat's id ("A3NS" home pair,
 * "A3EW" away pair) all event. The away pair moves to its round-1 table before
 * play. Without this, the round-1 layout would stamp each EW seat with the
 * visiting team's away-pair id (table 3 hosts another team's away pair in
 * round 1), so a team's own away pair would be scored as another team's.
 */
function teamsAnchors(section: SectionLetter, teams: number): SeatAnchor[] {
  const anchors: SeatAnchor[] = [];
  for (let table = 1; table <= teams; table++) {
    for (const direction of ["NS", "EW"] as const) {
      anchors.push({
        seat: `${section}${table}${direction}` as PairSeat,
        anchorId: sectionParticipantId(section, `${table}${direction}`),
      });
    }
  }
  return anchors;
}

/**
 * Resolve a fixed teams movement's start (American Whist, Circulation,
 * Thurner, Stagger, head-to-head or a stored teams movement): a full team at every table (no sit-out), any team count, then the
 * movement's whole schedule, with each team's pairs keeping their seats' ids.
 */
function resolveFixedTeamsStart(
  section: SectionLetter,
  description: MovementDescription,
  baseValidation: StartValidationResult,
): ResolvedStart {
  const teams = description.layout.length;
  const validation = validateTeamsStructure(baseValidation, teams, {
    label: "Teams",
    anyTeamCount: true,
  });

  if (!validation.canStart) {
    return { validation, movement: null };
  }

  return {
    validation,
    movement: planMovement(description, { sitOutSeat: null }),
    anchors: teamsAnchors(section, teams),
  };
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
  const [sections, pairs, expectedLateSeats] = await Promise.all([
    findSections(db),
    findPairs(db),
    readExpectedLateSeats(db),
  ]);

  // Group seated seats by their section prefix.
  const seatsBySection = new Map<SectionLetter, PairSeat[]>();
  for (const pair of pairs) {
    const { section } = parseSeat(pair.initialSeat);
    const list = seatsBySection.get(section) ?? [];
    list.push(pair.initialSeat);
    seatsBySection.set(section, list);
  }

  // §2.4.7: the director-marked "expected late" empty seats, grouped by section
  // so each section's validation treats its own marked seats as accounted-for.
  const lateBySection = new Map<SectionLetter, PairSeat[]>();
  for (const seat of expectedLateSeats) {
    const { section } = parseSeat(seat);
    const list = lateBySection.get(section) ?? [];
    list.push(seat as PairSeat);
    lateBySection.set(section, list);
  }

  // Sections are independent, so resolve them concurrently (each reads its own
  // movement and describes it). Promise.all preserves `sections` order.
  const resolutions: SectionResolution[] = await Promise.all(
    sections.map(async (s) => {
      const selected = await getSectionMovement(db, s.section);
      const seatedSeats = seatsBySection.get(s.section) ?? [];
      const lateSeats = lateBySection.get(s.section) ?? [];
      const resolved = await resolveSectionStart(
        s.section,
        selected,
        seatedSeats,
        gameId,
        lateSeats,
      );
      return { section: s.section, resolved };
    }),
  );

  return {
    aggregate: aggregateSections(
      resolutions.map((r) => ({
        section: r.section,
        validation: r.resolved.validation,
      })),
    ),
    resolutions,
  };
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
  return flattenSections(aggregate);
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
    return flattenSections(aggregate);
  }

  const sectionMovements = resolutions
    .filter((r) => r.resolved.movement !== null)
    .map((r) => ({
      section: r.section,
      movement: r.resolved.movement as MovementPlan,
      anchors: r.resolved.anchors,
    }));

  await materializeSections(gameId, sectionMovements);

  return flattenSections(aggregate);
}
