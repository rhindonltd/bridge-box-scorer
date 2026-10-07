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

/** The four seat players at a table, nullable where unresolved. */
export interface SeatPlayers {
  N: SeatPlayer | null;
  S: SeatPlayer | null;
  E: SeatPlayer | null;
  W: SeatPlayer | null;
}

/** One half of a 2-half-matches round (board subset + that half's opponents). */
export interface RoundHalfMatchSegment {
  half: "first" | "second";
  boards: number[];
  players: SeatPlayers;
}

/**
 * The 2-half-matches shape of a round for this pair (Swiss Pairs odd-field
 * handling). Present only when the pair is in the three-pair group:
 * - `anchor` plays both halves (two segments, opponent change at the midpoint);
 * - `firstHalf` / `secondHalf` plays only that half (one segment).
 */
export interface RoundHalfMatch {
  role: "anchor" | "firstHalf" | "secondHalf";
  segments: RoundHalfMatchSegment[];
}

export interface RoundSchedule {
  roundNumber: number;
  tableNumber: number;
  /** Which side this pair sits for the round (can switch between rounds). */
  side?: "NS" | "EW";
  boards: number[];
  boardStatuses: {
    boardNumber: number;
    status: string;
  }[];
  players: SeatPlayers;
  sitOut?: boolean;
  /** Present for a Swiss Pairs "2 half matches" round this pair is in. */
  halfMatch?: RoundHalfMatch;
}

export interface Schedule {
  assignmentId: string;
  side: "NS" | "EW";
  rounds: RoundSchedule[];
  handEntryEnabled?: boolean;
  /**
   * Whether to show the post-round "team results" summary (a teams game only):
   * a screen listing the round's boards with the team's IMP result on each,
   * shown when a played round completes, before the optional deal-entry step
   * and the move screen. Off for pairs games.
   */
  teamRoundResults?: boolean;
}

/**
 * The server-resolved play state, as returned by
 * `GET /api/games/[gameId]/play-state/[seat]`. This mirrors `ResolvedPlayState`
 * in `src/services/resolve-play-state.ts` — redeclared here (rather than
 * imported) because that module is server-only, and the client needs only the
 * wire shape. Keep the two in sync.
 */
export interface ResolvedPlayStateResponse {
  assignmentId: string;
  side: "NS" | "EW";
  phase:
    | { kind: "round"; roundIndex: number; position: ResolvedWithinRound }
    | { kind: "sitOut"; roundIndex: number }
    | { kind: "awaitingNextRound"; completedRound: number }
    | { kind: "complete" };
  rounds: RoundSchedule[];
}

/** The within-round position carried by a resolved `round` phase. */
export type ResolvedWithinRound =
  | { at: "entering"; boardNumber: number }
  | { at: "waitingConfirmation"; boardNumber: number }
  | {
      at: "mismatch";
      boardNumber: number;
      nsBoardNumber: number;
      nsResult: string;
      ewBoardNumber: number;
      ewResult: string;
    }
  | { at: "roundComplete" };

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
   * Post-round team results summary (a teams game only): the round's boards
   * with the team's IMP result on each. Shown when a played round completes,
   * before the optional deal-entry step, and always continued past.
   */
  | { state: "roundResults"; roundIndex: number; nextRoundIndex: number }
  /**
   * Optional, post-round-only step offering to enter the dealt cards for the
   * round just finished. Reachable only when a round completes (never
   * mid-round, to keep card entry off the critical path), and always skippable
   * — continuing advances to `moveInfo` / `gameComplete` via `nextRoundIndex`.
   */
  | { state: "enterDeals"; roundIndex: number; nextRoundIndex: number }
  | { state: "moveInfo"; nextRoundIndex: number }
  /**
   * Between rounds in an event that expects more rounds than are drawn yet
   * (Swiss, awaiting the director's draw of the next round). The player has
   * finished every materialized round; `completedRound` is how many they have
   * played. Resolved by the server; the client shows a waiting screen that
   * advances automatically when the next round is drawn (GAME_UPDATED
   * revalidation).
   */
  | { state: "awaitingNextRound"; completedRound: number }
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
  /** Leave the post-round team results summary (teams game only). */
  | { type: "roundResultsContinue" }
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
 * Map the server-resolved play state to the initial {@link PlayState} the flow
 * should start (or resume) in. The server reconstructs the current round, the
 * within-round position, and the between-rounds verdict from durable truth, so
 * a player who leaves and returns resumes where they were, and a Swiss player
 * between rounds sees a waiting screen rather than a false "game complete".
 *
 * Pure: given the resolved response it returns the matching state. The round
 * granularity mirrors the old flow — a `round` phase enters via `roundInfo`
 * (the contract wizard then skips already-confirmed boards), while a seat that
 * had submitted resumes directly on `waiting` / `mismatch` for its board.
 */
export function playStateFromResolved(
  resolved: ResolvedPlayStateResponse,
): PlayState {
  const { phase } = resolved;

  switch (phase.kind) {
    case "complete":
      return { state: "gameComplete" };

    case "awaitingNextRound":
      return {
        state: "awaitingNextRound",
        completedRound: phase.completedRound,
      };

    case "sitOut":
      // The router renders the sit-out page when the round at this index is a
      // sit-out; roundInfo is the shared entry for both playable and bye rounds.
      return { state: "roundInfo", roundIndex: phase.roundIndex };

    case "round": {
      const { roundIndex, position } = phase;
      const round = resolved.rounds[roundIndex];

      switch (position.at) {
        case "waitingConfirmation": {
          const boardIndex = round.boards.indexOf(position.boardNumber);
          // Defensive: a board the schedule doesn't list → fall back to the
          // round entry rather than a bad index.
          /* v8 ignore next */
          if (boardIndex === -1) return { state: "roundInfo", roundIndex };
          return { state: "waiting", roundIndex, boardIndex };
        }

        case "mismatch": {
          const boardIndex = round.boards.indexOf(position.boardNumber);
          /* v8 ignore next */
          if (boardIndex === -1) return { state: "roundInfo", roundIndex };
          return {
            state: "mismatch",
            roundIndex,
            boardIndex,
            nsBoardNumber: position.nsBoardNumber,
            nsResult: position.nsResult,
            ewBoardNumber: position.ewBoardNumber,
            ewResult: position.ewResult,
          };
        }

        // `entering` and the defensive `roundComplete` both start at the round
        // entry: the player sees the round info and taps in, and the wizard
        // skips any board already confirmed.
        case "entering":
        case "roundComplete":
          return { state: "roundInfo", roundIndex };
      }
    }
  }
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
  // A teams game shows the round's team results first; continuing past it runs
  // the same deal/move chain as a game without the summary.
  if (schedule.teamRoundResults) {
    return {
      state: "roundResults",
      roundIndex: completedRoundIndex,
      nextRoundIndex: completedRoundIndex + 1,
    };
  }

  return afterRoundSummary(completedRoundIndex, schedule);
}

/**
 * The post-round chain that follows the (optional) team results summary: the
 * optional deal-entry step when hand entry is enabled, otherwise straight on to
 * the move screen / game complete.
 */
function afterRoundSummary(
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

    case "roundResultsContinue": {
      if (!schedule) return prev;
      if (prev.state !== "roundResults") return prev;
      // Continue past the summary into the same deal/move chain a non-summary
      // game runs after a played round.
      return afterRoundSummary(prev.roundIndex, schedule);
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
