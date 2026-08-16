"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getSocket } from "../lib/socket";
import { SocketEvents } from "../socket/socket-events";

interface RoundSchedule {
  roundNumber: number;
  tableNumber: number | null;
  boards: number[];
  boardStatuses: {
    boardNumber: number;
    status: string | null;
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

export function usePlayFlow(gameId: string, seat: string) {
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [playState, setPlayState] = useState<PlayState>({
    state: "loading",
  });

  /*
   * Keep the latest schedule in a ref so socket event handlers don't
   * need to be recreated whenever schedule changes.
   */
  const scheduleRef = useRef<Schedule | null>(null);

  useEffect(() => {
    scheduleRef.current = schedule;
  }, [schedule]);

  /*
   * Fetch schedule.
   */
  useEffect(() => {
    let cancelled = false;

    setSchedule(null);
    setPlayState({ state: "loading" });

    fetch(`/api/games/${gameId}/schedule/${seat}`)
      .then((r) => {
        if (!r.ok) {
          throw new Error(`Failed to fetch schedule: ${r.status}`);
        }

        return r.json();
      })
      .then((data: Schedule) => {
        if (cancelled) return;

        if (!data.rounds) {
          return;
        }

        setSchedule(data);
        scheduleRef.current = data;

        /*
         * Find the first incomplete round.
         */
        let startRoundIndex = 0;

        for (let i = 0; i < data.rounds.length; i++) {
          const round = data.rounds[i];

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

        if (startRoundIndex >= data.rounds.length) {
          setPlayState({ state: "gameComplete" });
        } else {
          setPlayState({
            state: "roundInfo",
            roundIndex: startRoundIndex,
          });
        }
      })
      .catch(() => {
        if (cancelled) return;

        // You could add an error state here later.
        setPlayState({ state: "loading" });
      });

    return () => {
      cancelled = true;
    };
  }, [gameId, seat]);

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
    (result: string) => {
      const currentSchedule = scheduleRef.current;

      if (!currentSchedule) return;

      let submission: {
        roundIndex: number;
        boardIndex: number;
        roundNumber: number;
        tableNumber: number | null;
        boardNumber: number;
      } | null = null;

      /*
       * Read the current play state atomically.
       *
       * We need to transition to "waiting" only if we're currently
       * in "enterContract".
       */
      setPlayState((prev) => {
        if (prev.state !== "enterContract") {
          return prev;
        }

        const round = currentSchedule.rounds[prev.roundIndex];

        if (!round) {
          return prev;
        }

        const boardNumber = round.boards[prev.boardIndex];

        submission = {
          roundIndex: prev.roundIndex,
          boardIndex: prev.boardIndex,
          roundNumber: round.roundNumber,
          tableNumber: round.tableNumber,
          boardNumber,
        };

        return {
          state: "waiting",
          roundIndex: prev.roundIndex,
          boardIndex: prev.boardIndex,
        };
      });

      /*
       * The React state updater above isn't guaranteed to execute
       * synchronously, so submission cannot reliably be used immediately
       * after setPlayState.
       *
       * Instead, the actual socket submission is performed from the
       * current state below.
       */
      const currentState = playStateRef.current;

      if (currentState.state !== "enterContract") {
        return;
      }

      const round = currentSchedule.rounds[currentState.roundIndex];

      if (!round) {
        return;
      }

      const boardNumber = round.boards[currentState.boardIndex];

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
    [gameId, seat],
  );

  /*
   * Keep the latest playState available to callbacks without forcing
   * those callbacks to be recreated whenever state changes.
   */
  const playStateRef = useRef<PlayState>(playState);

  useEffect(() => {
    playStateRef.current = playState;
  }, [playState]);

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
