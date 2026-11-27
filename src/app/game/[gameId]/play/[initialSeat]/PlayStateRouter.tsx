"use client";

import { useState } from "react";
import type { ContractEntryInitial } from "@/hooks/use-contract-entry";
import type { Card, Rank, Suit } from "@/model/common";
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
import { EnterDealsPage } from "@/app/game/[gameId]/play/[initialSeat]/EnterDealsPage";
import { ScoringType, GameType } from "@/model/game-types";
import { teamBoardResult } from "@/modules/scoring";
import { teamBoardResultTable } from "@/modules/results-views";
import type { Player } from "@/db/games/tables/players";
import { SitOutPage } from "@/app/game/[gameId]/play/[initialSeat]/SitOutPage";
import { usePlayFlow } from "@/hooks/play-flow";
import {
  boardsSinceScoreBreak,
  type PlayState,
  type Schedule,
} from "@/modules/play-flow";
import { MoveInfoPage } from "@/app/game/[gameId]/play/[initialSeat]/MoveInfoPage";
import { AwaitingNextRoundPage } from "@/app/game/[gameId]/play/[initialSeat]/AwaitingNextRoundPage";
import { RoundResultsLoader } from "@/app/game/[gameId]/play/[initialSeat]/RoundResultsPage";
import { ScoreBreakPage } from "@/app/game/[gameId]/play/[initialSeat]/ScoreBreakPage";
import { parseSeat } from "@/model/participants";
import { PlayHeaderMenu } from "@/app/game/[gameId]/play/[initialSeat]/PlayHeaderMenu";
import type { HeaderMenuItem } from "@/components/layout/HeaderMenu";
import { FullScreenSpinner } from "@/components/common/Spinner";
import { useScoredBoard } from "./useScoredBoard";

/** The handler callbacks the play screens fire, as returned by usePlayFlow. */
export type PlayHandlers = Pick<
  ReturnType<typeof usePlayFlow>,
  | "handleSitOutContinue"
  | "handleMoveInfoContinue"
  | "handleBoardResultsNext"
  | "handleScoreBreakContinue"
  | "handleRoundResultsContinue"
  | "handleDealsContinue"
  | "handleReenter"
  | "handleEnterRound"
  | "submitResult"
  | "withdrawSubmission"
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

  // The entry last submitted from the wizard. Kept here (this component stays
  // mounted while the wizard comes and goes) so that backing out of the waiting
  // screen returns to the result/lead step instead of restarting the flow. It
  // is dropped as soon as play moves on (mismatch, board results, ...).
  const [draft, setDraft] = useState<{
    board: number;
    entry: ContractEntryInitial;
  } | null>(null);
  if (
    draft &&
    playState.state !== "enterContract" &&
    playState.state !== "waiting"
  ) {
    setDraft(null);
  }

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
          halfMatch={round.halfMatch}
          opponentExpectedLate={round.opponentExpectedLate}
          opponentWithdrawn={round.opponentWithdrawn}
          sharesWithTable={round.sharesWithTable}
          onEnterRound={handlers.handleEnterRound}
          // Moving past an expected-late opponent reuses the sit-out advance
          // (next round, no server write) — both are "nothing to play here".
          onContinuePastLateOpponent={handlers.handleSitOutContinue}
          headerRight={headerRight}
        />
      );
    }

    case "enterContract": {
      const round = schedule.rounds[playState.roundIndex];
      // Skip boards already confirmed and boards missed because a pair is
      // absent (design §11) — neither is entered.
      const playedBoards = round.boardStatuses
        .filter((b) => b.status === "CONFIRMED" || b.status === "ABSENT")
        .map((b) => b.boardNumber);
      return (
        <ContractWizard
          round={round.roundNumber}
          table={round.tableNumber!}
          roundBoards={round.boards}
          playedBoards={playedBoards}
          leadCardRequired={leadCardRequired}
          draft={draft}
          headerRight={headerRight}
          onComplete={(data) => {
            if (data.contract === "PO" || data.contract === "NP") {
              setDraft({
                board: data.board,
                entry: { specialOutcome: data.contract },
              });
              handlers.submitResult(data.board, data.contract, null);
            } else {
              const parsed = parseContract(data.contract);
              const lead: Card | null = data.lead;
              setDraft({
                board: data.board,
                entry: {
                  level: parsed.level,
                  suit: parsed.suit,
                  declarer: parsed.declarer,
                  dbl: parsed.doubling,
                  leadSuit: lead ? (lead[0] as Suit) : null,
                  leadRank: lead ? (lead.slice(1) as Rank) : null,
                  resultMode: data.result < 0 ? "down" : "made",
                  resultValue: Math.abs(data.result),
                },
              });
              const fullResult = buildPlayedContractCode(
                parsed.level,
                parsed.suit,
                parsed.doubling,
                parsed.declarer,
                data.result,
              );
              handlers.submitResult(data.board, fullResult, data.lead ?? null);
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
          result={playState.result}
          lead={playState.lead}
          onBack={handlers.withdrawSubmission}
          headerRight={headerRight}
        />
      );
    }

    case "mismatch":
      return (
        <ResultMismatch
          nsBoardNumber={playState.nsBoardNumber}
          nsResult={playState.nsResult}
          nsLead={playState.nsLead}
          ewBoardNumber={playState.ewBoardNumber}
          ewResult={playState.ewResult}
          ewLead={playState.ewLead}
          onReenter={handlers.handleReenter}
          headerRight={headerRight}
        />
      );

    case "boardResults": {
      const round = schedule.rounds[playState.roundIndex];
      const boardNumber = round.boards[playState.boardIndex];
      const lastBoardOfRound = playState.boardIndex === round.boards.length - 1;

      return (
        <BoardResultsLoader
          gameId={gameId}
          seat={seat}
          gameType={gameType}
          scoringType={scoringType}
          boardNumber={boardNumber}
          lastBoardOfRound={lastBoardOfRound}
          onNext={handlers.handleBoardResultsNext}
        />
      );
    }

    case "scoreBreak": {
      // A team's pairs keep their own seats' ids, so the pair's id names its
      // home table and whether it is the away (East/West) pair.
      const home = parseSeat(schedule.assignmentId);
      return (
        <ScoreBreakPage
          homeTable={home.tableNumber}
          away={home.direction === "EW"}
          onContinue={handlers.handleScoreBreakContinue}
          headerRight={headerRight}
        />
      );
    }

    case "roundResults":
      return (
        <RoundResultsLoader
          gameId={gameId}
          seat={seat}
          boards={boardsSinceScoreBreak(schedule.rounds, playState.roundIndex)}
          onContinue={handlers.handleRoundResultsContinue}
          headerRight={headerRight}
        />
      );

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
          tableNumber={roundSchedule.tableNumber}
          side={roundSchedule.side}
          sitOut={roundSchedule.sitOut ?? false}
          onMoveInfoContinue={handlers.handleMoveInfoContinue}
          headerRight={headerRight}
        />
      );
    }

    case "awaitingNextRound":
      // Between rounds, waiting for the director to draw the next round (Swiss).
      // No Continue — the player can't advance until the draw; the flow
      // revalidates on GAME_UPDATED (Stage 4) and moves on by itself.
      return (
        <AwaitingNextRoundPage
          completedRound={playState.completedRound}
          headerRight={headerRight}
        />
      );

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
  lastBoardOfRound,
  onNext,
}: {
  gameId: string;
  seat: string;
  gameType: GameType;
  scoringType: ScoringType;
  boardNumber: number;
  lastBoardOfRound: boolean;
  onNext: () => void;
}) {
  // The traveller for the board comes live from the traveller context. The
  // board-results screen builds its own play header menu (it contributes the
  // Results / Deal view options), so no headerRight is threaded in here.
  return (
    <TravellerProvider boardNumber={boardNumber}>
      <BoardResultsContent
        gameId={gameId}
        seat={seat}
        gameType={gameType}
        scoringType={scoringType}
        board={boardNumber}
        lastBoardOfRound={lastBoardOfRound}
        onNext={onNext}
      />
    </TravellerProvider>
  );
}

