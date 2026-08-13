"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { useGame } from "@/context/GameContext";
import { getSocket } from "@/lib/socket";
import { SocketEvents } from "@/socket/socket-events";
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

interface RoundSchedule {
  roundNumber: number;
  tableNumber: number | null;
  boards: number[];
  boardStatuses: { boardNumber: number; status: string | null }[];
  players: {
    N: {
      id: number;
      firstName: string;
      lastName: string;
      nationalId: string | null;
    } | null;
    S: {
      id: number;
      firstName: string;
      lastName: string;
      nationalId: string | null;
    } | null;
    E: {
      id: number;
      firstName: string;
      lastName: string;
      nationalId: string | null;
    } | null;
    W: {
      id: number;
      firstName: string;
      lastName: string;
      nationalId: string | null;
    } | null;
  };
  sitOut?: boolean;
}

interface Schedule {
  assignmentId: string;
  side: "NS" | "EW";
  rounds: RoundSchedule[];
}

type PlayState =
  | { state: "loading" }
  | { state: "roundInfo"; roundIndex: number }
  | { state: "enterContract"; roundIndex: number; boardIndex: number }
  | { state: "waiting"; roundIndex: number; boardIndex: number }
  | {
      state: "mismatch";
      roundIndex: number;
      boardIndex: number;
      nsBoardNumber: number;
      nsResult: string;
      ewBoardNumber: number;
      ewResult: string;
    }
  | { state: "boardResults"; roundIndex: number; boardIndex: number }
  | { state: "moveInfo"; nextRoundIndex: number }
  | { state: "gameComplete" };

