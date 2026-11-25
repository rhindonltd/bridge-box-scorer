import type { SwissPairId } from "@/modules/swiss/pairs/swiss-pairing";
import { swissPairIdFromParticipant } from "@/modules/swiss/pairs/pair-ids";

/**
 * The committed seating of one Swiss PAIRS round — the "actual" opponents for
 * the EBU §3.5 comparison.
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

/** The `matches` columns the committed-round fold reads. */
export interface SwissCommittedMatchRow {
  kind: string;
  home: string;
  opponent: string | null;
}

/** The `boards` columns the committed-round fold reads (for table numbers). */
export interface SwissCommittedBoardRow {
  tableNumber: number;
  ns: string;
}

/**
 * Whether a round's match rows include an ordinary head-to-head, so the
 * committed seating needs the round's board rows (for its table numbers).
 */
export function committedRoundNeedsBoards(
  matchRows: readonly SwissCommittedMatchRow[],
): boolean {
  return matchRows.some((m) => m.kind !== "BYE" && m.kind !== "HALF_MATCH");
}

/**
 * The committed seating for one round of a Swiss section, from its `matches`
 * rows — the authoritative record of who met whom — and its board rows (only
 * read for the table each ordinary match sat at).
 *
 * Each PAIRS match is one ordinary head-to-head (its `home`/`opponent` seats);
 * a BYE match's participant sat out; a HALF_MATCH match's participants (the
 * anchor's two halves + the two compensated non-anchors) are the 2-half-matches
 * group. Byes and half-match pairs go into `excludedPairs` (not clean
 * head-to-heads) so §3.5 detection still assesses only the ordinary tables.
 */
export function swissCommittedRound(
  matchRows: readonly SwissCommittedMatchRow[],
  boardRows: readonly SwissCommittedBoardRow[],
  tables: number,
  roundNumber: number,
): SwissCommittedRound {
  const opponentByPair = new Map<SwissPairId, SwissPairId>();
  let sitOutPairId: SwissPairId | null = null;
  const excludedPairs = new Set<SwissPairId>();
  let hasOrdinary = false;

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
      m.opponent != null
        ? swissPairIdFromParticipant(m.opponent, tables)
        : null;

    if (m.kind === "HALF_MATCH") {
      // Every pair in a 2-half-matches group (the anchor via its two real
      // halves, and each non-anchor via its real half and compensation block)
      // is excluded from the ordinary diff.
      if (homeId != null) excludedPairs.add(homeId);
      if (oppId != null) excludedPairs.add(oppId);
      continue;
    }

    // An ordinary PAIRS head-to-head: record the mutual opponents.
    if (homeId == null || oppId == null) continue;
    hasOrdinary = true;
    opponentByPair.set(homeId, oppId);
    opponentByPair.set(oppId, homeId);
  }

  // The match rows don't carry a table number, but the committed seating needs
  // one (the detector targets a (round, table) room). Read the table each
  // ordinary PAIRS match sits at from its boards, keyed by the home seat.
  const seatingTables: SwissCommittedRound["tables"] = [];
  if (hasOrdinary) {
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
