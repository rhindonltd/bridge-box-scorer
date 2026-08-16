"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useGame } from "@/context/GameContext";
import { ContractWizard } from "@/components/play/contract-wizard/ContractWizard";
import { buildPlayedContractCode } from "@/lib/buildPlayedContractCode";
import { parseContract } from "@/model/contract";
import { WaitingForConfirmation } from "@/components/pages/play/WaitingForConfirmation";
import { ResultMismatch } from "@/components/pages/play/ResultMismatch";
import { RoundInfoPage } from "@/components/pages/play/RoundInfoPage";
import { GameComplete } from "@/components/pages/play/GameComplete";
import { BoardResultsPage } from "@/components/pages/play/BoardResultsPage";
import { score, ScoredTraveller } from "@/scoring/traveller/score-traveller";
import { PlayHeader } from "@/components/play/PlayHeader";
import { Traveller } from "@/model/traveller";
import { Player } from "@/db/games/tables/players";
import { SitOutPage } from "@/components/pages/play/SitOutPage";
import { usePlayFlow } from "@/hooks/play-flow";
import { BoardInstance } from "@/components/pages/manage/correct-result/Traveller";

export default function PlayPage() {
  const params = useParams<{ gameId: string; initialSeat: string }>();
  const gameId = params.gameId;
  const seat = params.initialSeat;

  const { game } = useGame();
  const {
    schedule,
    playState,
    handleSitOutContinue,
    handleMoveInfoContinue,
    handleBoardResultsNext,
    handleReenter,
    handleEnterRound,
    submitResult,
  } = usePlayFlow(gameId, seat);

  if (!game || !schedule) {
    return (
      <div className="h-dvh flex items-center justify-center bg-gray-100">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  switch (playState.state) {
    case "loading":
      return (
        <div className="h-dvh flex items-center justify-center bg-gray-100">
          <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
        </div>
      );

    case "roundInfo": {
      const round = schedule.rounds[playState.roundIndex];

      // If this round is a sit-out, show the sit-out screen instead
      if (round.sitOut) {
        return (
          <SitOutPage
            round={round.roundNumber}
            onHandleSitOutContinue={handleSitOutContinue}
          />
        );
      }

      return (
        <RoundInfoPage
          round={round.roundNumber}
          table={round.tableNumber!}
          boards={round.boards}
          players={
            round.players as { N: Player; S: Player; E: Player; W: Player }
          }
          onEnterRound={handleEnterRound}
        />
      );
    }

    case "enterContract": {
      const round = schedule.rounds[playState.roundIndex];
      const playedBoards = round.boardStatuses
        .filter((b) => b.status === "CONFIRMED")
        .map((b) => b.boardNumber);
      return (
        <ContractWizard
          round={round.roundNumber}
          table={round.tableNumber!}
          roundBoards={round.boards}
          playedBoards={playedBoards}
          leadCardRequired={game?.leadCardRequired ?? true}
          onComplete={(data) => {
            if (data.contract === "PO" || data.contract === "NP") {
              submitResult(data.contract);
            } else {
              const parsed = parseContract(data.contract);
              const fullResult = buildPlayedContractCode(
                parsed.level,
                parsed.suit,
                parsed.doubling,
                parsed.declarer,
                data.result,
              );
              submitResult(fullResult);
            }
          }}
        />
      );
    }

    case "waiting": {
      const round = schedule.rounds[playState.roundIndex];
      const boardNumber = round.boards[playState.boardIndex];
      return <WaitingForConfirmation boardNumber={boardNumber} />;
    }

    case "mismatch": {
      return (
        <ResultMismatch
          nsBoardNumber={playState.nsBoardNumber}
          nsResult={playState.nsResult}
          ewBoardNumber={playState.ewBoardNumber}
          ewResult={playState.ewResult}
          onReenter={handleReenter}
        />
      );
    }

    case "boardResults": {
      const round = schedule.rounds[playState.roundIndex];
      const boardNumber = round.boards[playState.boardIndex];
      const lastBoardOfRound = playState.boardIndex === round.boards.length - 1;

      // All boards played so far in this round (up to and including current)
      const playedBoards = round.boards.slice(0, playState.boardIndex + 1);

      return (
        <BoardResultsLoader
          gameId={gameId}
          gameType={game.gameType}
          scoringType={game.scoringType}
          boardNumber={boardNumber}
          playedBoards={playedBoards}
          lastBoardOfRound={lastBoardOfRound}
          onNext={handleBoardResultsNext}
        />
      );
    }

    case "moveInfo": {
      const nextRound = schedule.rounds[playState.nextRoundIndex];

      // If the next round is a sit-out, skip the "move to table" screen
      if (nextRound.sitOut) {
        return (
          <div className="h-dvh flex flex-col bg-gray-100">
            <PlayHeader detail="Round Complete" />

            <div className="flex-1 flex flex-col items-center justify-center p-6">
              <div className="text-xl font-semibold text-gray-900 mb-2">
                Next up
              </div>
              <div className="text-4xl font-bold text-blue-600 mb-4">
                Sit Out
              </div>
              <div className="text-base text-gray-500">
                Round {nextRound.roundNumber}
              </div>
            </div>

            <div className="p-4 shrink-0">
              <button
                onClick={handleMoveInfoContinue}
                className="w-full py-3.5 text-lg font-bold bg-blue-600 text-white rounded-xl hover:bg-blue-700 active:scale-[0.98] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              >
                Continue
              </button>
            </div>
          </div>
        );
      }

      return (
        <div className="h-dvh flex flex-col bg-gray-100">
          <PlayHeader detail="Round Complete" />

          <div className="flex-1 flex flex-col items-center justify-center p-6">
            <div className="text-xl font-semibold text-gray-900 mb-2">
              Move to
            </div>
            <div className="text-4xl font-bold text-blue-600 mb-4">
              Table {nextRound.tableNumber}
            </div>
            <div className="text-base text-gray-500">
              Round {nextRound.roundNumber}
            </div>
          </div>

          <div className="p-4 shrink-0">
            <button
              onClick={handleMoveInfoContinue}
              className="w-full py-3.5 text-lg font-bold bg-blue-600 text-white rounded-xl hover:bg-blue-700 active:scale-[0.98] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            >
              Continue
            </button>
          </div>
        </div>
      );
    }

    case "gameComplete":
      return <GameComplete />;
  }
}

function BoardResultsLoader({
  gameId,
  gameType,
  scoringType,
  boardNumber,
  playedBoards,
  lastBoardOfRound,
  onNext,
}: {
  gameId: string;
  gameType: string;
  scoringType: string;
  boardNumber: number;
  playedBoards: number[];
  lastBoardOfRound: boolean;
  onNext: () => void;
}) {
  const [viewingBoard, setViewingBoard] = useState(boardNumber);
  const [scoredTraveller, setScoredTraveller] =
    useState<ScoredTraveller | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- resetting before async fetch
    setScoredTraveller(null);
    let cancelled = false;
    fetch(`/api/games/${gameId}/boards/${viewingBoard}`)
      .then((r) => r.json())
      .then((data: { instances?: BoardInstance[] }) => {
        if (cancelled) return;
        if (data.instances) {
          const mode = "PAIR";
          const scoringMode =
            scoringType === "IMP" || scoringType === "XIMP" ? "XIMP" : "MP";

          const lines = data.instances
            .filter((i) => i.currentResult != null)
            .map((i) => {
              return {
                nsId: i.participants.ns,
                ewId: i.participants.ew,
                outcome: i.currentResult,
              };
            });

          if (lines.length > 0) {
            const traveller: Traveller = {
              type: mode,
              mode,
              board: viewingBoard,
              section: gameId,
              lines: lines as Traveller["lines"],
            };

            const scored = score(traveller, scoringMode);
            setScoredTraveller(scored);
          }
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [gameId, gameType, scoringType, viewingBoard]);

  if (!scoredTraveller) {
    return (
      <div className="h-dvh flex items-center justify-center bg-gray-100">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <BoardResultsPage
      board={viewingBoard}
      playedBoards={playedBoards}
      lastBoardOfRound={lastBoardOfRound}
      scoredTraveller={scoredTraveller}
      onBoardSelected={setViewingBoard}
      onNext={onNext}
    />
  );
}
