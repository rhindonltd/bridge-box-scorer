import { Traveller } from "@/components/traveller/Traveller";
import { ScoredBoard } from "@/scoring/traveller/score-traveller";
import { GamePageLayout } from "@/components/layout/GamePageLayout";
import { BoardSelector } from "@/app/game/[gameId]/play/[initialSeat]/BoardSelector";
import { useAssignment } from "@/context/AssignmentContext";
import { ShowHandToggle } from "@/components/deal/ShowHandToggle";
import { PluginViewSwitcher } from "@/components/scoring/PluginViewSwitcher";
import { ScoreTableView } from "@/components/scoring/ScoreTableView";
import { ScoreTable } from "@/scoring/table/score-table";
import { Deal } from "@/model/common";

interface Props {
  board: number;
  playedBoards: number[];
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
   * entered. Surfaced behind an opt-in "Show hand" toggle so a player can see
   * the deal after playing the board without cluttering the results table.
   */
  deal?: Deal | null;
  onBoardSelected: (board: number) => void;
  onNext: () => void;
  /** Right-hand header content (the play header menu). */
  headerRight?: React.ReactNode;
}

export function BoardResultsPage({
  board,
  playedBoards,
  lastBoardOfRound,
  scoredBoard,
  teamResultTable = null,
  deal = null,
  onBoardSelected,
  onNext,
  headerRight,
}: Props) {
  const { assignment } = useAssignment();

  const traveller = (
    <Traveller scoredBoard={scoredBoard} highlightAssignmentId={assignment?.id} />
  );

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
      <>
        <BoardSelector
          board={board}
          playedBoards={playedBoards}
          onBoardSelected={onBoardSelected}
        />
        <ShowHandToggle boardNumber={board} deal={deal} />
        {teamResultTable ? (
          // Teams game: let the player toggle between the field-wide cross-IMP
          // traveller and their own team's result (this table vs the other
          // room). Cross-IMP is first, so it is the default and the "on" side.
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
        )}
      </>
    </GamePageLayout>
  );
}
