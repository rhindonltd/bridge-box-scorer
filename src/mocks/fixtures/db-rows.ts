/**
 * Row-shaped fixtures for the per-game `games` database tables. These mirror
 * the Drizzle insert shapes for `players`, `participants`, `boards`, and
 * `board_submissions` so integration tests can seed realistic rows without
 * repeating boilerplate.
 *
 * Factories return fresh objects (with sensible defaults + overrides) so tests
 * never share mutable state.
 */
import type { NewBoard } from "@/db/games/tables/boards";
import type { NewBoardSubmission } from "@/db/games/tables/submissions";

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
