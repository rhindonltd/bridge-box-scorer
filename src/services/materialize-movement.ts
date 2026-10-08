import "server-only";

import { getDb, type Db } from "@/db/games";

import { boards, NewBoard } from "@/db/games/tables/boards";
import { matches, NewMatch, MatchKind } from "@/db/games/tables/matches";
import { assignments, Assignment } from "@/db/games/tables/assignments";
import { Tables } from "@/model/movement";
import { SectionLetter, seatFor } from "@/model/participants";

/**
 * A round in a movement ready to be materialized. Mirrors the DB round spec
 * but adds an optional `sitOut` flag: when true, this (table, round) is the
 * dormant position for a one-pair-short session — its boards are written with
 * status SIT_OUT (not played anywhere at that table that round) and the pair
 * scheduled there sits the round out.
 */
/**
 * How a {@link MaterializableRound}'s boards group into a first-class match,
 * supplied by the materialiser (which knows the real structure) so the generic
 * row builder never has to RE-INFER it. All fields but `kind`/`scoredAsUnit`
 * are optional; when a round carries no descriptor the builder synthesises a
 * default ordinary-pairs match (one match per table-round seating).
 *
 * `key` is a stable per-section grouping key: all rounds sharing a `key` within
 * a section belong to the SAME match row (so a teams triple comparison's two
 * rooms, or any multi-room encounter, collapse into one match). When omitted,
 * the builder keys the match by the round's own `(table, round, ns, ew)`.
 */
export interface MatchDescriptor {
  kind: MatchKind;
  scoredAsUnit: boolean;
  /** Stable grouping key within a section; defaults to the round's own seat. */
  key?: string;
  /** Match participants (home-seat ids, pre section-qualification). */
  home?: string;
  opponent?: string | null;
  groupId?: string | null;
  slot?: number | null;
  vpPool?: number | null;
  boardStart?: number;
  boardEnd?: number;
}

export interface MaterializableRound {
  roundNumber: number;
  ns: string;
  ew: string;
  boardStart: number;
  boardEnd: number;
  /**
   * The first-class match these boards belong to. Optional: when absent the
   * row builder synthesises an ordinary {@link MatchKind} `PAIRS` match
   * (`scoredAsUnit: false`) keyed by this round's `(table, round, ns, ew)` —
   * the right default for a static matchpoint/XIMP pairs movement. Swiss and
   * teams materialisers supply an explicit descriptor.
   */
  match?: MatchDescriptor;
  sitOut?: boolean;
  /**
   * When true, this (table, round) is the compensated (unplayed) half of a
   * Swiss Pairs "2 half matches" group: its boards are written with status
   * HALF_AVERAGE (never played or submittable) and the half-match scorer
   * recomputes the AVE+/AVE credit across them. `ns` is the non-anchor pair
   * being compensated; `ew` is a phantom. Mutually exclusive with `sitOut`.
   */
  halfAverage?: boolean;
  /**
   * Physical duplicate copy of the board set (Web Mitchell only). Optional in
   * this in-memory shape; every persisted board row still gets a definite copy
   * because the boards.copy column defaults to "A".
   */
  boardCopy?: string;
}

export interface MaterializableTable {
  tableNumber: number;
  rounds: MaterializableRound[];
}

export type MaterializableMovement = MaterializableTable[];

/**
 * A board row before its match id is known. The row builder produces these
 * linked to their match by a transient `matchTempKey`; the insert layer
 * ({@link resolveMatchIds}) inserts the match rows first (learning their
 * autoincrement ids) and swaps the temp key for the real `matchId`.
 */
export type BoardDraft = Omit<NewBoard, "matchId"> & { matchTempKey: string };

/**
 * A match row before its id is known, tagged with the transient key the
 * board drafts reference it by.
 */
export type MatchDraft = NewMatch & { tempKey: string };

/** The transient key linking a round's boards to the match they belong to. */
function matchKeyFor(
  section: SectionLetter,
  r: MaterializableRound,
  tableNumber: number,
): string {
  const explicit = r.match?.key;
  if (explicit != null) return `${section}|${explicit}`;
  // Default (static pairs / any round without a descriptor): one match per
  // table-round seating, keyed by its own seats so the two halves of a
  // half-match anchor table stay distinct.
  return `${section}|${r.roundNumber}|${tableNumber}|${r.ns}|${r.ew}`;
}

