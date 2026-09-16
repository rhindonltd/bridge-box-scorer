import { Db } from "@/db/games";
import { findPairs } from "@/db/games/queries/find-pairs";
import { AssignedTeam, Pair, Seat, parseSeat } from "@/model/participants";

/**
 * Derive the teams of a game from its seating.
 *
 * A team is the two pairs seated at one home table: the North/South pair (the
 * home pair, which never moves) and the East/West pair (the away pair, which
 * travels to opponents). No team-entry step is needed — sitting two pairs at
 * the same table IS the team. A team's stable id is its home NS pair's seat
 * (e.g. "A1NS"), so the id matches the pair id already stored on board rows and
 * used for leaderboard highlighting.
 *
 * A table with only one of its two seats filled is not yet a complete team and
 * is omitted. Teams are returned ordered by section then table number.
 */
export async function findTeams(db: Db): Promise<AssignedTeam[]> {
  const pairs = await findPairs(db);

  // Group the two pairs at each (section, table) home into NS/EW slots.
  type Slot = { ns?: Pair; ew?: Pair };
  const byTable = new Map<string, Slot>();

  for (const pair of pairs) {
    const { section, tableNumber, direction } = parseSeat(pair.initialSeat);
    const key = `${section}|${tableNumber}`;
    const slot = byTable.get(key) ?? {};
    if (direction === "NS") slot.ns = pair;
    else slot.ew = pair;
    byTable.set(key, slot);
  }

  const teams: AssignedTeam[] = [];
  for (const slot of byTable.values()) {
    // A complete team needs both a home (NS) pair and an away (EW) pair.
    if (!slot.ns || !slot.ew) continue;
    teams.push({
      type: "TEAM",
      // The home NS pair's seat is the stable team id (its home never moves).
      id: slot.ns.initialSeat,
      pair1: slot.ns,
      pair2: slot.ew,
    });
  }

  // Stable ordering: by section letter, then table number. Team ids are pair
  // seats (the home NS seat), so they parse as seats.
  teams.sort((a, b) => {
    const pa = parseSeat(a.id as Seat);
    const pb = parseSeat(b.id as Seat);
    if (pa.section !== pb.section) return pa.section < pb.section ? -1 : 1;
    return pa.tableNumber - pb.tableNumber;
  });

  return teams;
}
