import type { Db } from "@/db/games";
import { findPairs } from "@/db/games/queries/find-pairs";
import { findSections } from "@/db/games/queries/find-sections";
import { parseSeat, type PairSeat } from "@/model/participants";
import { resolvePlayState } from "@/services/resolve-play-state";
import type { CallingTable } from "@/model/director-alert";

/**
 * Where the pair at `seat` is sitting now, and who they are, for a "Call
 * Director" popup.
 *
 * A pair's table changes from round to round in most movements, so the table
 * comes from the pair's current round. Before the game starts it is the table
 * the pair sat down at; once the pair has no round (sitting out, or the event
 * is over) the table is null.
 */
export async function locateCaller(
  db: Db,
  gameId: string,
  seat: string,
): Promise<{ table: CallingTable; players: string }> {
  const { section, tableNumber, direction } = parseSeat(seat as PairSeat);
  const sections = await findSections(db);
  const sectionName =
    sections.length > 1
      ? (sections.find((s) => s.section === section)?.label ?? section)
      : null;

  const table: CallingTable = await (async () => {
    const state = await resolvePlayState(db, gameId, seat);
    if (!state) {
      return {
        section: sectionName,
        tableNumber,
        roundNumber: null,
        side: direction,
      };
    }
    const phase = state.phase;
    const round = "roundIndex" in phase ? state.rounds[phase.roundIndex] : null;
    return {
      section: sectionName,
      tableNumber: round && !round.sitOut ? round.tableNumber : null,
      roundNumber: round?.roundNumber ?? null,
      side: round && !round.sitOut ? (round.side ?? null) : null,
    };
  })();

  const pair = (await findPairs(db)).find((p) => p.initialSeat === seat);
  const name = (p: { firstName: string; lastName: string }) =>
    `${p.firstName} ${p.lastName}`.trim();
  const players = pair
    ? `${name(pair.player1)} & ${name(pair.player2)}`
    : "A pair";

  return { table, players };
}
