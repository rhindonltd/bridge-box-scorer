import "server-only";

import { eq } from "drizzle-orm";

import { requireGameDb } from "@/db/games";
import { sections } from "@/db/games/tables/sections";
import { seatOccupancy } from "@/db/games/tables/seat-occupancy";
import { teams } from "@/db/games/tables/teams";
import { expectedLateSeats } from "@/db/games/tables/expected-late-seats";
import { ClientError } from "@/lib/api/client-error";
import { deriveTeamId, parseSeat, seatFor, type PairSeat } from "@/model/participants";
import { MIN_SECTION_TABLES, canSplitSection } from "@/model/section";

export interface SplitSectionInput {
  /** The existing section to split (its letter, e.g. "A"). */
  from: string;
  /** The new section's letter (must be free), e.g. "B". */
  newSection: string;
  /**
   * How many of the source section's tables move into the new section. The
   * HIGHEST-numbered tables move: a source with N tables and
   * `tablesToNewSection = m` keeps tables `1..(N-m)` and moves `(N-m+1)..N` into
   * the new section, renumbered there to `1..m`. Both resulting sections must
   * keep at least {@link MIN_SECTION_TABLES} tables (a one-table section cannot
   * run a movement), so `m` must satisfy
   * `MIN_SECTION_TABLES <= m <= N - MIN_SECTION_TABLES`.
   */
  tablesToNewSection: number;
  /** Optional label for the new section (defaults to its letter). */
  newLabel?: string;
  /** Optional label to (re)apply to the source section as part of the split. */
  fromLabel?: string;
}

/** A seat that was renumbered by a split: its old seat string → its new one. */
export interface SeatMove {
  from: string;
  to: string;
}

/**
 * Split an existing section into two, moving its highest-numbered tables (and
 * the pairs seated at them) into a brand-new section.
 *
 * Seats are section-qualified and table numbers restart per section, so moving
 * tables means RENUMBERING: a pair at `A{N-m+i}NS` becomes `B{i}NS`. This
 * rewrites the `seat` of each moved `seat_occupancy` row, re-keys any team name
 * (`teams.teamId`, which is `deriveTeamId(seat)`), and moves any §2.4.7
 * expected-late mark on a moved seat, then shrinks the source section — all in
 * one transaction so the room is never left half-split.
 *
 * Both affected sections have their table count changed, so each section's
 * stored `selectedMovement` (sized for the old count) is cleared; the director
 * re-picks a movement that fits. Pre-start only — the caller (route) guards on
 * `isGameStarted`, since post-start seats are referenced by materialised board
 * rows and renumbering them is out of scope.
 *
 * Returns the seat moves it performed (old seat → new seat) so the caller can
 * notify the affected player devices, whose stored seat is now stale. The
 * device's auth secret is NOT changed by the move, so a reseated device keeps
 * working once it adopts the new seat.
 */
