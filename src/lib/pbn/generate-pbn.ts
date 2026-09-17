import { Deal } from "@/model/common";
import { dealerFor, toPbn } from "@/model/deal";

/**
 * PBN (Portable Bridge Notation) export.
 *
 * Produces a deal-oriented PBN file: one tag block per board, carrying the
 * event metadata and the dealt cards. This is a plain-text tag format (not
 * XML), so we emit `[Tag "value"]` lines directly rather than using a builder.
 *
 * Each board block looks like:
 *   [Event "Club Game"]
 *   [Site "Club"]
 *   [Date "2026.09.17"]
 *   [Board "1"]
 *   [West ""]
 *   [North ""]
 *   [East ""]
 *   [South ""]
 *   [Deal "N:AKJ.Q982.T743.65 432.AK.AKQJ.T982 T98.JT74.65.AKQJ Q765.653.982.743"]
 *
 * Blocks are separated by a single blank line. The `Deal` tag is produced by
 * {@link toPbn} for the board's dealer ({@link dealerFor}); hands are listed
 * clockwise from the dealer, each `spades.hearts.diamonds.clubs` (ten as `T`,
 * void as an empty segment) — exactly the stored PBN form.
 *
 * Only boards that have an entered deal are emitted; a board with no deal has
 * no cards to export, so it is skipped (mirrors how the USEBIO export omits
 * HAND elements for dealless boards).
 */

export type PbnData = {
  /** Event name shown in the `[Event]` tag. */
  eventName: string;
  /** ISO date string; rendered into the PBN `[Date "YYYY.MM.DD"]` form. */
  eventDate: string;
  /** Site name shown in the `[Site]` tag (e.g. the club name). */
  site: string;
  /** The entered deals, keyed by board number (as from `getAllDealHands`). */
  deals: Map<number, Deal>;
};

/** Seat name tags emitted per board, in PBN's West/North/East/South order. */
const SEAT_TAGS: readonly string[] = ["West", "North", "East", "South"];

/**
 * Format an ISO date (or any `Date`-parseable string) into the PBN date form
 * `YYYY.MM.DD`. Falls back to the raw input if it cannot be parsed, so a
 * malformed date never throws the whole export.
 */
export function formatPbnDate(isoDate: string): string {
  const d = new Date(isoDate);
  if (isNaN(d.getTime())) return isoDate;

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");

  return `${year}.${month}.${day}`;
}

/** Render a single `[Tag "value"]` line, escaping any embedded quotes. */
function tag(name: string, value: string): string {
  return `[${name} "${value.replace(/"/g, '\\"')}"]`;
}

/** Build the tag block for one board's deal. */
function boardBlock(
  eventName: string,
  site: string,
  date: string,
  boardNumber: number,
  deal: Deal,
): string {
  const lines = [
    tag("Event", eventName),
    tag("Site", site),
    tag("Date", date),
    tag("Board", String(boardNumber)),
    ...SEAT_TAGS.map((seat) => tag(seat, "")),
    tag("Deal", toPbn(deal, dealerFor(boardNumber))),
  ];
  return lines.join("\n");
}

/**
 * Generate the full PBN document for a game. Boards are emitted in ascending
 * board-number order; boards without an entered deal are skipped. The returned
 * string ends with a trailing newline. When no board has a deal the result is
 * an empty string.
 */
export function generatePbn(data: PbnData): string {
  const date = formatPbnDate(data.eventDate);

  const boardNumbers = [...data.deals.keys()].sort((a, b) => a - b);

  const blocks = boardNumbers.map((boardNumber) =>
    boardBlock(
      data.eventName,
      data.site,
      date,
      boardNumber,
      data.deals.get(boardNumber)!,
    ),
  );

  if (blocks.length === 0) return "";

  return blocks.join("\n\n") + "\n";
}