/** Build the match draft for a round's descriptor (or the default pairs match). */
function matchDraftFor(
  section: SectionLetter,
  r: MaterializableRound,
  tableNumber: number,
  tempKey: string,
): MatchDraft {
  const d = r.match;
  const kind: MatchKind = d?.kind ?? "PAIRS";
  const homeMovementId = d?.home ?? r.ns;
  const oppMovementId = d?.opponent === undefined ? r.ew : d.opponent;
  return {
    tempKey,
    section,
    roundNumber: r.roundNumber,
    kind,
    scoredAsUnit: d?.scoredAsUnit ?? false,
    home: sectionParticipantId(section, homeMovementId),
    opponent:
      oppMovementId == null ? null : sectionParticipantId(section, oppMovementId),
    groupId: d?.groupId == null ? null : `${section}|${d.groupId}`,
    slot: d?.slot ?? null,
    vpPool: d?.vpPool ?? null,
    boardStart: d?.boardStart ?? r.boardStart,
    boardEnd: d?.boardEnd ?? r.boardEnd,
    ruling: null,
  };
}

/**
 * Build the board, match, and assignment rows for a single section's movement.
 * Every round becomes board rows (tagged with the section) grouped under a
 * first-class match, and round 1 becomes the section-qualified seat
 * assignments.
 *
 * Rounds flagged `sitOut` still produce board rows (keeping their real board
 * numbers and table) but with status SIT_OUT, so the sitting-out pair's screen
 * can show the table while those boards are never played, scored, or submitted.
 *
 * Board rows are returned as {@link BoardDraft}s linked to their match by a
 * transient key; the caller resolves those to real `matchId`s at insert time
 * (match rows carry an autoincrement id). Exposed separately from the DB write
 * so the start pipeline can gather rows for all sections and insert them in one
 * transaction.
 */
export function buildSectionRows(
  section: SectionLetter,
  movement: MaterializableMovement,
): {
  boardRows: BoardDraft[];
  matchRows: MatchDraft[];
  assignmentRows: Assignment[];
} {
  const boardRows: BoardDraft[] = [];
  const assignmentRows: Assignment[] = [];
  // One match row per distinct match key seen this section (first round wins
  // its structural fields; a multi-room match's board span is widened below).
  const matchByKey = new Map<string, MatchDraft>();
  // Participant ids already given a round-1 assignment. A Swiss "2 half
  // matches" round can seat the anchor in two round-1 entries (its two halves);
  // its assignment must be written once, not duplicated (a duplicate PK insert
  // would fail). Every other movement seats each pair once in round 1, so this
  // guard is a no-op there.
  const assigned = new Set<string>();

  for (const m of movement) {
    for (const r of m.rounds) {
      const tempKey = matchKeyFor(section, r, m.tableNumber);
      let match = matchByKey.get(tempKey);
      if (match == null) {
        match = matchDraftFor(section, r, m.tableNumber, tempKey);
        matchByKey.set(tempKey, match);
      } else {
        // A later room of the SAME match (e.g. a teams triple comparison's
        // second room): widen the board span to cover both rooms' boards.
        match.boardStart = Math.min(match.boardStart, r.boardStart);
        match.boardEnd = Math.max(match.boardEnd, r.boardEnd);
      }

      for (
        let boardNumber = r.boardStart;
        boardNumber <= r.boardEnd;
        boardNumber++
      ) {
        boardRows.push({
          section,
          roundNumber: r.roundNumber,
          tableNumber: m.tableNumber,
          boardNumber,
          copy: r.boardCopy ?? "A",
          ns: sectionParticipantId(section, r.ns),
          ew: sectionParticipantId(section, r.ew),
          status: r.sitOut
            ? "SIT_OUT"
            : r.halfAverage
              ? "HALF_AVERAGE"
              : "NOT_PLAYED",
          matchTempKey: tempKey,
        });
      }

      // A half-average (compensation) block is a phantom placeholder, never a
      // real seat — it must not seed a round-1 assignment (that would clash
      // with the non-anchor pair's real seat in its played half). Sit-out rows
      // keep assigning (the sitting pair's NS seat is its real home).
      if (r.roundNumber === 1 && !r.halfAverage) {
        const seats = [
          { direction: "NS", movementId: r.ns },
          { direction: "EW", movementId: r.ew },
        ] as const;

        for (const { direction, movementId } of seats) {
          const id = sectionParticipantId(section, movementId);
          if (assigned.has(id)) continue;
          assigned.add(id);
          assignmentRows.push({
            id,
            initialSeat: seatFor(section, m.tableNumber, direction),
          });
        }
      }
    }
  }

  return {
    boardRows,
    matchRows: Array.from(matchByKey.values()),
    assignmentRows,
  };
}

/**
 * Resolve each board draft's transient match key to its match's real
 * autoincrement id, by inserting each match row (via `insertMatch`, which
 * returns the new id) and swapping the key for the id. Returns fully-formed
 * board rows ready to insert. MUST run inside the same transaction as the board
 * insert so the boards' NOT NULL `matchId` FK always resolves.
 */
