"use client";

import { useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { useRequiredGame } from "@/context/GameContext";
import {
  TravellerProvider,
  useTravellerContext,
} from "@/context/TravellerContext";
import { ContractWizard } from "@/app/game/[gameId]/play/[initialSeat]/ContractWizard";
import { buildPlayedContractCode } from "@/lib/buildPlayedContractCode";
import { parseContract } from "@/model/contract";
import { WaitingForConfirmation } from "@/app/game/[gameId]/play/[initialSeat]/WaitingForConfirmation";
import { ResultMismatch } from "@/app/game/[gameId]/play/[initialSeat]/ResultMismatch";
import { RoundInfoPage } from "@/app/game/[gameId]/play/[initialSeat]/RoundInfoPage";
import { GameComplete } from "@/app/game/[gameId]/play/[initialSeat]/GameComplete";
import { BoardResultsPage } from "@/app/game/[gameId]/play/[initialSeat]/BoardResultsPage";
import { scoreBoard, ScoredBoard } from "@/scoring/traveller/score-traveller";
import { ScoringType } from "@/db/games/types/scoring-type";
import { Traveller } from "@/model/traveller";
import { Player } from "@/db/games/tables/players";
import { SitOutPage } from "@/app/game/[gameId]/play/[initialSeat]/SitOutPage";
import { usePlayFlow } from "@/hooks/play-flow";
import { MoveInfoPage } from "@/app/game/[gameId]/play/[initialSeat]/MoveInfoPage";

export default function PlayPage() {
  const params = useParams<{ initialSeat: string }>();
  const seat = params.initialSeat;

  const { game } = useRequiredGame();
  const {
    schedule,
    playState,
    handleSitOutContinue,
    handleMoveInfoContinue,
    handleBoardResultsNext,
    handleReenter,
    handleEnterRound,
    submitResult,
  } = usePlayFlow(game.gameId, seat);

  if (!schedule) {
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
            tableNumber={round.tableNumber}
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
          leadCardRequired={game.leadCardRequired}
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
          gameId={game.gameId}
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
  scoringType,
  boardNumber,
  playedBoards,
  lastBoardOfRound,
  onNext,
}: {
  gameId: string;
  scoringType: ScoringType;
  boardNumber: number;
  playedBoards: number[];
  lastBoardOfRound: boolean;
  onNext: () => void;
}) {
  const [viewingBoard, setViewingBoard] = useState(boardNumber);

  // The traveller for the board being viewed comes live from the traveller
  // context; switching boards re-keys the provider so it requests/joins the
  // new board's room.
  return (
    <TravellerProvider boardNumber={viewingBoard}>
      <BoardResultsContent
        gameId={gameId}
        scoringType={scoringType}
        viewingBoard={viewingBoard}
        playedBoards={playedBoards}
        lastBoardOfRound={lastBoardOfRound}
        onBoardSelected={setViewingBoard}
        onNext={onNext}
      />
    </TravellerProvider>
  );
}

function BoardResultsContent({
  gameId,
  scoringType,
  viewingBoard,
  playedBoards,
  lastBoardOfRound,
  onBoardSelected,
  onNext,
}: {
  gameId: string;
  scoringType: ScoringType;
  viewingBoard: number;
  playedBoards: number[];
  lastBoardOfRound: boolean;
  onBoardSelected: (board: number) => void;
  onNext: () => void;
}) {
  const { instances } = useTravellerContext();

  const scoredBoard = useMemo<ScoredBoard | null>(() => {
    const mode = "PAIR";

    const lines = instances
      .filter((i) => i.currentResult != null)
      .map((i) => ({
        nsId: i.participants.ns,
        ewId: i.participants.ew,
        outcome: i.currentResult,
      }));

    if (lines.length === 0) return null;

    const traveller: Traveller = {
      type: mode,
      mode,
      board: viewingBoard,
      section: gameId,
      lines: lines as Traveller["lines"],
    };

    return scoreBoard(traveller, scoringType);
  }, [instances, gameId, scoringType, viewingBoard]);

  if (!scoredBoard) {
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
      scoredBoard={scoredBoard}
      onBoardSelected={onBoardSelected}
      onNext={onNext}
    />
  );
}
