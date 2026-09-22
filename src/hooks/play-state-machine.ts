/**
 * Pure play-flow state machine.
 *
 * This module holds the player-facing screen flow as a framework-free
 * reducer: given the current {@link PlayState}, the loaded {@link Schedule},
 * and a {@link PlayAction}, it computes the next state. It performs no I/O
 * (no socket, no SWR) so it can be unit-tested in isolation and reused
 * without React — matching the project convention of keeping domain logic
 * out of the transport/hook layer.
 *
 * The hook (`usePlayFlow`) owns the side effects (SWR fetch, socket
 * listeners, emitting submissions) and drives this machine via `dispatch`.
 */

/** A single seated player, as returned by the schedule route. */
export interface SeatPlayer {
  id: number;
  firstName: string;
  lastName: string;
  nationalId: string | null;
}

export interface RoundSchedule {
  roundNumber: number;
  tableNumber: number;
  boards: number[];
  boardStatuses: {
    boardNumber: number;
    status: string;
  }[];
  players: {
    N: SeatPlayer | null;
    S: SeatPlayer | null;
    E: SeatPlayer | null;
    W: SeatPlayer | null;
  };
  sitOut?: boolean;
}

export interface Schedule {
  assignmentId: string;
  side: "NS" | "EW";
  rounds: RoundSchedule[];
  handEntryEnabled?: boolean;
}

export type PlayState =
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
  /**
   * Optional, post-round-only step offering to enter the dealt cards for the
   * round just finished. Reachable only when a round completes (never
   * mid-round, to keep card entry off the critical path), and always skippable
   * — continuing advances to `moveInfo` / `gameComplete` via `nextRoundIndex`.
   */
  | { state: "enterDeals"; roundIndex: number; nextRoundIndex: number }
  | { state: "moveInfo"; nextRoundIndex: number }
  | { state: "gameComplete" };

/**
 * Actions that drive the machine. User-intent actions come from the UI
 * (enter/reenter/continue/next); the `boardConfirmed`/`boardMismatch` actions
 * are dispatched by the hook when the matching socket events arrive; `submit`
 * carries the board the player actually chose in the wizard.
 */
export type PlayAction =
  | { type: "enterRound" }
  | { type: "submit"; boardNumber: number }
  | { type: "reenter" }
  | { type: "boardResultsNext" }
  /** Leave the optional post-round deal-entry step (finished or skipped). */
  | { type: "dealsContinue" }
  | { type: "moveInfoContinue" }
  | { type: "sitOutContinue" }
  | {
      type: "boardConfirmed";
      roundNumber: number;
      tableNumber: number;
      boardNumber: number;
    }
  | {
      type: "boardMismatch";
      roundNumber: number;
      tableNumber: number;
      nsBoardNumber: number;
      nsResult: string;
      ewBoardNumber: number;
      ewResult: string;
    };

/**
 * Given a freshly loaded schedule, find the first incomplete round and return
 * the play state the flow should start in.
 */