export function resolveMatchIds(
  matchRows: MatchDraft[],
  boardRows: BoardDraft[],
  insertMatch: (row: NewMatch) => number,
): NewBoard[] {
  const idByKey = new Map<string, number>();
  for (const draft of matchRows) {
    const { tempKey, ...row } = draft;
    idByKey.set(tempKey, insertMatch(row));
  }
  return boardRows.map((draft) => {
    const { matchTempKey, ...row } = draft;
    const matchId = idByKey.get(matchTempKey);
    if (matchId == null) {
      throw new Error(`No match row for board key ${matchTempKey}`);
    }
    return { ...row, matchId };
  });
}

/**
 * Insert a section's match drafts, board drafts, and assignment rows into a
 * single better-sqlite3 transaction. Shared by every materialiser (static
 * pairs, Swiss pairs, teams) so the match→board id resolution and transaction
 * shape live in one place. Match rows go in first (so their autoincrement ids
 * exist), each board's `matchId` is resolved from its transient key, then the
 * boards and assignments are written.
 */
export function insertSectionDrafts(
  db: Db,
  matchRows: MatchDraft[],
  boardRows: BoardDraft[],
  assignmentRows: Assignment[],
): void {
  db.transaction((tx) => {
    const resolved = resolveMatchIds(matchRows, boardRows, (row) => {
      const info = tx.insert(matches).values(row).run();
      return Number(info.lastInsertRowid);
    });
    if (resolved.length > 0) {
      tx.insert(boards).values(resolved).run();
    }
    if (assignmentRows.length > 0) {
      tx.insert(assignments).values(assignmentRows).run();
    }
  });
}

/**
 * Movement participant ids (the numeric position ids) restart within each
 * section, so they must be section-qualified before being written to the DB to
 * stay globally unique. This id is stored on both the assignment row (`id`) and
 * the board rows (`ns`/`ew`); keeping them prefixed identically preserves the
 * schedule join between assignment.id and boards.ns/ew.
 */
export function sectionParticipantId(
  section: SectionLetter,
  movementId: string,
): string {
  return `${section}${movementId}`;
}

/**
 * Materialize a single section's pair-like movement into the per-game database.
 * All inserts run inside a single transaction.
 *
 * This is deferred until the game is started (see the start-game handler); it is
 * intentionally free of validation and assumes the caller has already confirmed
 * the movement/seating is valid.
 */
export async function materializePairLikeMovement(
  section: SectionLetter,
  movement: MaterializableMovement,
  gameId: string,
) {
  const { boardRows, matchRows, assignmentRows } = buildSectionRows(
    section,
    movement,
  );
  await insertSectionRows(gameId, matchRows, boardRows, assignmentRows);
}

/**
 * Materialize every section of a game in one transaction. Each entry pairs a
 * section letter with its already-resolved MaterializableMovement.
 */
export async function materializeSections(
  gameId: string,
  sections: { section: SectionLetter; movement: MaterializableMovement }[],
) {
  const boardRows: BoardDraft[] = [];
  const matchRows: MatchDraft[] = [];
  const assignmentRows: Assignment[] = [];

  for (const { section, movement } of sections) {
    const rows = buildSectionRows(section, movement);
    boardRows.push(...rows.boardRows);
    matchRows.push(...rows.matchRows);
    assignmentRows.push(...rows.assignmentRows);
  }

  await insertSectionRows(gameId, matchRows, boardRows, assignmentRows);
}

/**
 * Insert the given match, board, and assignment drafts into the game's database
 * in a single transaction. Shared by the single-section and all-sections
 * materializers so the transaction shape lives in one place.
 */
async function insertSectionRows(
  gameId: string,
  matchRows: MatchDraft[],
  boardRows: BoardDraft[],
  assignmentRows: Assignment[],
) {
  const db = await getDb(gameId);

  if (!db) {
    throw new Error("Game db does not exist");
  }

  insertSectionDrafts(db, matchRows, boardRows, assignmentRows);
}

/**
 * Convert a generated, fully-expanded {@link Tables} movement (board numbers
 * already applied) into the {@link MaterializableMovement} shape the DB writers
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
): MaterializableMovement {
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
 * Convert the generateMitchell output (Tables) into the MaterializableMovement
 * shape. Thin alias over {@link tablesToMaterializableMovement}, kept for its
 * existing Mitchell call sites. No match descriptor → the default ordinary
 * (field-scored) pairs match.
 */
export function mitchellToPairMovement(
  tables: Tables,
): MaterializableMovement {
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
 * the MaterializableMovement shape, tagging each room with its `TEAMS` match so
 * the two rooms of an encounter group into ONE match scored as a unit.
 *
 * A room at table T sits the home team ("${T}NS") against an away pair whose id
 * encodes the opponent's home table. The encounter's two rooms are at the two
 * teams' home tables; the match is keyed by the unordered home-table pair in
 * the round, and its participants are the two teams' stable ids ("${lo}NS" /
 * "${hi}NS"). `vpPool` is the ordinary 20 and `scoredAsUnit` is true.
 */
export function roundRobinTeamsToMaterializable(
  tables: Tables,
): MaterializableMovement {
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
