import { Db } from "@/db/games";
import { boards } from "@/db/games/tables/boards";
import { matches } from "@/db/games/tables/matches";
import { and, eq } from "drizzle-orm";
import { SectionLetter } from "@/model/participants";
import { type SwissPairId } from "@/movement/swiss/swiss-pairing";
import { swissPairIdFromParticipant } from "./swiss-board-history";

/**
 * The committed seating of a single Swiss round, recovered VERBATIM from the
 * persisted board rows — the actual opponents each pair faced that round, as
 * drawn (and possibly director-edited) at the time.
 *
 * This is the "actual" half of the EBU §3.5 mismatch comparison: who a pair
 * REALLY played, versus who the (corrected) draw says it SHOULD have played.
 * Stable pair ids throughout (decoded from the home-seat ids on each row).
 */
export interface SwissCommittedRound {
  roundNumber: number;
  /** One entry per occupied table: the two stable pair ids seated there. */
  tables: { tableNumber: number; ns: SwissPairId; ew: SwissPairId }[];
  /** The pair that sat out this round (bye), or null for an even field. */
  sitOutPairId: SwissPairId | null;
  /**
   * Each ORDINARY pair's committed head-to-head opponent this round, by stable
   * id. Pairs in a 2-half-matches group (the anchor and its two non-anchors)
   * and the bye pair are left OUT — they are not clean head-to-heads — and
   * collected in {@link excludedPairs} instead, so mismatch detection still
   * assesses the ordinary tables of a half-match/bye round.
   */
  opponentByPair: Map<SwissPairId, SwissPairId>;
  /**
   * Pairs excluded from the ordinary diff: the three pairs of a 2-half-matches
   * group (anchor + two non-anchors) and the bye pair, if any.
   */
  excludedPairs: Set<SwissPairId>;
}

/**
 * Read the committed seating for one round of a Swiss section from the
 * first-class `matches` table — the authoritative record of who met whom.
 *
 * Each PAIRS match is one ordinary head-to-head (its `home`/`opponent` seats);
 * a BYE match's participant sat out; a HALF_MATCH match's participants (the
 * anchor's two halves + the two compensated non-anchors) are the 2-half-matches
 * group. Byes and half-match pairs go into `excludedPairs` (not clean
 * head-to-heads) so §3.5 detection still assesses only the ordinary tables.
 * This replaces the former board-seating reconstruction and its `opponentsAtTable`
 * anchor heuristic.
 */
export async function getSwissCommittedRound(
  db: Db,
  section: SectionLetter,
  tables: number,
  roundNumber: number,
): Promise<SwissCommittedRound> {
  const matchRows = await db
    .select()
    .from(matches)
    .where(
      and(eq(matches.section, section), eq(matches.roundNumber, roundNumber)),
    );

  const seatingByTable = new Map<number, SwissCommittedRound["tables"][number]>();
  const opponentByPair = new Map<SwissPairId, SwissPairId>();
  let sitOutPairId: SwissPairId | null = null;
  const excludedPairs = new Set<SwissPairId>();

  for (const m of matchRows) {
    const homeId = swissPairIdFromParticipant(m.home, tables);

    if (m.kind === "BYE") {
      // One participant, no opponent; sat out this round.
      if (homeId != null) {
        sitOutPairId = homeId;
        excludedPairs.add(homeId);
      }
      continue;
    }

    const oppId =
      m.opponent != null ? swissPairIdFromParticipant(m.opponent, tables) : null;

    if (m.kind === "HALF_MATCH") {
      // Every pair in a 2-half-matches group (the anchor via its two real
      // halves, and each non-anchor via its real half and compensation block)
      // is excluded from the ordinary diff.
      if (homeId != null) excludedPairs.add(homeId);
      if (oppId != null) excludedPairs.add(oppId);
      continue;
    }

    // An ordinary PAIRS head-to-head: record the seating (home = NS) and the
    // mutual opponents.
    if (homeId == null || oppId == null) continue;
    // A match's boards all sit at one table; recover it from any of its boards.
    // We only need table seating for the detector's table/side resolution, so
    // read the table number from the match's own board rows lazily below.
    seatingByTable.set(homeId, {
      tableNumber: 0, // filled in after we read the per-match table number
      ns: homeId,
      ew: oppId,
    });
    opponentByPair.set(homeId, oppId);
    opponentByPair.set(oppId, homeId);
  }

  // The match rows don't carry a table number, but the committed seating needs
  // one (the detector targets a (round, table) room). Read the table each
  // ordinary PAIRS match sits at from its boards, keyed by the home seat.
  const seatingTables: SwissCommittedRound["tables"] = [];
  if (seatingByTable.size > 0) {
    const boardRows = await db
      .select({ tableNumber: boards.tableNumber, ns: boards.ns })
      .from(boards)
      .where(
        and(eq(boards.section, section), eq(boards.roundNumber, roundNumber)),
      );
    const tableByNs = new Map<string, number>();
    for (const b of boardRows) {
      if (!tableByNs.has(b.ns)) tableByNs.set(b.ns, b.tableNumber);
    }
    for (const m of matchRows) {
      if (m.kind !== "PAIRS") continue;
      const homeId = swissPairIdFromParticipant(m.home, tables);
      const oppId =
        m.opponent != null
          ? swissPairIdFromParticipant(m.opponent, tables)
          : null;
      if (homeId == null || oppId == null) continue;
      const tableNumber = tableByNs.get(m.home) ?? 0;
      seatingTables.push({ tableNumber, ns: homeId, ew: oppId });
    }
  }

  // Drop every excluded pair from the ordinary map, and any pair whose recorded
  // opponent is excluded.
  for (const pair of excludedPairs) opponentByPair.delete(pair);
  for (const [pair, opp] of [...opponentByPair]) {
    if (excludedPairs.has(opp)) opponentByPair.delete(pair);
  }

  return {
    roundNumber,
    tables: seatingTables.sort((a, b) => a.tableNumber - b.tableNumber),
    sitOutPairId,
    opponentByPair,
    excludedPairs,
  };
}
