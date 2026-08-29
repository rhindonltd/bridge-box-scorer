import { Traveller } from "@/components/traveller/Traveller";
import { ScoredTraveller } from "@/scoring/traveller/score-traveller";
import { GamePageLayout } from "@/components/layout/GamePageLayout";
import { BoardSelector } from "@/app/game/[gameId]/play/[initialSeat]/BoardSelector";

interface Props {
  board: number;
  playedBoards: number[];
  lastBoardOfRound: boolean;
  scoredTraveller: ScoredTraveller;
  onBoardSelected: (board: number) => void;
  onNext: () => void;
}

export function BoardResultsPage({
  board,
  playedBoards,
  lastBoardOfRound,
  scoredTraveller,
  onBoardSelected,
  onNext,
}: Props) {
  return (
    <GamePageLayout
      headerTitle="Board Results"
      children={
        <>
          <BoardSelector
            board={board}
            playedBoards={playedBoards}
            onBoardSelected={onBoardSelected}
          />
          <Traveller scoredTraveller={scoredTraveller} />
        </>
      }
      actions={
        <button
          onClick={onNext}
          className="w-full py-3 text-lg font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:scale-[0.98] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
        >
          {lastBoardOfRound ? "Next Round" : "Next Board"}
        </button>
      }
    />
  );
}
