import { parseSeat } from "@/model/participants";
import {
  swissPairIdFromHomeSeat,
  type SwissPairId,
} from "@/modules/swiss/pairs/swiss-pairing";

/**
 * The stable, section-UNqualified movement id for a Swiss pair: its bare pair
 * integer, e.g. "1" or "5". `buildSectionRows` later prefixes the section
 * (→ "A1"), exactly as the other direction-changing movements (arrow-switch
 * Mitchell, file/SPEC pairs) carry a bare id.
 *
 * A Swiss pair changes compass direction round to round, so its movement id —
 * the value written to `boards.ns`/`ew` — must NOT carry a direction. It is the
 * pair's stable number from the pairing engine (NS pairs 1..tables, EW pairs
 * tables+1..2·tables). The PHYSICAL seat a pair sits (its round-1 home, e.g.
 * "A1NS") is a separate thing, recorded on `seat_occupancy.seat`; this bare id
 * is the occupancy's `anchorId`, which is what the schedule, leaderboard and
 * player screens join a board row on.
 */
export function swissPairMovementId(
  _tables: number,
  pairId: SwissPairId,
): string {
  return `${pairId}`;
}

/** A section-qualified bare Swiss board id: a section letter + the pair number. */
const SWISS_BOARD_ID_REGEX = /^[A-Z]+(\d+)$/;

/**
 * Recover a Swiss stable pair id from the id stored on a board row's `ns`/`ew`
 * (equivalently a leaderboard line's `pairId`, or a match's `home`/`opponent`).
 *
 * A Swiss board id is the pair's bare, section-qualified number, e.g. "A1" or
 * "A5" — the stable id from the pairing engine (NS pairs 1..tables, EW pairs
 * tables+1..2·tables), with no compass direction (a Swiss pair changes
 * direction round to round). Returns null for anything that isn't such an id
 * (e.g. the sit-out phantom "APHANTOM"), so callers skip non-pair ids.
 *
 * NB: this takes a BOARD id, not a physical seat. To decode a physical seat
 * (e.g. "A1NS", a round-1 home chair) use {@link swissPairIdFromSeat}.
 */
export function swissPairIdFromParticipant(
  participantId: string,
  _tables: number,
): SwissPairId | null {
  const match = SWISS_BOARD_ID_REGEX.exec(participantId);
  if (!match) return null;
  const id = Number(match[1]);
  return Number.isFinite(id) && id > 0 ? id : null;
}

/**
 * Recover a Swiss stable pair id from a PHYSICAL seat (section-qualified, with
 * a compass direction, e.g. "A1NS") — the round-1 home chair a pair sat down
 * at. The table + direction decode to the stable integer id via the pairing
 * engine's numbering. Returns null for anything that isn't a valid seat.
 *
 * Used where the input is a physical seat rather than a board id: the Swiss
 * round-1 odd-field sit-out seat (from the expected-seat derivation) and the
 * seated-set read from `seat_occupancy.seat`.
 */
export function swissPairIdFromSeat(
  seat: string,
  tables: number,
): SwissPairId | null {
  let parsed;
  try {
    parsed = parseSeat(seat);
  } catch {
    return null;
  }
  return swissPairIdFromHomeSeat(tables, {
    tableNumber: parsed.tableNumber,
    direction: parsed.direction,
  });
}
