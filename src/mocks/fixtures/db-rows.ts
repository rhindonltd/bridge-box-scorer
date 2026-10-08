/**
 * Row-shaped fixtures for the per-game `games` database tables. These mirror
 * the Drizzle insert shapes for `players`, `participants`, `boards`, and
 * `board_submissions` so integration tests can seed realistic rows without
 * repeating boilerplate.
 *
 * Factories return fresh objects (with sensible defaults + overrides) so tests
 * never share mutable state.
 */
import { matches, type NewMatch } from "@/db/games/tables/matches";
import type { NewBoard } from "@/db/games/tables/boards";
import type { NewBoardSubmission } from "@/db/games/tables/submissions";

/**
 * The `boards.matchId` used by fixtures that seed board rows directly (bypassing
 * the materialiser, which is what assigns real match ids). Pair it with
 * {@link seedFixtureMatch} once per db: the FK on `boards.match_id` is enforced,
 * so a board row needs a backing `matches` row with this id to exist. Tests that
 * actually assert on match STRUCTURE seed their own meaningful `matches` rows
 * instead.
 */
export const FIXTURE_MATCH_ID = 1;

type FixtureMatchDb = {
  insert: (table: typeof matches) => {
    values: (row: NewMatch) => { run: () => unknown };
  };
};

/**
 * Insert a single placeholder `matches` row (id {@link FIXTURE_MATCH_ID}) so
 * directly-seeded board fixtures satisfy the `boards.match_id` foreign key. Call
 * once, after the db is migrated and before inserting boards, in any int test
 * that seeds board rows by hand and does not care about match structure. The
 * placeholder is an ordinary field-scored PAIRS match, so the teams scorers
 * (which read TEAMS/TRIPLE/BYE match rows) ignore it — use
 * {@link seedFixtureTeamsMatch} for a teams scenario instead.
 */
export function seedFixtureMatch(db: FixtureMatchDb): void {
  db.insert(matches)
    .values({
      id: FIXTURE_MATCH_ID,
      section: "A",
      roundNumber: 1,
      kind: "PAIRS",
      scoredAsUnit: false,
      home: "A1NS",
      opponent: "A1EW",
      boardStart: 1,
      boardEnd: 1,
    })
    .run();
}

/**
 * Insert a single placeholder TEAMS `matches` row (id {@link FIXTURE_MATCH_ID})
 * for the common one-encounter teams fixture: team 1 (A1NS) vs team 2 (A2NS)
 * over board 1. The teams scorers read this as the round-1 head-to-head, so a
 * fixture that seeds the two rooms' board rows (pointed at
 * {@link FIXTURE_MATCH_ID}) scores as a real teams match.
 */
export function seedFixtureTeamsMatch(db: FixtureMatchDb): void {
  db.insert(matches)
    .values({
      id: FIXTURE_MATCH_ID,
      section: "A",
      roundNumber: 1,
      kind: "TEAMS",
      scoredAsUnit: true,
      home: "A1NS",
      opponent: "A2NS",
      vpPool: 20,
      boardStart: 1,
      boardEnd: 1,
    })
    .run();
}

export interface NewPlayerRow {
  firstName: string;
  lastName: string;
}

export function makePlayer(overrides: Partial<NewPlayerRow> = {}): NewPlayerRow {
  return { firstName: "Alice", lastName: "Adams", ...overrides };
}

export interface NewParticipantRow {
  initialSeat: string;
  player1: number;
  player2: number;
  secretKey: string;
}

export function makeParticipant(
  overrides: Partial<NewParticipantRow> = {},
): NewParticipantRow {
  return {
    initialSeat: "A1NS",
    player1: 1,
    player2: 2,
    secretKey: "secret",
    ...overrides,
  };
}

/**
 * Stamp the placeholder {@link FIXTURE_MATCH_ID} onto a board row that omits it,
 * for tests that build board literals directly and don't exercise match
 * structure. Keeps the `matchId: ...` noise out of every literal while still
 * satisfying the NOT NULL column.
 */
export function withFixtureMatchId<T extends Omit<NewBoard, "matchId">>(
  row: T,
): T & { matchId: number } {
  return { matchId: FIXTURE_MATCH_ID, ...row };
}

export function makeBoard(overrides: Partial<NewBoard> = {}): NewBoard {
  return {
    section: "A",
    roundNumber: 1,
    tableNumber: 1,
    boardNumber: 1,
    copy: "A",
    ns: "A1NS",
    ew: "A1EW",
    status: "NOT_PLAYED",
    matchId: FIXTURE_MATCH_ID,
    ...overrides,
  };
}

export function makeSubmission(
  overrides: Partial<NewBoardSubmission> = {},
): NewBoardSubmission {
  return {
    section: "A",
    roundNumber: 1,
    tableNumber: 1,
    boardNumber: 1,
    side: "NS",
    result: "3NTN=" as NewBoardSubmission["result"],
    ...overrides,
  };
}
