"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import useSWR from "swr";
import { getSocket } from "../lib/socket";
import { SocketEvents } from "../socket/socket-events";
import { fetcher } from "@/lib/fetcher";
import { swrKeys } from "@/swr/swr-keys";

export interface RoundSchedule {
  roundNumber: number;
  tableNumber: number;
  boards: number[];
  boardStatuses: {
    boardNumber: number;
    status: string;
  }[];
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

/*
 * Given a freshly loaded schedule, find the first incomplete round.
 * Returns the play state the flow should start in.
 */
function initialPlayState(schedule: Schedule): PlayState {
  let startRoundIndex = 0;

  for (let i = 0; i < schedule.rounds.length; i++) {
    const round = schedule.rounds[i];

    if (round.sitOut) {
      startRoundIndex = i + 1;
      continue;
    }

    const roundComplete = round.boardStatuses.every(
      (b) => b.status === "CONFIRMED",
    );

    if (roundComplete) {
      startRoundIndex = i + 1;
      continue;
    }

    // First incomplete round.
    startRoundIndex = i;
    break;
  }

  if (startRoundIndex >= schedule.rounds.length) {
    return { state: "gameComplete" };
  }

  return { state: "roundInfo", roundIndex: startRoundIndex };
}

export function usePlayFlow(gameId: string, seat: string) {
  const [playState, setPlayState] = useState<PlayState>({
    state: "loading",
  });

  /*
   * Fetch the schedule via SWR. The route returns the Schedule object
   * directly (unwrapped from the success envelope by `fetcher`).
   */
  const { data: fetchedSchedule } = useSWR<Schedule>(
    swrKeys.schedule(gameId, seat),
    fetcher,
  );

  const schedule =
    fetchedSchedule && fetchedSchedule.rounds ? fetchedSchedule : null;

  /*
   * Keep the latest schedule in a ref so socket event handlers don't
   * need to be recreated whenever schedule changes.
   */
  const scheduleRef = useRef<Schedule | null>(null);

  useEffect(() => {
    scheduleRef.current = schedule;
  }, [schedule]);

  /*
   * Initialise the play state once per (gameId, seat). Background SWR
   * revalidations may hand back a fresh schedule object, but we must not
   * reset the player back to the starting round mid-session, so the
   * derived starting state is computed only the first time a schedule is
   * seen for this key.
   */
  const initialisedKeyRef = useRef<string | null>(null);

  useEffect(() => {
    const key = `${gameId}/${seat}`;

    if (!schedule) {
      if (initialisedKeyRef.current !== key) {
        setPlayState({ state: "loading" });
      }
      return;
    }

    if (initialisedKeyRef.current === key) {
      return;
    }

    initialisedKeyRef.current = key;
    setPlayState(initialPlayState(schedule));
  }, [schedule, gameId, seat]);

  /*
   * Socket listeners.
   *
   * This effect intentionally has an empty dependency array.
   * The socket listeners are registered once for this hook instance.
   *
   * scheduleRef.current gives the handlers access to the latest schedule.
   */
  useEffect(() => {
    const socket = getSocket();

    const onConfirmed = (payload: {
      roundNumber: number;
      tableNumber: number;
      boardNumber: number;
    }) => {
      const currentSchedule = scheduleRef.current;

      if (!currentSchedule) return;

      setPlayState((prev) => {
        if (prev.state !== "waiting" && prev.state !== "mismatch") {
          return prev;
        }

        const round = currentSchedule.rounds[prev.roundIndex];

        if (!round) {
          return prev;
        }

        if (
          payload.roundNumber !== round.roundNumber ||
          payload.tableNumber !== round.tableNumber
        ) {
          return prev;
        }

        const boardNumber = round.boards[prev.boardIndex];

        if (payload.boardNumber !== boardNumber) {
          return prev;
        }

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
      const currentSchedule = scheduleRef.current;

      if (!currentSchedule) return;

      setPlayState((prev) => {
        if (prev.state !== "waiting") {
          return prev;
        }

        const round = currentSchedule.rounds[prev.roundIndex];

        if (!round) {
          return prev;
        }

        if (
          payload.roundNumber !== round.roundNumber ||
          payload.tableNumber !== round.tableNumber
        ) {
          return prev;
        }

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
  }, []);

  /*
   * Submit a result.
   */
  const submitResult = useCallback(
    (boardNumber: number, result: string) => {
      const currentSchedule = scheduleRef.current;

      if (!currentSchedule) return;

      /*
       * The board the player entered in the wizard is authoritative. Map it
       * back to its index within the round so the waiting/board-results
       * states track the board that was actually submitted, not a positional
       * assumption.
       */
      if (playState.state !== "enterContract") {
        return;
      }

      const round = currentSchedule.rounds[playState.roundIndex];

      if (!round) {
        return;
      }

      const boardIndex = round.boards.indexOf(boardNumber);

      if (boardIndex === -1) {
        return;
      }

      /*
       * Read the current play state atomically. We only transition to
       * "waiting" if we're still in "enterContract" for this round.
       */
      setPlayState((prev) => {
        if (prev.state !== "enterContract") {
          return prev;
        }

        return {
          state: "waiting",
          roundIndex: prev.roundIndex,
          boardIndex,
        };
      });

      const socket = getSocket();

      socket.emit(SocketEvents.SUBMIT_RESULT, {
        gameId,
        seat,
        roundNumber: round.roundNumber,
        tableNumber: round.tableNumber,
        boardNumber,
        result,
      });
    },
    [gameId, seat, playState],
  );

  /*
   * Enter a round.
   */
  const handleEnterRound = useCallback(() => {
    setPlayState((prev) => {
      if (prev.state !== "roundInfo") {
        return prev;
      }

      return {
        state: "enterContract",
        roundIndex: prev.roundIndex,
        boardIndex: 0,
      };
    });
  }, []);

  /*
   * Re-enter a mismatched result.
   */
  const handleReenter = useCallback(() => {
    setPlayState((prev) => {
      if (prev.state !== "mismatch") {
        return prev;
      }

      return {
        state: "enterContract",
        roundIndex: prev.roundIndex,
        boardIndex: prev.boardIndex,
      };
    });
  }, []);

  /*
   * Move from board results to the next board/round.
   */
  const handleBoardResultsNext = useCallback(() => {
    const currentSchedule = scheduleRef.current;

    if (!currentSchedule) return;

    setPlayState((prev) => {
      if (prev.state !== "boardResults") {
        return prev;
      }

      const round = currentSchedule.rounds[prev.roundIndex];

      if (!round) {
        return prev;
      }

      const nextBoardIndex = prev.boardIndex + 1;

      /*
       * More boards in this round.
       */
      if (nextBoardIndex < round.boards.length) {
        return {
          state: "enterContract",
          roundIndex: prev.roundIndex,
          boardIndex: nextBoardIndex,
        };
      }

      /*
       * Round complete.
       */
      const nextRoundIndex = prev.roundIndex + 1;

      if (nextRoundIndex < currentSchedule.rounds.length) {
        return {
          state: "moveInfo",
          nextRoundIndex,
        };
      }

      /*
       * Last round.
       */
      return {
        state: "gameComplete",
      };
    });
  }, []);

  /*
   * Continue after move information.
   */
  const handleMoveInfoContinue = useCallback(() => {
    setPlayState((prev) => {
      if (prev.state !== "moveInfo") {
        return prev;
      }

      return {
        state: "roundInfo",
        roundIndex: prev.nextRoundIndex,
      };
    });
  }, []);

  /*
   * Continue after a sit-out.
   */
  const handleSitOutContinue = useCallback(() => {
    const currentSchedule = scheduleRef.current;

    if (!currentSchedule) return;

    setPlayState((prev) => {
      if (prev.state !== "roundInfo") {
        return prev;
      }

      const nextRoundIndex = prev.roundIndex + 1;

      if (nextRoundIndex < currentSchedule.rounds.length) {
        return {
          state: "moveInfo",
          nextRoundIndex,
        };
      }

      return {
        state: "gameComplete",
      };
    });
  }, []);

  return {
    schedule,
    playState,

    handleSitOutContinue,
    handleMoveInfoContinue,
    handleBoardResultsNext,
    handleReenter,
    handleEnterRound,
    submitResult,
  };
}
