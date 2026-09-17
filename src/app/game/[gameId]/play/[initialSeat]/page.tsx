"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useRequiredGame } from "@/context/GameContext";
import { TravellerProvider, useTravellerContext } from "@/context/TravellerContext";
import { ContractWizard } from "@/app/game/[gameId]/play/[initialSeat]/ContractWizard";
import { buildPlayedContractCode } from "@/lib/buildPlayedContractCode";
import { parseContract } from "@/model/contract";
import { WaitingForConfirmation } from "@/app/game/[gameId]/play/[initialSeat]/WaitingForConfirmation";
import { ResultMismatch } from "@/app/game/[gameId]/play/[initialSeat]/ResultMismatch";
import { RoundInfoPage } from "@/app/game/[gameId]/play/[initialSeat]/RoundInfoPage";
import { GameComplete } from "@/app/game/[gameId]/play/[initialSeat]/GameComplete";
import { BoardResultsPage } from "@/app/game/[gameId]/play/[initialSeat]/BoardResultsPage";
import { EnterDealsPage } from "@/app/game/[gameId]/play/[initialSeat]/EnterDealsPage";
import { ScoringType } from "@/db/games/types/scoring-type";
import { Player } from "@/db/games/tables/players";
import { SitOutPage } from "@/app/game/[gameId]/play/[initialSeat]/SitOutPage";
import { usePlayFlow } from "@/hooks/play-flow";
import type { PlayState, Schedule } from "@/hooks/play-state-machine";
import { MoveInfoPage } from "@/app/game/[gameId]/play/[initialSeat]/MoveInfoPage";
import { WaitingToStartPage } from "@/app/game/[gameId]/play/[initialSeat]/WaitingToStartPage";
import { PlayHeaderMenu } from "@/app/game/[gameId]/play/[initialSeat]/PlayHeaderMenu";
import { Seat } from "@/model/participants";
import { FullScreenSpinner } from "@/components/common/Spinner";
import { useScoredBoard } from "./useScoredBoard";

export default function PlayPage() {
  const params = useParams<{ initialSeat: string }>();
  const seat = params.initialSeat;

  const { game } = useRequiredGame();
  const flow = usePlayFlow(game.gameId, seat);

  // Seated, but the director hasn't started the game yet: show a friendly
  // waiting screen (it revalidates and advances automatically at start) rather
  // than an indefinite spinner.
  if (flow.waitingToStart) {
    return <WaitingToStartPage gameId={game.gameId} seat={seat as Seat} />;
  }

  if (!flow.schedule) {
    return <FullScreenSpinner />;
  }

  return (
    <PlayStateRouter
      schedule={flow.schedule}
      playState={flow.playState}
      gameId={game.gameId}
      seat={seat}
      scoringType={game.scoringType}
      leadCardRequired={game.leadCardRequired}
      handlers={flow}
    />
  );
}

/** The handler callbacks the play screens fire, as returned by usePlayFlow. */
type PlayHandlers = Pick<
  ReturnType<typeof usePlayFlow>,
  | "handleSitOutContinue"
  | "handleMoveInfoContinue"
  | "handleBoardResultsNext"
  | "handleDealsContinue"
  | "handleReenter"
  | "handleEnterRound"
  | "submitResult"
  | "submitDeal"
>;

/**
 * Maps the current {@link PlayState} to its screen. Every live play screen
 * shares a header whose right-hand slot holds the play menu (Change device,
 * Pair details, …). A player can hand their seat to another device at any time
 * via that menu; leaving the table is setup-only, so it is NOT offered here.
 */
