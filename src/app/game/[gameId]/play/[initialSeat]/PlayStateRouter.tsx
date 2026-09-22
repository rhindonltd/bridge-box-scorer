"use client";

import { useState } from "react";
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
import { GameType } from "@/db/games/types/game-type";
import { buildTeamBoardResultTable } from "@/scoring/swiss/team-board-result-view";
import { Player } from "@/db/games/tables/players";
import { SitOutPage } from "@/app/game/[gameId]/play/[initialSeat]/SitOutPage";
import { usePlayFlow } from "@/hooks/play-flow";
import type { PlayState, Schedule } from "@/hooks/play-state-machine";
import { MoveInfoPage } from "@/app/game/[gameId]/play/[initialSeat]/MoveInfoPage";
import { RoundResultsLoader } from "@/app/game/[gameId]/play/[initialSeat]/RoundResultsPage";
import { PlayHeaderMenu } from "@/app/game/[gameId]/play/[initialSeat]/PlayHeaderMenu";
import { FullScreenSpinner } from "@/components/common/Spinner";
import { useScoredBoard } from "./useScoredBoard";

/** The handler callbacks the play screens fire, as returned by usePlayFlow. */
export type PlayHandlers = Pick<
  ReturnType<typeof usePlayFlow>,
  | "handleSitOutContinue"
  | "handleMoveInfoContinue"
  | "handleBoardResultsNext"
  | "handleRoundResultsContinue"
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
export function PlayStateRouter({
  schedule,
  playState,
  gameId,
  seat,
  gameType,
  scoringType,
  leadCardRequired,
  handlers,
}: {
  schedule: Schedule;
  playState: PlayState;
  gameId: string;
  seat: string;
  gameType: GameType;
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
          seat={seat}
          gameType={gameType}
          scoringType={scoringType}
          boardNumber={boardNumber}
          playedBoards={playedBoards}
          lastBoardOfRound={lastBoardOfRound}
          onNext={handlers.handleBoardResultsNext}
          headerRight={headerRight}
        />
      );
    }

    case "roundResults": {
      const round = schedule.rounds[playState.roundIndex];
      return (
        <RoundResultsLoader
          gameId={gameId}
          seat={seat}
          boards={round.boards}
          onContinue={handlers.handleRoundResultsContinue}
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
  seat,
  gameType,
  scoringType,
  boardNumber,
  playedBoards,
  lastBoardOfRound,
  onNext,
  headerRight,
}: {
  gameId: string;
  seat: string;
  gameType: GameType;
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
        seat={seat}
        gameType={gameType}
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
  seat,
  gameType,
  scoringType,
  viewingBoard,
  playedBoards,
  lastBoardOfRound,
  onBoardSelected,
  onNext,
  headerRight,
}: {
  gameId: string;
  seat: string;
  gameType: GameType;
  scoringType: ScoringType;
  viewingBoard: number;
  playedBoards: number[];
  lastBoardOfRound: boolean;
  onBoardSelected: (board: number) => void;
  onNext: () => void;
  headerRight?: React.ReactNode;
}) {
  const isTeams = gameType === "TEAMS";

  // The board's pooled traveller: for a teams game the field-wide view is
  // cross-IMP (the "X-IMP" side of the toggle); for pairs it is the game's own
  // scoring type.
  const scoredBoard = useScoredBoard(
    gameId,
    viewingBoard,
    isTeams ? "XIMP" : scoringType,
  );
  // The deal for the board being viewed rides the same traveller context, so
  // it appears (and updates live) once anyone has entered it. For a teams game
  // the pooled instances also drive the "Team Result" table (this table vs the
  // other room), built from the board rows every device already holds.
  const { deal, instances } = useTravellerContext();

  const teamResultTable = isTeams
    ? buildTeamBoardResultTable(
        instances.map((i) => ({
          tableNumber: i.tableNumber,
          ns: i.participants.ns,
          ew: i.participants.ew,
          result: i.currentResult as never,
          status: i.status,
        })),
        viewingBoard,
        seat,
      )
    : null;

  if (!scoredBoard) {
    return <FullScreenSpinner />;
  }

  return (
    <BoardResultsPage
      board={viewingBoard}
      playedBoards={playedBoards}
      lastBoardOfRound={lastBoardOfRound}
      scoredBoard={scoredBoard}
      teamResultTable={teamResultTable}
      deal={deal}
      onBoardSelected={onBoardSelected}
      onNext={onNext}
      headerRight={headerRight}
    />
  );
}
