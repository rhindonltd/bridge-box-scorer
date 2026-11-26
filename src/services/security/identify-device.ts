import { getDb } from "@/db/games";
import { findPairs } from "@/db/games/queries/find-pairs";
import { findSections } from "@/db/games/queries/find-sections";
import { isGameStarted } from "@/db/games/queries/is-game-started";
import { findGameById } from "@/db/game-index/queries/find-game-by-id";
import { parseSeat } from "@/model/participants";
import { validatePlayerToken } from "@/services/security/player-token";

/** A seat a device says it holds: the seat's own secret proves it. */
export interface HeldSeat {
  gameId: string;
  seat: string;
  token: string;
}

/** Who a device is seated as, at a game that is being played. */
export interface SeatedAs {
  eventName: string;
  /** e.g. "Table 3 NS", or "Section B, Table 3 NS" in a multi-section game. */
  seatLabel: string;
  /** e.g. "Mary Smith & John Jones". */
  players: string;
}

/** How many seats a device may report (it holds at most a few). */
const MAX_SEATS = 10;

/**
 * Work out who a device is from the seats it holds, for the director alerts.
 * Only seats whose token matches the seat's secret count (so a device can't
 * name somebody else), and only at games that have started and aren't
 * finalised (an old game's seat says nothing about who is in the room now).
 * Anything that can't be resolved is skipped rather than failing the sign-in.
 */
export async function identifyDevice(seats: HeldSeat[]): Promise<SeatedAs[]> {
  const found: SeatedAs[] = [];
  for (const held of seats.slice(0, MAX_SEATS)) {
    const seated = await resolveSeat(held).catch(() => null);
    if (seated) found.push(seated);
  }
  return found;
}

async function resolveSeat(held: HeldSeat): Promise<SeatedAs | null> {
  if (!(await validatePlayerToken(held.gameId, held.seat, held.token))) {
    return null;
  }
  const game = await findGameById(held.gameId);
  if (!game || game.finalisedAt || !(await isGameStarted(held.gameId))) {
    return null;
  }
  const db = await getDb(held.gameId);
  /* v8 ignore next -- a started game always has its database */
  if (!db) return null;

  const pair = (await findPairs(db)).find((p) => p.initialSeat === held.seat);
  if (!pair) return null;

  const { section, tableNumber, direction } = parseSeat(held.seat);
  const sections = await findSections(db);
  const table = `Table ${tableNumber} ${direction}`;
  const seatLabel =
    sections.length > 1
      ? `Section ${sections.find((s) => s.section === section)?.label ?? section}, ${table}`
      : table;

  const name = (p: { firstName: string; lastName: string }) =>
    `${p.firstName} ${p.lastName}`.trim();
  return {
    eventName: game.eventName,
    seatLabel,
    players: `${name(pair.player1)} & ${name(pair.player2)}`,
  };
}