export function initialPlayState(schedule: Schedule): PlayState {
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

/** Advance from the end of a round to the next round, or complete the game. */
function afterRound(nextRoundIndex: number, schedule: Schedule): PlayState {
  if (nextRoundIndex < schedule.rounds.length) {
    return { state: "moveInfo", nextRoundIndex };
  }
  return { state: "gameComplete" };
}

/**
 * Advance from the end of a PLAYED round. When the game has hand entry enabled,
 * offers the optional deal-entry step for the round just finished before
 * continuing to the move screen / game complete; otherwise it advances straight
 * on, as if the step had been skipped. Sit-out rounds never reach here (they
 * route through `afterRound` directly), since the sitting pair played no boards
 * to enter cards for.
 */
function afterPlayedRound(
  completedRoundIndex: number,
  schedule: Schedule,
): PlayState {
  // Hand entry is an opt-in per-game setting; when it's off, skip the deal
  // step and advance as if it had been continued past.
  if (!schedule.handEntryEnabled) {
    return afterRound(completedRoundIndex + 1, schedule);
  }

  return {
    state: "enterDeals",
    roundIndex: completedRoundIndex,
    nextRoundIndex: completedRoundIndex + 1,
  };
}

/**
 * The pure transition function. Returns the next state, or the current state
 * unchanged when the action does not apply (wrong phase, missing round, board
 * not in the round, event for a different board/round). The hook is
 * responsible for any accompanying side effect (e.g. emitting the submission);
 * a `submit` that leaves the state unchanged signals "do not emit".
 */
export function playReducer(
  prev: PlayState,
  action: PlayAction,
  schedule: Schedule | null,
): PlayState {
  switch (action.type) {
    case "enterRound": {
      if (prev.state !== "roundInfo") return prev;
      return {
        state: "enterContract",
        roundIndex: prev.roundIndex,
        boardIndex: 0,
      };
    }

    case "submit": {
      if (!schedule) return prev;
      if (prev.state !== "enterContract") return prev;

      const round = schedule.rounds[prev.roundIndex];
      if (!round) return prev;

      const boardIndex = round.boards.indexOf(action.boardNumber);
      if (boardIndex === -1) return prev;

      return { state: "waiting", roundIndex: prev.roundIndex, boardIndex };
    }

    case "reenter": {
      if (prev.state !== "mismatch") return prev;
      return {
        state: "enterContract",
        roundIndex: prev.roundIndex,
        boardIndex: prev.boardIndex,
      };
    }

    case "boardResultsNext": {
      if (!schedule) return prev;
      if (prev.state !== "boardResults") return prev;

      const round = schedule.rounds[prev.roundIndex];
      if (!round) return prev;

      const nextBoardIndex = prev.boardIndex + 1;

      // More boards in this round.
      if (nextBoardIndex < round.boards.length) {
        return {
          state: "enterContract",
          roundIndex: prev.roundIndex,
          boardIndex: nextBoardIndex,
        };
      }

      // Round complete — offer the optional deal-entry step for it (skipped
      // when the game doesn't have hand entry enabled).
      return afterPlayedRound(prev.roundIndex, schedule);
    }

    case "dealsContinue": {
      if (!schedule) return prev;
      if (prev.state !== "enterDeals") return prev;
      return afterRound(prev.nextRoundIndex, schedule);
    }

    case "moveInfoContinue": {
      if (prev.state !== "moveInfo") return prev;
      return { state: "roundInfo", roundIndex: prev.nextRoundIndex };
    }

    case "sitOutContinue": {
      if (!schedule) return prev;
      if (prev.state !== "roundInfo") return prev;
      return afterRound(prev.roundIndex + 1, schedule);
    }

    case "boardConfirmed": {
      if (!schedule) return prev;
      if (prev.state !== "waiting" && prev.state !== "mismatch") return prev;

      const round = schedule.rounds[prev.roundIndex];
      if (!round) return prev;

      if (
        action.roundNumber !== round.roundNumber ||
        action.tableNumber !== round.tableNumber
      ) {
        return prev;
      }

      if (action.boardNumber !== round.boards[prev.boardIndex]) return prev;

      return {
        state: "boardResults",
        roundIndex: prev.roundIndex,
        boardIndex: prev.boardIndex,
      };
    }

    case "boardMismatch": {
      if (!schedule) return prev;
      if (prev.state !== "waiting") return prev;

      const round = schedule.rounds[prev.roundIndex];
      if (!round) return prev;

      if (
        action.roundNumber !== round.roundNumber ||
        action.tableNumber !== round.tableNumber
      ) {
        return prev;
      }

      return {
        state: "mismatch",
        roundIndex: prev.roundIndex,
        boardIndex: prev.boardIndex,
        nsBoardNumber: action.nsBoardNumber,
        nsResult: action.nsResult,
        ewBoardNumber: action.ewBoardNumber,
        ewResult: action.ewResult,
      };
    }
  }
}
