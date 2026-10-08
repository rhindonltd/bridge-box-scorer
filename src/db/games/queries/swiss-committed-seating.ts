import { Db } from "@/db/games";
import { boards } from "@/db/games/tables/boards";
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
 * Read the committed seating for one round of a Swiss section from the boards
 * table. Rows are grouped by table; `status` distinguishes ordinary play from
 * SIT_OUT (bye) and HALF_AVERAGE / anchor (half-match) rows.
 */
export async function getSwissCommittedRound(
  db: Db,
  section: SectionLetter,
  tables: number,
  roundNumber: number,
): Promise<SwissCommittedRound> {
  const rows = await db
    .select({
      tableNumber: boards.tableNumber,
      ns: boards.ns,
      ew: boards.ew,
      status: boards.status,
    })
    .from(boards)
    .where(
      and(eq(boards.section, section), eq(boards.roundNumber, roundNumber)),
    );

  const seatingTables: SwissCommittedRound["tables"] = [];
  const opponentByPair = new Map<SwissPairId, SwissPairId>();
  let sitOutPairId: SwissPairId | null = null;
  const excludedPairs = new Set<SwissPairId>();

  // Distinct opponents a PAIR faced at one table (≥2 ⇒ half-match anchor).
  // Keyed per (table, pair) — NOT per table — so an ordinary head-to-head
  // (where the table's two seats each list the other as their one opponent)
  // is not mistaken for an anchor playing two different opponents.
  const opponentsAtTable = new Map<string, Set<SwissPairId>>();
  // Dedupe table seating to one entry per table (a round lays many board rows).
  const seenTable = new Set<number>();

  for (const row of rows) {
    const nsId = swissPairIdFromParticipant(row.ns, tables);
    const ewId = swissPairIdFromParticipant(row.ew, tables);

    if (row.status === "SIT_OUT") {
      // The occupied seat holds the sitting-out pair; the other is a phantom.
      const bye = nsId ?? ewId;
      if (bye != null) {
        sitOutPairId = bye;
        excludedPairs.add(bye);
      }
      continue;
    }

    if (row.status === "HALF_AVERAGE") {
      // A compensation row: `ns` is the non-anchor being credited for the half
      // it sat out; it is one of the half-match group's three pairs.
      if (nsId != null) excludedPairs.add(nsId);
      continue;
    }

    if (nsId == null || ewId == null) continue;

    if (!seenTable.has(row.tableNumber)) {
      seenTable.add(row.tableNumber);
      seatingTables.push({ tableNumber: row.tableNumber, ns: nsId, ew: ewId });
    }

    opponentByPair.set(nsId, ewId);
    opponentByPair.set(ewId, nsId);

    for (const [pair, opp] of [
      [nsId, ewId],
      [ewId, nsId],
    ] as const) {
      const key = `${row.tableNumber}@${pair}`;
      const set = opponentsAtTable.get(key) ?? new Set<SwissPairId>();
      set.add(opp);
      opponentsAtTable.set(key, set);
    }
  }

  // A table where a pair faced two different opponents is a half-match ANCHOR:
  // exclude the anchor AND the (two) opponents it faced there — the group's
  // three pairs — from the ordinary head-to-head diff.
  for (const [key, opponents] of opponentsAtTable) {
    if (opponents.size < 2) continue;
    const anchor = Number(key.slice(key.indexOf("@") + 1));
    excludedPairs.add(anchor);
    for (const opp of opponents) excludedPairs.add(opp);
  }

  // Drop every excluded pair from the ordinary map, and any pair whose recorded
  // opponent is excluded (its table was the anchor's — the other seat).
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
