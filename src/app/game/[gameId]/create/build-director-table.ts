import type { DirectorTable } from "@/components/tables/DirectorTableControls";
import { Pair, seatFor } from "@/model/participants";

/** The per-table board-placement facts, keyed by table number. */
type PlacementByTable = Map<number, DirectorTable["placement"]>;

/** Which direction(s) at a table are stationary, keyed by table number. */
type StationaryByTable = Map<number, { ns: boolean; ew: boolean }>;

/**
 * Assemble the {@link DirectorTable} view-model for one table of a section:
 * resolve the NS/EW seated pairs, their compass players and seats, the
 * stationary flags, and the round-1 board placement. Pure — takes the already
 * resolved pairs / stationary / placement inputs so the page component stays
 * presentational.
 */
export function buildDirectorTable(
  section: string,
  tableNumber: number,
  pairs: Pair[] | undefined,
  stationary: StationaryByTable,
  placement: PlacementByTable,
): DirectorTable {
  const nsSeat = seatFor(section, tableNumber, "NS");
  const ewSeat = seatFor(section, tableNumber, "EW");
  const nsParticipant = pairs?.find((it) => it.initialSeat === nsSeat);
  const ewParticipant = pairs?.find((it) => it.initialSeat === ewSeat);

  // NS/EW stationarity applies to both compass points of that pair.
  const dirs = stationary.get(tableNumber);

  return {
    tableNumber,
    players: {
      N: nsParticipant?.player1 ?? null,
      S: nsParticipant?.player2 ?? null,
      E: ewParticipant?.player1 ?? null,
      W: ewParticipant?.player2 ?? null,
    },
    seats: {
      N: nsParticipant ? nsSeat : null,
      S: nsParticipant ? nsSeat : null,
      E: ewParticipant ? ewSeat : null,
      W: ewParticipant ? ewSeat : null,
    },
    stationary: {
      N: dirs?.ns ?? false,
      S: dirs?.ns ?? false,
      E: dirs?.ew ?? false,
      W: dirs?.ew ?? false,
    },
    // Board setup facts for this table (undefined when no movement is
    // resolved for the section, or the table count doesn't match).
    placement: placement.get(tableNumber),
  };
}
