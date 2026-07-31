"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { useGame } from "@/context/GameContext";
import { getSocket } from "@/lib/socket";
import { SocketEvents } from "@/socket/socket-events";
import ContractEntryPanel from "@/components/contract/ContractEntryPanel";
import { BoardResult } from "@/components/play/BoardResult";
import { buildPlayedContractCode } from "@/lib/buildPlayedContractCode";
import { ContractCode, isContractCode, parseContract } from "@/model/contract";
import { SpecialBoardOutcome } from "@/model/result";
import { WaitingForConfirmation } from "@/components/pages/play/WaitingForConfirmation";
import { ResultMismatch } from "@/components/pages/play/ResultMismatch";
import { RoundInfoPage } from "@/components/pages/play/RoundInfoPage";
import { GameComplete } from "@/components/pages/play/GameComplete";

interface RoundSchedule {
  roundNumber: number;
  tableNumber: number;
  boards: number[];
  boardStatuses: { boardNumber: number; status: string | null }[];
  players: {
    N: { id: number; firstName: string; lastName: string; nationalId: string | null } | null;
    S: { id: number; firstName: string; lastName: string; nationalId: string | null } | null;
    E: { id: number; firstName: string; lastName: string; nationalId: string | null } | null;
    W: { id: number; firstName: string; lastName: string; nationalId: string | null } | null;
  };
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
  | { state: "enterResult"; roundIndex: number; boardIndex: number; contract: ContractCode }
  | { state: "waiting"; roundIndex: number; boardIndex: number }
  | { state: "mismatch"; roundIndex: number; boardIndex: number; nsResult: string; ewResult: string }
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
          // Find the first round with unconfirmed boards
          const firstUnconfirmedRound = data.rounds.findIndex(
            (r: RoundSchedule) => r.boardStatuses.some((b: { status: string | null }) => b.status !== "CONFIRMED")
          );
          if (firstUnconfirmedRound === -1) {
            setPlayState({ state: "gameComplete" });
          } else {
            setPlayState({ state: "roundInfo", roundIndex: firstUnconfirmedRound });
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

    const onConfirmed = (payload: { roundNumber: number; tableNumber: number; boardNumber: number }) => {
      if (!schedule) return;

      setPlayState((prev) => {
        // Handle confirmation from both "waiting" and "mismatch" states
        if (prev.state !== "waiting" && prev.state !== "mismatch") return prev;

        const round = schedule.rounds[prev.roundIndex];
        if (!round) return prev;
        if (payload.roundNumber !== round.roundNumber || payload.tableNumber !== round.tableNumber) return prev;
        if (payload.boardNumber !== round.boards[prev.boardIndex]) return prev;

        // Advance to next board or next round
        const nextBoardIndex = prev.boardIndex + 1;
        if (nextBoardIndex < round.boards.length) {
          return { state: "enterContract", roundIndex: prev.roundIndex, boardIndex: nextBoardIndex };
        }

        // All boards in this round done — go to next round
        const nextRoundIndex = prev.roundIndex + 1;
        if (nextRoundIndex < schedule.rounds.length) {
          return { state: "roundInfo", roundIndex: nextRoundIndex };
        }

        return { state: "gameComplete" };
      });
    };

    const onMismatch = (payload: { roundNumber: number; tableNumber: number; boardNumber: number; nsResult: string; ewResult: string }) => {
      if (!schedule) return;

      setPlayState((prev) => {
        if (prev.state !== "waiting") return prev;

        const round = schedule.rounds[prev.roundIndex];
        if (!round) return prev;
        if (payload.roundNumber !== round.roundNumber || payload.tableNumber !== round.tableNumber) return prev;
        if (payload.boardNumber !== round.boards[prev.boardIndex]) return prev;

        return {
          state: "mismatch",
          roundIndex: prev.roundIndex,
          boardIndex: prev.boardIndex,
          nsResult: payload.nsResult,
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
      if (playState.state !== "enterContract" && playState.state !== "enterResult") return;

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

  function handleContractEntered(contract: ContractCode | SpecialBoardOutcome) {
    if (playState.state !== "enterContract") return;

    // Special outcomes (PO, NP) don't need a result step
    if (contract === "PO" || contract === "NP") {
      submitResult(contract);
      return;
    }

    // Regular contract — go to result entry
    if (isContractCode(contract)) {
      setPlayState({
        state: "enterResult",
        roundIndex: playState.roundIndex,
        boardIndex: playState.boardIndex,
        contract,
      });
    }
  }

  function handleResultEntered(trickResult: number) {
    if (playState.state !== "enterResult") return;

    const parsed = parseContract(playState.contract);
    const fullResult = buildPlayedContractCode(
      parsed.level,
      parsed.suit,
      parsed.doubling,
      parsed.declarer,
      trickResult,
    );

    submitResult(fullResult);
  }

  function handleEnterRound() {
    if (playState.state !== "roundInfo") return;
    setPlayState({ state: "enterContract", roundIndex: playState.roundIndex, boardIndex: 0 });
  }

  function handleReenter() {
    if (playState.state !== "mismatch") return;
    setPlayState({
      state: "enterContract",
      roundIndex: playState.roundIndex,
      boardIndex: playState.boardIndex,
    });
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
      return (
        <RoundInfoPage
          round={round.roundNumber}
          table={round.tableNumber}
          boards={round.boards}
          players={round.players as any}
          onEnterRound={handleEnterRound}
        />
      );
    }

    case "enterContract": {
      const round = schedule.rounds[playState.roundIndex];
      const boardNumber = round.boards[playState.boardIndex];
      return (
        <ContractEntryPanel
          headerText={`Board ${boardNumber}`}
          subHeaderText={`Table ${round.tableNumber}, Round ${round.roundNumber}`}
          onOk={handleContractEntered}
        />
      );
    }

    case "enterResult": {
      const round = schedule.rounds[playState.roundIndex];
      const boardNumber = round.boards[playState.boardIndex];
      const parsed = parseContract(playState.contract);
      const contractDisplay = `${parsed.level}${parsed.suit}${parsed.doubling}`;
      return (
        <BoardResult
          board={boardNumber}
          contract={contractDisplay}
          declarer={parsed.declarer}
          onSave={handleResultEntered}
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
          boardNumber={schedule.rounds[playState.roundIndex].boards[playState.boardIndex]}
          nsResult={playState.nsResult}
          ewResult={playState.ewResult}
          onReenter={handleReenter}
        />
      );
    }

    case "gameComplete":
      return <GameComplete />;
  }
}
