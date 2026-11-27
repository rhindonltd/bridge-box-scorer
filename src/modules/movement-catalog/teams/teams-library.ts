import type { Table } from "@/model/movement";
import type { StoredMovementTable } from "@/modules/movement-catalog/plan/describe-movement";

/**
 * The stored teams movement library (TSMovements.txt). Each row of a movement
 * is a table: its home team sits North/South there all session, and each round
 * names the visiting team (its away pair sits East/West) and the board set. A
 * match between teams A and B is two rooms on the same board set: A at home to
 * B, and B at home to A. The two rooms need not be in the same round.
 */

/**
 * Put a teams movement's rows into team order, so table T is team T's home
 * table. Some movements in the file list their rows in another order (the
 * first number on each row is still that row's home team). Left as read when
 * a row's home team changes between rounds or the home teams are not 1..n;
 * {@link isSupportedTeamsMovement} then rejects the movement.
 */
export function normaliseTeamsTables(tables: Table[]): Table[] {
  const homes = tables.map((table) => {
    const ids = new Set(table.rounds.map((r) => r.participants.nsId));
    return ids.size === 1 ? Number([...ids][0]) : NaN;
  });
  const sorted = [...homes].sort((a, b) => a - b);
  if (!sorted.every((home, i) => home === i + 1)) return tables;
  return tables
    .map((table, i) => ({ ...table, table: homes[i] }))
    .sort((a, b) => a.table - b.table);
}

/**
 * Whether the app can run a stored teams movement. It must be a plain teams
 * movement:
 *  - the tables are 1..n and table T's home team is always team T;
 *  - a team never plays itself (no pivot or "team missing" rows);
 *  - every room has its other room: A at home to B on a board set means B at
 *    home to A on the same set;
 *  - two teams meet at most once;
 *  - a team plays each board set at most once, so the set can number its
 *    matches (see `teamsLayoutToMaterializable`).
 */
export function isSupportedTeamsMovement(
  tables: StoredMovementTable[],
): boolean {
  const teams = tables.length;
  if (teams < 2) return false;
  if (!tables.every((table, i) => table.tableNumber === i + 1)) return false;

  const rooms = new Set<string>();
  const meetings = new Map<string, number>();
  const setsByTeam = new Map<number, Set<number>>();
  const roomKey = (home: number, visitor: number, set: number) =>
    `${home}|${visitor}|${set}`;

  for (const table of tables) {
    const home = table.tableNumber;
    for (const round of table.rounds) {
      const visitor = Number(round.ew);
      if (round.ns !== `${home}`) return false;
      if (!Number.isInteger(visitor) || visitor < 1 || visitor > teams) {
        return false;
      }
      if (visitor === home) return false;
      const key = roomKey(home, visitor, round.boardSet);
      if (rooms.has(key)) return false;
      rooms.add(key);
      const pair = `${Math.min(home, visitor)}-${Math.max(home, visitor)}`;
      meetings.set(pair, (meetings.get(pair) ?? 0) + 1);
    }
  }

  for (const key of rooms) {
    const [home, visitor, set] = key.split("|").map(Number);
    if (!rooms.has(roomKey(visitor, home, set))) return false;
    // A team's match on this set: no other match of the team may use it.
    const sets = setsByTeam.get(home) ?? new Set<number>();
    setsByTeam.set(home, sets);
    if (sets.has(set)) return false;
    sets.add(set);
  }

  return [...meetings.values()].every((rooms) => rooms === 2);
}

/**
 * Whether a stored teams movement is an American Whist (East/West pairs down
 * two, boards down one each round, over all teams − 1 rounds), whatever its
 * starting position. The app generates American Whist itself
 * (`generateAmericanWhistTeams`), so the library's copies are not listed.
 */
export function isAmericanWhistTeamsLayout(
  tables: StoredMovementTable[],
): boolean {
  const n = tables.length;
  if (n < 3 || n % 2 === 0) return false;
  const mod = (x: number) => ((x % n) + n) % n;
  const visitorOffset = new Set<number>();
  const setOffset = new Set<number>();
  for (const table of tables) {
    if (table.rounds.length !== n - 1) return false;
    for (const round of table.rounds) {
      const k = round.roundNumber;
      visitorOffset.add(mod(Number(round.ew) - table.tableNumber - 2 * k));
      setOffset.add(mod(round.boardSet - table.tableNumber - k));
    }
  }
  return visitorOffset.size === 1 && setOffset.size === 1;
}