function PlayStateRouter({
  schedule,
  playState,
  gameId,
  seat,
  scoringType,
  leadCardRequired,
  handlers,
}: {
  schedule: Schedule;
  playState: PlayState;
  gameId: string;
  seat: string;
  scoringType: ScoringType;
  leadCardRequired: boolean;
  handlers: PlayHandlers;
}) {
  const headerRight = <PlayHeaderMenu gameId={gameId} seat={seat} />;

  switch (playState.state) {
    case "loading":
      return <FullScreenSpinner />;

    case "roundInfo": {
      const round = schedule.rounds[playState.roundIndex];

      // If this round is a sit-out, show the sit-out screen instead.
      if (round.sitOut) {
        return (
          <SitOutPage
            round={round.roundNumber}
            tableNumber={round.tableNumber}
            onHandleSitOutContinue={handlers.handleSitOutContinue}
            headerRight={headerRight}
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
          onEnterRound={handlers.handleEnterRound}
          headerRight={headerRight}
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
          leadCardRequired={leadCardRequired}
          headerRight={headerRight}
          onComplete={(data) => {
            if (data.contract === "PO" || data.contract === "NP") {
              handlers.submitResult(data.board, data.contract);
            } else {
              const parsed = parseContract(data.contract);
              const fullResult = buildPlayedContractCode(
                parsed.level,
                parsed.suit,
                parsed.doubling,
                parsed.declarer,
                data.result,
              );
              handlers.submitResult(data.board, fullResult);
            }
          }}
        />
      );
    }

    case "waiting": {
      const round = schedule.rounds[playState.roundIndex];
      const boardNumber = round.boards[playState.boardIndex];
      return (
        <WaitingForConfirmation
          boardNumber={boardNumber}
          headerRight={headerRight}
        />
      );
    }

    case "mismatch":
      return (
        <ResultMismatch
          nsBoardNumber={playState.nsBoardNumber}
          nsResult={playState.nsResult}
          ewBoardNumber={playState.ewBoardNumber}
          ewResult={playState.ewResult}
          onReenter={handlers.handleReenter}
          headerRight={headerRight}
        />
      );

    case "boardResults": {
      const round = schedule.rounds[playState.roundIndex];
      const boardNumber = round.boards[playState.boardIndex];
      const lastBoardOfRound =
        playState.boardIndex === round.boards.length - 1;

      // All boards played so far in this round (up to and including current).
      const playedBoards = round.boards.slice(0, playState.boardIndex + 1);

      return (
        <BoardResultsLoader
          gameId={gameId}
          scoringType={scoringType}
          boardNumber={boardNumber}
          playedBoards={playedBoards}
          lastBoardOfRound={lastBoardOfRound}
          onNext={handlers.handleBoardResultsNext}
          headerRight={headerRight}
        />
      );
    }

    case "enterDeals": {
      const round = schedule.rounds[playState.roundIndex];
      return (
        <EnterDealsPage
          boards={round.boards}
          onSubmitDeal={handlers.submitDeal}
          onDone={handlers.handleDealsContinue}
          headerRight={headerRight}
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
          onMoveInfoContinue={handlers.handleMoveInfoContinue}
          headerRight={headerRight}
        />
      );
    }

    case "gameComplete":
      return <GameComplete headerRight={headerRight} />;
  }
}

function BoardResultsLoader({
  gameId,
  scoringType,
  boardNumber,
  playedBoards,
  lastBoardOfRound,
  onNext,
  headerRight,
}: {
  gameId: string;
  scoringType: ScoringType;
  boardNumber: number;
  playedBoards: number[];
  lastBoardOfRound: boolean;
  onNext: () => void;
  headerRight?: React.ReactNode;
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
        headerRight={headerRight}
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
  headerRight,
}: {
  gameId: string;
  scoringType: ScoringType;
  viewingBoard: number;
  playedBoards: number[];
  lastBoardOfRound: boolean;
  onBoardSelected: (board: number) => void;
  onNext: () => void;
  headerRight?: React.ReactNode;
}) {
  const scoredBoard = useScoredBoard(gameId, viewingBoard, scoringType);
  // The deal for the board being viewed rides the same traveller context, so
  // it appears (and updates live) once anyone has entered it.
  const { deal } = useTravellerContext();

  if (!scoredBoard) {
    return <FullScreenSpinner />;
  }

  return (
    <BoardResultsPage
      board={viewingBoard}
      playedBoards={playedBoards}
      lastBoardOfRound={lastBoardOfRound}
      scoredBoard={scoredBoard}
      deal={deal}
      onBoardSelected={onBoardSelected}
      onNext={onNext}
      headerRight={headerRight}
    />
  );
}