export default function PlayPage() {
  const params = useParams<{ gameId: string; initialSeat: string }>();
  const gameId = params.gameId;
  const seat = params.initialSeat;
  const { game } = useGame();

  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [playState, setPlayState] = useState<PlayState>({ state: "loading" });

  // Fetch schedule on mount
  useEffect(() => {
    fetch(`/api/games/${gameId}/schedule/${seat}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.rounds) {
          setSchedule(data);
          // Find consecutive completed rounds from the start
          let startRoundIndex = 0;
          for (let i = 0; i < data.rounds.length; i++) {
            const r = data.rounds[i] as RoundSchedule;
            if (r.sitOut) {
              // Sit-outs before the first incomplete round are considered "done"
              startRoundIndex = i + 1;
              continue;
            }
            if (r.boardStatuses.every((b: any) => b.status === "CONFIRMED")) {
              startRoundIndex = i + 1;
              continue;
            }
            // Found first incomplete round
            startRoundIndex = i;
            break;
          }

          if (startRoundIndex >= data.rounds.length) {
            setPlayState({ state: "gameComplete" });
          } else {
            setPlayState({ state: "roundInfo", roundIndex: startRoundIndex });
          }
        }
      })
      .catch(() => {
        // Stay in loading state
      });
  }, [gameId, seat]);

  // Listen for socket events
  useEffect(() => {
    const socket = getSocket();

    const onConfirmed = (payload: {
      roundNumber: number;
      tableNumber: number;
      boardNumber: number;
    }) => {
      if (!schedule) return;

      setPlayState((prev) => {
        // Handle confirmation from both "waiting" and "mismatch" states
        if (prev.state !== "waiting" && prev.state !== "mismatch") return prev;

        const round = schedule.rounds[prev.roundIndex];
        if (!round) return prev;
        if (
          payload.roundNumber !== round.roundNumber ||
          payload.tableNumber !== round.tableNumber
        )
          return prev;
        if (payload.boardNumber !== round.boards[prev.boardIndex]) return prev;

        // After confirmation, show board results
        return {
          state: "boardResults",
          roundIndex: prev.roundIndex,
          boardIndex: prev.boardIndex,
        };
      });
    };

    const onMismatch = (payload: {
      roundNumber: number;
      tableNumber: number;
      nsBoardNumber: number;
      nsResult: string;
      ewBoardNumber: number;
      ewResult: string;
    }) => {
      if (!schedule) return;

      setPlayState((prev) => {
        if (prev.state !== "waiting") return prev;

        const round = schedule.rounds[prev.roundIndex];
        if (!round) return prev;
        if (
          payload.roundNumber !== round.roundNumber ||
          payload.tableNumber !== round.tableNumber
        )
          return prev;

        return {
          state: "mismatch",
          roundIndex: prev.roundIndex,
          boardIndex: prev.boardIndex,
          nsBoardNumber: payload.nsBoardNumber,
          nsResult: payload.nsResult,
          ewBoardNumber: payload.ewBoardNumber,
          ewResult: payload.ewResult,
        };
      });
    };

    socket.on(SocketEvents.BOARD_CONFIRMED, onConfirmed);
    socket.on(SocketEvents.BOARD_MISMATCH, onMismatch);

    return () => {
      socket.off(SocketEvents.BOARD_CONFIRMED, onConfirmed);
      socket.off(SocketEvents.BOARD_MISMATCH, onMismatch);
    };
  }, [schedule]);

  // Submit result via socket
  const submitResult = useCallback(
    (result: string) => {
      if (!schedule || !game) return;
      if (playState.state !== "enterContract") return;

      const round = schedule.rounds[playState.roundIndex];
      const boardNumber = round.boards[playState.boardIndex];

      const socket = getSocket();
      socket.emit(SocketEvents.SUBMIT_RESULT, {
        gameId,
        gameType: game.gameType,
        seat,
        roundNumber: round.roundNumber,
        tableNumber: round.tableNumber,
        boardNumber,
        result,
      });

      setPlayState({
        state: "waiting",
        roundIndex: playState.roundIndex,
        boardIndex: playState.boardIndex,
      });
    },
    [schedule, game, playState, gameId, seat],
  );

  function handleEnterRound() {
    if (playState.state !== "roundInfo") return;
    setPlayState({
      state: "enterContract",
      roundIndex: playState.roundIndex,
      boardIndex: 0,
    });
  }

  function handleReenter() {
    if (playState.state !== "mismatch") return;
    setPlayState({
      state: "enterContract",
      roundIndex: playState.roundIndex,
      boardIndex: playState.boardIndex,
    });
  }

  function handleBoardResultsNext() {
    if (playState.state !== "boardResults") return;

    const round = schedule!.rounds[playState.roundIndex];
    const nextBoardIndex = playState.boardIndex + 1;

    if (nextBoardIndex < round.boards.length) {
      // More boards in this round
      setPlayState({
        state: "enterContract",
        roundIndex: playState.roundIndex,
        boardIndex: nextBoardIndex,
      });
    } else {
      // All boards done for this round
      const nextRoundIndex = playState.roundIndex + 1;
      if (nextRoundIndex < schedule!.rounds.length) {
        // More rounds — show move info
        setPlayState({ state: "moveInfo", nextRoundIndex });
      } else {
        // Last round — show leaderboard
        setPlayState({ state: "gameComplete" });
      }
    }
  }

  function handleMoveInfoContinue() {
    if (playState.state !== "moveInfo") return;
    setPlayState({ state: "roundInfo", roundIndex: playState.nextRoundIndex });
  }

  function handleSitOutContinue() {
    if (playState.state !== "roundInfo") return;

    const nextRoundIndex = playState.roundIndex + 1;
    if (nextRoundIndex < schedule!.rounds.length) {
      // More rounds — show move info
      setPlayState({ state: "moveInfo", nextRoundIndex });
    } else {
      // Last round was a sit-out — go to leaderboard
      setPlayState({ state: "gameComplete" });
    }
  }

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
          <div className="h-dvh flex flex-col bg-gray-100">
            <PlayHeader detail={`Round ${round.roundNumber}`} />

            <div className="flex-1 flex flex-col items-center justify-center p-6">
              <div className="text-2xl font-bold text-gray-900 mb-2">
                Sit Out
              </div>
              <div className="text-base text-gray-500 text-center">
                You have a sit-out this round. Please wait for the next round.
              </div>
            </div>

            <div className="p-4 shrink-0">
              <button
                onClick={handleSitOutContinue}
                className="w-full py-3.5 text-lg font-bold bg-blue-600 text-white rounded-xl hover:bg-blue-700 active:scale-[0.98] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              >
                Continue
              </button>
            </div>
          </div>
        );
      }

      return (
        <RoundInfoPage
          round={round.roundNumber}
          table={round.tableNumber!}
          boards={round.boards}
          players={round.players as any}
          onEnterRound={handleEnterRound}
        />
      );
    }

    case "enterContract": {
      const round = schedule.rounds[playState.roundIndex];
      const playedBoards = round.boardStatuses
        .filter((b: any) => b.status === "CONFIRMED")
        .map((b: any) => b.boardNumber);
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
    setScoredTraveller(null);
    fetch(`/api/games/${gameId}/boards/${viewingBoard}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.instances) {
          const mode = "PAIR";
          const scoringMode =
            scoringType === "IMP" || scoringType === "XIMP" ? "XIMP" : "MP";

          const lines = data.instances
            .filter((i: any) => i.currentResult != null)
            .map((i: any) => {
              if (mode === "PAIR") {
                return {
                  nsId: i.participants.ns,
                  ewId: i.participants.ew,
                  outcome: i.currentResult,
                };
              } else {
                return {
                  nId: i.participants.n,
                  sId: i.participants.s,
                  eId: i.participants.e,
                  wId: i.participants.w,
                  outcome: i.currentResult,
                };
              }
            });

          if (lines.length > 0) {
            const traveller = {
              type: mode,
              mode,
              board: viewingBoard,
              section: gameId,
              lines,
            } as any;

            const scored = score(traveller, scoringMode);
            setScoredTraveller(scored);
          }
        }
      })
      .catch(() => {});
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