function BoardResultsContent({
  gameId,
  seat,
  gameType,
  scoringType,
  board,
  lastBoardOfRound,
  onNext,
}: {
  gameId: string;
  seat: string;
  gameType: GameType;
  scoringType: ScoringType;
  board: number;
  lastBoardOfRound: boolean;
  onNext: () => void;
}) {
  const isTeams = gameType === "TEAMS";

  // When a deal has been entered for the board, the player can switch the main
  // view between the results and the hand diagram. That choice lives in the
  // play header menu (below), so it sits with the other header actions rather
  // than adding a control to the board area. `false` = results (the default).
  const [showDeal, setShowDeal] = useState(false);

  // The board's pooled traveller: for a teams game the field-wide view is
  // cross-IMP (the "X-IMP" side of the toggle); for pairs it is the game's own
  // scoring type.
  const scoredBoard = useScoredBoard(
    gameId,
    board,
    isTeams ? "XIMP" : scoringType,
  );
  // The deal for the board being viewed rides the same traveller context, so
  // it appears (and updates live) once anyone has entered it. For a teams game
  // the pooled instances also drive the "Team Result" table (this table vs the
  // other room), built from the board rows every device already holds.
  const { deal, instances } = useTravellerContext();

  const teamResultTable = isTeams
    ? teamBoardResultTable(
        teamBoardResult(
          instances.map((i) => ({
            tableNumber: i.tableNumber,
            ns: i.participants.ns,
            ew: i.participants.ew,
            result: i.currentResult as never,
            status: i.status,
            seatsSwapped: i.seatsSwapped,
          })),
          board,
          seat,
        ),
      )
    : null;

  if (!scoredBoard) {
    return <FullScreenSpinner />;
  }

  // A deal (once entered) adds a "Results / Deal" choice to the play header
  // menu, with the current view ticked.
  const viewItems: HeaderMenuItem[] = deal
    ? [
        {
          label: "Results",
          active: !showDeal,
          onSelect: () => setShowDeal(false),
        },
        { label: "Deal", active: showDeal, onSelect: () => setShowDeal(true) },
      ]
    : [];

  return (
    <BoardResultsPage
      board={board}
      lastBoardOfRound={lastBoardOfRound}
      scoredBoard={scoredBoard}
      teamResultTable={teamResultTable}
      deal={deal}
      showDeal={showDeal}
      onNext={onNext}
      headerRight={
        <PlayHeaderMenu gameId={gameId} seat={seat} extraItems={viewItems} />
      }
    />
  );
}
