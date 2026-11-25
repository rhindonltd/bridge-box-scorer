import { Db } from "@/db/games";
import { readSeatOccupancies } from "@/db/games/queries/seat-occupancy";
import { participantStandings } from "@/modules/rulings";
import type { ParticipantStandingRow } from "@/model/standings";

/** Read every occupancy's lifecycle standing (seat + treatment + fine). */
export async function readParticipantStandings(
  db: Db,
): Promise<ParticipantStandingRow[]> {
  return participantStandings(await readSeatOccupancies(db));
}