export async function splitSection(
  gameId: string,
  input: SplitSectionInput,
): Promise<SeatMove[]> {
  const db = await requireGameDb(gameId);

  const existing = await db.select().from(sections);

  const source = existing.find((s) => s.section === input.from);
  if (!source) {
    throw new ClientError(`Section ${input.from} does not exist`);
  }

  if (existing.some((s) => s.section === input.newSection)) {
    throw new ClientError(`Section ${input.newSection} already exists`);
  }

  // A section needs at least MIN_SECTION_TABLES tables to run, so it can only
  // be split when it holds two valid sections' worth (>= 2 * MIN).
  if (!canSplitSection(source.tables)) {
    throw new ClientError(
      `Cannot split section ${input.from}: it has ${source.tables} ${
        source.tables === 1 ? "table" : "tables"
      }, and a split needs at least ${MIN_SECTION_TABLES * 2} (each section must keep ${MIN_SECTION_TABLES}).`,
    );
  }

  const moved = input.tablesToNewSection;
  const maxMoved = source.tables - MIN_SECTION_TABLES;
  if (!Number.isInteger(moved) || moved < MIN_SECTION_TABLES || moved > maxMoved) {
    throw new ClientError(
      `Cannot split section ${input.from} into ${source.tables - moved} + ${moved} tables: each section must keep at least ${MIN_SECTION_TABLES} tables, so move between ${MIN_SECTION_TABLES} and ${maxMoved}.`,
    );
  }

  // Tables 1..keep stay in the source; keep+1..N move to the new section and
  // are renumbered to 1..moved there.
  const keep = source.tables - moved;
  const newOrdinal =
    existing.length === 0
      ? 0
      : Math.max(...existing.map((s) => s.ordinal)) + 1;

  // Map a seat in the moved range of the source to its new, renumbered seat;
  // null when the seat is not in this split's moved tables. Shared by every
  // seat-keyed table so they renumber identically.
  const remap = (seat: string): PairSeat | null => {
    let parsed;
    try {
      parsed = parseSeat(seat);
    } catch {
      return null;
    }
    if (parsed.section !== input.from || parsed.tableNumber <= keep) return null;
    return seatFor(input.newSection, parsed.tableNumber - keep, parsed.direction);
  };

  const moves: SeatMove[] = [];

  // Read the rows to renumber INSIDE the transaction (synchronous better-sqlite3
  // reads) so the snapshot and the mutation are atomic: a pair seated between a
  // separate read and the write could otherwise be missed and stranded at an
  // out-of-range seat in the shrunk source.
  db.transaction((tx) => {
    tx.insert(sections)
      .values({
        section: input.newSection,
        label: input.newLabel ?? input.newSection,
        tables: moved,
        selectedMovement: null,
        ordinal: newOrdinal,
      })
      .run();

    // Seated pairs: renumber each moved occupancy's physical seat.
    const occupants = tx
      .select({ id: seatOccupancy.id, seat: seatOccupancy.seat })
      .from(seatOccupancy)
      .all();
    for (const occ of occupants) {
      const newSeat = remap(occ.seat);
      if (!newSeat) continue;

      tx.update(seatOccupancy)
        .set({ seat: newSeat })
        .where(eq(seatOccupancy.id, occ.id))
        .run();
      moves.push({ from: occ.seat, to: newSeat });
    }

    // Team names (Teams events only): re-key each moved table's team id. The
    // team id is the NS seat with the direction dropped, so remap via its NS
    // seat and derive the new id.
    const teamRows = tx.select().from(teams).all();
    for (const row of teamRows) {
      const newNsSeat = remap(`${row.teamId}NS`);
      if (!newNsSeat) continue;

      tx.update(teams)
        .set({ teamId: deriveTeamId(newNsSeat) })
        .where(eq(teams.teamId, row.teamId))
        .run();
    }

    // Expected-late marks (§2.4.7) are keyed by the empty seat. A mark on a
    // moved table must follow the renumber, or it would be orphaned at a seat
    // that no longer exists — silently dropping the late-arrival indemnity and
    // skewing start validation.
    const lateRows = tx
      .select({ seat: expectedLateSeats.seat })
      .from(expectedLateSeats)
      .all();
    for (const row of lateRows) {
      const newSeat = remap(row.seat);
      if (!newSeat) continue;

      tx.update(expectedLateSeats)
        .set({ seat: newSeat })
        .where(eq(expectedLateSeats.seat, row.seat))
        .run();
    }

    // Shrink the source and clear its now-stale movement. (The guard that
    // normally blocks shrinking below a seated table is bypassed on purpose:
    // the pairs beyond `keep` have just been moved out, so the source has no
    // seated table above `keep` any more.)
    tx.update(sections)
      .set({
        tables: keep,
        selectedMovement: null,
        ...(input.fromLabel != null ? { label: input.fromLabel } : {}),
      })
      .where(eq(sections.section, input.from))
      .run();
  });

  return moves;
}
