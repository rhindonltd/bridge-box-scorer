import type { BoardOutcome } from "@/model/score";
import type { BoardStatus } from "@/model/game-types";
import type { MatchRow, ResultRow } from "@/model/result-row";
import type { WithdrawalRecord } from "@/model/standings";

/**
 * An event's results after every pre-scoring ruling has been applied: the rows
 * and matches scoring reads, plus who is left out of the ranking and whose
 * unplayed boards are credited. Rulings produces it and scoring consumes it, so
 * it lives in the kernel. Generic over the row types so a caller's own row type
 * (a database row with extra columns) passes through unchanged.
 */
export interface RuledEvent<
  R extends ResultRow = ResultRow,
  M extends MatchRow = MatchRow,
> {
  rows: R[];
  matches: M[];
  excludedFromRanking: Set<string>;
  withdrawals: WithdrawalRecord[];
}

/** One table's result for one board, as the traveller shows it. */
export interface RuledInstance {
  roundNumber: number;
  tableNumber: number;
  boardNumber: number;
  ns: string;
  ew: string;
  currentResult: BoardOutcome | null;
  status: BoardStatus | null;
  seatsSwapped: boolean;
}
