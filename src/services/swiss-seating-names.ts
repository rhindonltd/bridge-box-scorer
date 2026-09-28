import "server-only";

import { Db } from "@/db/games";
import type { Player } from "@/db/games/tables/players";
import { buildAssignmentPlayerLookup } from "@/db/games/queries/assignment-players";
import { swissPairMovementId } from "@/services/materialize-swiss-round";
import type { SwissPairId, SwissSeating } from "@/movement/swiss/swiss-pairing";
import type { SectionLetter } from "@/model/participants";

/** One table's seating with resolved player names, ready to render. */
export interface NamedSeatingTable {
  tableNumber: number;
  /** Stable Swiss pair id sitting North/South. */
  nsPairId: SwissPairId;
  /** Stable Swiss pair id sitting East/West. */
  ewPairId: SwissPairId;
  players: {
    N: Player | null;
    S: Player | null;
    E: Player | null;
    W: Player | null;
  };
}

/** The bye pair with resolved player names. */
export interface NamedByePair {
  pairId: SwissPairId;
  players: { player1: Player | null; player2: Player | null };
}

/** A round's seating with names: the played tables plus the optional bye pair. */
export interface NamedSeating {
  tables: NamedSeatingTable[];
  bye: NamedByePair | null;
}

/**
 * Resolve a drawn/edited Swiss seating (stable pair ids) into player names for
 * display, using the same assignment→players join the player schedule uses.
 *
 * A Swiss pair's section-qualified seat id is `${section}${swissPairMovementId}`
 * (its round-1 home seat), which is exactly the assignment id the names are
 * keyed by — so this works for any round, not just round 1, and reflects
 * director edits since it is driven purely by the passed-in seating.
 */
export async function resolveSwissSeatingNames(
  db: Db,
  section: SectionLetter,
  tables: number,
  seating: SwissSeating[],
  sitOutPairId: SwissPairId | null,
): Promise<NamedSeating> {
  const lookup = await buildAssignmentPlayerLookup(db);

  const seatId = (pairId: SwissPairId): string =>
    `${section}${swissPairMovementId(tables, pairId)}`;

  const namedTables: NamedSeatingTable[] = seating
    .map((seat) => {
      const ns = lookup.get(seatId(seat.ns));
      const ew = lookup.get(seatId(seat.ew));
      return {
        tableNumber: seat.tableNumber,
        nsPairId: seat.ns,
        ewPairId: seat.ew,
        players: {
          N: ns?.player1 ?? null,
          S: ns?.player2 ?? null,
          E: ew?.player1 ?? null,
          W: ew?.player2 ?? null,
        },
      };
    })
    .sort((a, b) => a.tableNumber - b.tableNumber);

  let bye: NamedByePair | null = null;
  if (sitOutPairId != null) {
    const byePlayers = lookup.get(seatId(sitOutPairId));
    bye = {
      pairId: sitOutPairId,
      players: {
        player1: byePlayers?.player1 ?? null,
        player2: byePlayers?.player2 ?? null,
      },
    };
  }

  return { tables: namedTables, bye };
}
