"use client";

import { GamePageLayout } from "@/components/layout/GamePageLayout";
import { CaptionedSpinner } from "@/components/common/Spinner";
import { ScoreTableView } from "@/components/scoring/ScoreTableView";
import { buildTeamBoardResultTable } from "@/scoring/swiss/team-board-result-view";
import { ScoreTable } from "@/scoring/table/score-table";
import { useRoundResults } from "./useRoundResults";

/** One board's Team Result table, or null when it cannot be built yet. */
export interface RoundBoardResult {
  boardNumber: number;
  table: ScoreTable | null;
}

/**
 * End-of-round summary for a teams game (presentational): the round's boards,
 * each showing how the viewing player's team did (their table vs the other
 * room, in IMPs). A Continue button advances the flow. `results === null` shows
 * a loading spinner. Read-only — the round is already complete.
 */
export function RoundResultsPage({
  results,
  onContinue,
  headerRight,
}: {
  results: RoundBoardResult[] | null;
  onContinue: () => void;
  /** Right-hand header content (the play header menu). */
  headerRight?: React.ReactNode;
}) {
  return (
    <GamePageLayout
      headerTitle="Team Results"
      headerRight={headerRight}
      hideBack
      actions={
        <button
          onClick={onContinue}
          data-testid="round-results-continue"
          className="w-full py-3.5 text-lg font-bold bg-blue-600 text-white rounded-xl hover:bg-blue-700 active:scale-[0.98] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
        >
          Continue
        </button>
      }
    >
      {results === null ? (
        <CaptionedSpinner caption="Loading team results..." />
      ) : (
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {results.map(({ boardNumber, table }) => (
            <div key={boardNumber}>
              <div className="mb-1 font-semibold text-gray-800">
                Board {boardNumber}
              </div>
              {table ? (
                <ScoreTableView table={table} />
              ) : (
                <div className="text-sm text-gray-500">
                  No comparable result on this board.
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </GamePageLayout>
  );
}

/**
 * Subscribes to the round's board instances live (see {@link useRoundResults})
 * and builds each board's Team Result table from the viewing seat, then renders
 * {@link RoundResultsPage}. As a late result lands in the other room, the
 * affected board's row updates in place. Keeping the data wiring here leaves the
 * page presentational (and Storybook/test-friendly).
 */
export function RoundResultsLoader({
  gameId,
  seat,
  boards,
  onContinue,
  headerRight,
}: {
  gameId: string;
  seat: string;
  /** The board numbers of the round just finished, in play order. */
  boards: number[];
  onContinue: () => void;
  headerRight?: React.ReactNode;
}) {
  const byBoard = useRoundResults(gameId, boards);

  const results: RoundBoardResult[] | null =
    byBoard === null
      ? null
      : boards.map((boardNumber) => ({
          boardNumber,
          table: buildTeamBoardResultTable(
            (byBoard.get(boardNumber) ?? []).map((i) => ({
              tableNumber: i.tableNumber,
              ns: i.participants.ns,
              ew: i.participants.ew,
              result: i.currentResult as never,
              status: i.status,
            })),
            boardNumber,
            seat,
          ),
        }));

  return (
    <RoundResultsPage
      results={results}
      onContinue={onContinue}
      headerRight={headerRight}
    />
  );
}
