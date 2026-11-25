import { Tables } from "@/model/movement";
import type { MatchDescriptor, MovementPlan } from "@/model/movement-plan";
import type { PairSeat } from "@/model/participants";
import { generateStandardMitchellWithSitOut } from "@/modules/movement-catalog/generation/mitchell/sit-out";
import { generateRoundRobinTeams } from "@/modules/movement-catalog/generation/round-robin-teams/round-robin-teams-pairing";
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
 * - Teams Round Robin: the whole fixed schedule (every team plays every other
 *   once), each encounter's two rooms grouped into one TEAMS match. Teams
 *   never have a sit-out (the start check rejects one), so `sitOutSeat` is not
 *   read.
 */
export function planMovement(
  description: MovementDescription,
  { sitOutSeat }: { sitOutSeat: PairSeat | null },
): MovementPlan {
  const { selected, layout, missingPair } = description;

  if (selected.source === "ROUND_ROBIN_TEAMS") {
    const { teams, rounds, boardsPerRound } = selected.roundRobinTeams;
    return roundRobinTeamsToMaterializable(
      generateRoundRobinTeams({ teams, rounds, boardsPerRound }),
    );
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
 * every generator that emits `Tables` — Mitchell-family pairs and Teams Round
 * Robin alike — shares it.
 */
export function tablesToMaterializableMovement(
  tables: Tables,
  /**
   * Optional per-round match descriptor builder. When omitted every round gets
   * the default ordinary-pairs match (`PAIRS`, `scoredAsUnit: false`) — correct
   * for a static matchpoint/XIMP pairs movement. Teams Round Robin supplies one
   * so its rooms group into `TEAMS` matches scored as a unit.
   */
  describeMatch?: (round: {
    roundNumber: number;
    tableNumber: number;
    ns: string;
    ew: string;
    boardStart: number;
    boardEnd: number;
  }) => MatchDescriptor,
): MovementPlan {
  return tables.tables.map((table) => ({
    tableNumber: table.table,
    rounds: table.rounds.map((round) => {
      const boardStart = round.boards[0];
      const boardEnd = round.boards[round.boards.length - 1];
      const ns = round.participants.nsId;
      const ew = round.participants.ewId;
      return {
        roundNumber: round.round,
        ns,
        ew,
        boardStart,
        boardEnd,
        boardCopy: round.boardCopy,
        match: describeMatch?.({
          roundNumber: round.round,
          tableNumber: table.table,
          ns,
          ew,
          boardStart,
          boardEnd,
        }),
      };
    }),
  }));
}

/**
 * Convert the generateMitchell output (Tables) into the MovementPlan
 * shape. Thin alias over {@link tablesToMaterializableMovement}, kept for its
 * existing Mitchell call sites. No match descriptor → the default ordinary
 * (field-scored) pairs match.
 */
export function mitchellToPairMovement(tables: Tables): MovementPlan {
  return tablesToMaterializableMovement(tables);
}

/**
 * The home-table number encoded in a teams seat id ("3NS" / "3EW" → 3). A teams
 * RR seat is the home team's NS pair ("${T}NS") or an away pair that travelled
 * from its own home table ("${T}EW"), so the number is the room's home table.
 */
function teamsSeatTable(seatId: string): number {
  return parseInt(seatId, 10);
}

/**
 * Convert a generated Teams Round Robin (`generateRoundRobinTeams` output) into
 * the MovementPlan shape, tagging each room with its `TEAMS` match so
 * the two rooms of an encounter group into ONE match scored as a unit.
 *
 * A room at table T sits the home team ("${T}NS") against an away pair whose id
 * encodes the opponent's home table. The encounter's two rooms are at the two
 * teams' home tables; the match is keyed by the unordered home-table pair in
 * the round, and its participants are the two teams' stable ids ("${lo}NS" /
 * "${hi}NS"). `vpPool` is the ordinary 20 and `scoredAsUnit` is true.
 */
export function roundRobinTeamsToMaterializable(tables: Tables): MovementPlan {
  return tablesToMaterializableMovement(tables, (round) => {
    const homeTable = teamsSeatTable(round.ns);
    const oppTable = teamsSeatTable(round.ew);
    const lo = Math.min(homeTable, oppTable);
    const hi = Math.max(homeTable, oppTable);
    return {
      kind: "TEAMS",
      scoredAsUnit: true,
      key: `${round.roundNumber}|teams|${lo}-${hi}`,
      home: `${lo}NS`,
      opponent: `${hi}NS`,
      vpPool: 20,
    };
  });
}
