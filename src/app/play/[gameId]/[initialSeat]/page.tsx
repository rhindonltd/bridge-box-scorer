"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useGame } from "@/context/GameContext";
import { ContractWizard } from "@/app/play/[gameId]/[initialSeat]/ContractWizard";
import { buildPlayedContractCode } from "@/lib/buildPlayedContractCode";
import { parseContract } from "@/model/contract";
import { WaitingForConfirmation } from "@/app/play/[gameId]/[initialSeat]/WaitingForConfirmation";
import { ResultMismatch } from "@/app/play/[gameId]/[initialSeat]/ResultMismatch";
import { RoundInfoPage } from "@/app/play/[gameId]/[initialSeat]/RoundInfoPage";
import { GameComplete } from "@/app/play/[gameId]/[initialSeat]/GameComplete";
import { BoardResultsPage } from "@/app/play/[gameId]/[initialSeat]/BoardResultsPage";
import { score, ScoredTraveller } from "@/scoring/traveller/score-traveller";
import { Traveller } from "@/model/traveller";
import { Player } from "@/db/games/tables/players";
import { SitOutPage } from "@/app/play/[gameId]/[initialSeat]/SitOutPage";
import { usePlayFlow } from "@/hooks/play-flow";
import { BoardInstance } from "@/app/manage/[gameId]/correct-result/Traveller";
import { MoveInfoPage } from "@/app/play/[gameId]/[initialSeat]/MoveInfoPage";

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
      const roundSchedule = schedule.rounds[playState.nextRoundIndex];

      return (
        <MoveInfoPage
          roundNumber={roundSchedule.roundNumber}
          tableNumber={roundSchedule.tableNumber!}
          sitOut={roundSchedule.sitOut ?? false}
          onMoveInfoContinue={handleMoveInfoContinue}
        />
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
