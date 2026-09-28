import { Traveller } from "@/components/traveller/Traveller";
import { ScoredBoard } from "@/scoring/traveller/score-traveller";
import { GamePageLayout } from "@/components/layout/GamePageLayout";
import { useAssignment } from "@/context/AssignmentContext";
import { DealDisplay } from "@/components/deal/DealDisplay";
import { PluginViewSwitcher } from "@/components/scoring/PluginViewSwitcher";
import { ScoreTableView } from "@/components/scoring/ScoreTableView";
import { ScoreTable } from "@/scoring/table/score-table";
import { Deal } from "@/model/common";

interface Props {
  board: number;
  lastBoardOfRound: boolean;
  scoredBoard: ScoredBoard;
  /**
   * For a teams game, the "Team Result" table for this board (this table vs the
   * other room, in IMPs), or null when it cannot be built yet (the viewing
   * table has no result). When present, the results area gains an
   * "X-IMP / Team Result" toggle; when absent (a pairs game), only the pooled
   * traveller shows. `null` for every pairs game.
   */
  teamResultTable?: ScoreTable | null;
  /**
   * The four hands for the board being viewed, or null when no deal has been
   * entered. Rendered instead of the results when {@link showDeal} is set. The
   * Results / Deal choice itself lives in the play header menu (built by the
   * caller), so this component only renders the chosen view.
   */
  deal?: Deal | null;
  /** When true, show the deal (hand diagram) instead of the results. */
  showDeal?: boolean;
  onNext: () => void;
  /** Right-hand header content (the play header menu). */
  headerRight?: React.ReactNode;
}

export function BoardResultsPage({
  board,
  lastBoardOfRound,
  scoredBoard,
  teamResultTable = null,
  deal = null,
  showDeal = false,
  onNext,
  headerRight,
}: Props) {
  const { assignment } = useAssignment();

  const traveller = (
    <Traveller scoredBoard={scoredBoard} highlightAssignmentId={assignment?.id} />
  );

  // The results view: for a teams game, an X-IMP / Team Result toggle over the
  // field-wide cross-IMP traveller and this table's own result; for pairs, just
  // the pooled traveller.
  const results = teamResultTable ? (
    <PluginViewSwitcher
      views={[
        { id: "x-imp", label: "X-IMP" },
        { id: "team-result", label: "Team Result" },
      ]}
      renderView={(view) =>
        view.id === "team-result" ? (
          <ScoreTableView
            table={teamResultTable}
            highlightAssignmentId={assignment?.id}
          />
        ) : (
          traveller
        )
      }
    />
  ) : (
    traveller
  );

  // Only show the deal when asked and one exists; otherwise fall back to results.
  const showingDeal = showDeal && deal != null;

  return (
    <GamePageLayout
      headerTitle="Board Results"
      headerRight={headerRight}
      hideBack
      actions={
        <button
          onClick={onNext}
          data-testid="board-results-next"
          className="w-full py-3 text-lg font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:scale-[0.98] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
        >
          {lastBoardOfRound ? "Next Round" : "Next Board"}
        </button>
      }
    >
      {showingDeal ? (
        <DealDisplay boardNumber={board} deal={deal} />
      ) : (
        results
      )}
    </GamePageLayout>
  );
}
