import { Tables } from "@/model/movement";
import type { MovementPlan } from "@/model/movement-plan";
import type { PairSeat } from "@/model/participants";
import { generateStandardMitchellWithSitOut } from "@/modules/movement-catalog/pairs/mitchell/sit-out";
import { boardSetFor } from "@/modules/movement-catalog/shared";
import type { MovementDescription } from "./describe-movement";
import {
  alignSpecMissingPair,
  applySpecSitOutNoMissingPair,
} from "./spec-sit-out";

/**
 * The plan to write for a described fixed movement, with the sit-out applied.
 *
 * `sitOutSeat` is the one empty seat the start validation chose for a
 * one-pair-short section, or null when every seat is filled. It is
 * section-qualified (e.g. "A3EW"); the sit-out helpers take the within-section
 * phantom position from its table and direction, so the prefix is harmless.
 *
 * - Mitchell: a sit-out is only supported for a Standard Mitchell (no variant
 *   flag), which is regenerated with the empty seat's pair as the phantom.
 * - Stored spec: a movement with a built-in missing pair is rotated so its
 *   phantom lines up with the empty seat; otherwise the position at the empty
 *   seat becomes the phantom.
 * - Teams (American Whist, Circulation, Thurner, Stagger, head-to-head or a
 *   stored teams movement):
 *   the described layout as it is, each match's two rooms grouped into one
 *   TEAMS match (see `teamsLayoutToMaterializable`). Teams never have a sit-out
 *   (the start check rejects one), so `sitOutSeat` is not read.
 */
export function planMovement(
  description: MovementDescription,
  { sitOutSeat }: { sitOutSeat: PairSeat | null },
): MovementPlan {
  const { selected, layout, missingPair } = description;

  // A teams movement (American Whist, Circulation, Thurner, Stagger,
  // head-to-head or a stored teams movement) is laid out in full by its description, and a teams start never has a
  // sit-out (a team needs both its pairs).
  if (selected.source === "AMERICAN_WHIST_TEAMS") {
    return teamsLayoutToMaterializable(
      layout,
      selected.americanWhistTeams.boardsPerRound,
    );
  }
  if (selected.source === "CIRCULATION_TEAMS") {
    return teamsLayoutToMaterializable(
      layout,
      selected.circulationTeams.boardsPerRound,
    );
  }
  if (selected.source === "THURNER_TEAMS") {
    return teamsLayoutToMaterializable(
      layout,
      selected.thurnerTeams.boardsPerRound,
    );
  }
  if (selected.source === "HEAD_TO_HEAD_TEAMS") {
    return teamsLayoutToMaterializable(
      layout,
      selected.headToHeadTeams.boardsPerRound,
    );
  }
  if (selected.source === "STAGGER_TEAMS") {
    return teamsLayoutToMaterializable(
      layout,
      selected.staggerTeams.boardsPerRound,
    );
  }
  if (selected.source === "TEAMS_SPEC") {
    return teamsLayoutToMaterializable(layout, selected.boardsPerRound);
  }

  if (sitOutSeat === null) {
    return layout;
  }

  if (selected.source === "MITCHELL") {
    const { skip, shareAndRelay, hesitation, web, americanWhist } =
      selected.mitchell;
    // Only a plain Standard Mitchell (no variant flag) supports a sit-out;
    // the variants build differently.
    const isStandardMitchell =
      !skip && !shareAndRelay && !hesitation && !web && !americanWhist;
    if (!isStandardMitchell) {
      throw new Error(
        "Sit-out handling is only supported for Standard Mitchell movements.",
      );
    }
    return generateStandardMitchellWithSitOut(selected.mitchell, sitOutSeat);
  }

  // Stored spec.
  if (missingPair !== null) {
    return alignSpecMissingPair(layout, `${missingPair}`, sitOutSeat);
  }
  return applySpecSitOutNoMissingPair(layout, sitOutSeat);
}

/**
 * Convert a generated, fully-expanded {@link Tables} movement (board numbers
 * already applied) into the {@link MovementPlan} shape the DB writers
 * consume. Movement-agnostic: it only reads the per-table, per-round layout, so
 * every generator that emits `Tables` shares it. A round whose boards are
 * listed starting part-way through their run gets that start as its
 * `firstBoard`. Every round gets the default ordinary-pairs match (`PAIRS`,
 * `scoredAsUnit: false`).
 */
export function tablesToMaterializableMovement(tables: Tables): MovementPlan {
  return tables.tables.map((table) => ({
    tableNumber: table.table,
    rounds: table.rounds.map((round) => {
      // A round's boards are a run of consecutive numbers, listed in the order
      // the table plays them: usually ascending, or starting part-way through
      // when the boards circulate round the tables.
      const boardStart = Math.min(...round.boards);
      const boardEnd = Math.max(...round.boards);
      const firstBoard = round.boards[0];
      return {
        roundNumber: round.round,
        ns: round.participants.nsId,
        ew: round.participants.ewId,
        boardStart,
        boardEnd,
        ...(firstBoard === boardStart ? {} : { firstBoard }),
        boardCopy: round.boardCopy,
      };
    }),
  }));
}

/**
 * The home-table number encoded in a teams seat id ("3NS" / "3EW" → 3). A teams
 * seat is the home team's NS pair ("${T}NS") or an away pair that travelled
 * from its own home table ("${T}EW"), so the number is the room's home table.
 */
function teamsSeatTable(seatId: string): number {
  return parseInt(seatId, 10);
}

/**
 * Tag a teams movement's rooms with their `TEAMS` match, so a match's two
 * rooms group into ONE match scored as a unit. Two teams play one match, so
 * the match is keyed by the unordered home-table pair alone: the two rooms may
 * be played in different rounds, and a head-to-head's two stanzas are one
 * match over both stanzas' boards. The match is numbered by its (first) board
 * set (each team plays each set once), which gives every team one match per
 * number for the per-round scorers.
 */
export function teamsLayoutToMaterializable(
  layout: MovementPlan,
  boardsPerRound: number,
): MovementPlan {
  return layout.map((table) => ({
    ...table,
    rounds: table.rounds.map((round) => {
      const homeTable = teamsSeatTable(round.ns);
      const oppTable = teamsSeatTable(round.ew);
      const lo = Math.min(homeTable, oppTable);
      const hi = Math.max(homeTable, oppTable);
      return {
        ...round,
        match: {
          kind: "TEAMS" as const,
          scoredAsUnit: true,
          key: `teams|${lo}-${hi}`,
          home: `${lo}NS`,
          opponent: `${hi}NS`,
          vpPool: 20,
          roundNumber: boardSetFor(round.boardStart, boardsPerRound),
        },
      };
    }),
  }));
}
