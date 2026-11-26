import { describe, it, expect } from "vitest";
import {
  playReducer,
  playStateFromResolved,
  type PlayState,
  type Schedule,
} from "./play-state-machine";
import type { ResolvedPlayState } from "./play-position";

function round(
  roundNumber: number,
  boards: number[],
  opts: { sitOut?: boolean; confirmed?: boolean } = {},
) {
  return {
    roundNumber,
    tableNumber: 1,
    boards,
    boardStatuses: boards.map((b) => ({
      boardNumber: b,
      status: opts.confirmed ? "CONFIRMED" : "NOT_PLAYED",
    })),
    players: { N: null, S: null, E: null, W: null },
    sitOut: opts.sitOut,
  };
}

function schedule(
  rounds: ReturnType<typeof round>[],
  opts: { handEntryEnabled?: boolean; teamRoundResults?: boolean } = {},
): Schedule {
  return {
    assignmentId: "A1",
    side: "NS",
    rounds,
    handEntryEnabled: opts.handEntryEnabled,
    teamRoundResults: opts.teamRoundResults,
  };
}

describe("play reducer — team results summary (teams)", () => {
  it("routes to roundResults when a round's last board finishes for a teams game", () => {
    const sch = schedule([round(1, [1, 2]), round(2, [3])], {
      teamRoundResults: true,
    });
    const prev: PlayState = {
      state: "boardResults",
      roundIndex: 0,
      boardIndex: 1, // last board of round 0
    };
    const next = playReducer(prev, { type: "boardResultsNext" }, sch);
    expect(next).toEqual({
      state: "roundResults",
      roundIndex: 0,
      nextRoundIndex: 1,
    });
  });

  it("continues from roundResults to the move screen (no hand entry)", () => {
    const sch = schedule([round(1, [1, 2]), round(2, [3])], {
      teamRoundResults: true,
    });
    const prev: PlayState = {
      state: "roundResults",
      roundIndex: 0,
      nextRoundIndex: 1,
    };
    const next = playReducer(prev, { type: "roundResultsContinue" }, sch);
    expect(next).toEqual({ state: "moveInfo", nextRoundIndex: 1 });
  });

  it("continues from roundResults to enterDeals when hand entry is on", () => {
    const sch = schedule([round(1, [1, 2]), round(2, [3])], {
      teamRoundResults: true,
      handEntryEnabled: true,
    });
    const prev: PlayState = {
      state: "roundResults",
      roundIndex: 0,
      nextRoundIndex: 1,
    };
    const next = playReducer(prev, { type: "roundResultsContinue" }, sch);
    expect(next).toEqual({
      state: "enterDeals",
      roundIndex: 0,
      nextRoundIndex: 1,
    });
  });

  it("does not show roundResults for a pairs game (flag off)", () => {
    const sch = schedule([round(1, [1, 2]), round(2, [3])]);
    const prev: PlayState = {
      state: "boardResults",
      roundIndex: 0,
      boardIndex: 1,
    };
    const next = playReducer(prev, { type: "boardResultsNext" }, sch);
    expect(next).toEqual({ state: "moveInfo", nextRoundIndex: 1 });
  });

  it("roundResultsContinue is a no-op outside the roundResults state", () => {
    const sch = schedule([round(1, [1])]);
    const prev: PlayState = { state: "roundInfo", roundIndex: 0 };
    expect(playReducer(prev, { type: "roundResultsContinue" }, sch)).toBe(prev);
  });
  it("roundResultsContinue is a no-op without a schedule", () => {
    const prev: PlayState = {
      state: "roundResults",
      roundIndex: 0,
      nextRoundIndex: 1,
    };
    expect(playReducer(prev, { type: "roundResultsContinue" }, null)).toBe(
      prev,
    );
  });
});

describe("play reducer — optional deal-entry step", () => {
  it("routes to enterDeals when a round's last board finishes and hand entry is on", () => {
    const sch = schedule([round(1, [1, 2]), round(2, [3])], {
      handEntryEnabled: true,
    });
    const prev: PlayState = {
      state: "boardResults",
      roundIndex: 0,
      boardIndex: 1, // last board of round 0
    };
    const next = playReducer(prev, { type: "boardResultsNext" }, sch);
    expect(next).toEqual({
      state: "enterDeals",
      roundIndex: 0,
      nextRoundIndex: 1,
    });
  });

  it("skips enterDeals and shows move info when hand entry is off", () => {
    const sch = schedule([round(1, [1, 2]), round(2, [3])]);
    const prev: PlayState = {
      state: "boardResults",
      roundIndex: 0,
      boardIndex: 1, // last board of round 0
    };
    const next = playReducer(prev, { type: "boardResultsNext" }, sch);
    expect(next).toEqual({ state: "moveInfo", nextRoundIndex: 1 });
  });

  it("completes the game after the last round when hand entry is off", () => {
    const sch = schedule([round(1, [1])]);
    const prev: PlayState = {
      state: "boardResults",
      roundIndex: 0,
      boardIndex: 0, // last board of the only round
    };
    const next = playReducer(prev, { type: "boardResultsNext" }, sch);
    expect(next).toEqual({ state: "gameComplete" });
  });

  it("does NOT route to enterDeals mid-round (advances to next board)", () => {
    const sch = schedule([round(1, [1, 2])]);
    const prev: PlayState = {
      state: "boardResults",
      roundIndex: 0,
      boardIndex: 0, // not the last board
    };
    const next = playReducer(prev, { type: "boardResultsNext" }, sch);
    expect(next).toEqual({
      state: "enterContract",
      roundIndex: 0,
      boardIndex: 1,
    });
  });

  it("dealsContinue advances to the move screen for the next round", () => {
    const sch = schedule([round(1, [1]), round(2, [2])]);
    const prev: PlayState = {
      state: "enterDeals",
      roundIndex: 0,
      nextRoundIndex: 1,
    };
    const next = playReducer(prev, { type: "dealsContinue" }, sch);
    expect(next).toEqual({ state: "moveInfo", nextRoundIndex: 1 });
  });

  it("dealsContinue completes the game after the last round", () => {
    const sch = schedule([round(1, [1])]);
    const prev: PlayState = {
      state: "enterDeals",
      roundIndex: 0,
      nextRoundIndex: 1,
    };
    const next = playReducer(prev, { type: "dealsContinue" }, sch);
    expect(next).toEqual({ state: "gameComplete" });
  });

  it("dealsContinue is a no-op outside the enterDeals state", () => {
    const sch = schedule([round(1, [1])]);
    const prev: PlayState = { state: "roundInfo", roundIndex: 0 };
    const next = playReducer(prev, { type: "dealsContinue" }, sch);
    expect(next).toBe(prev);
  });

  it("a sit-out round skips deal entry entirely", () => {
    const sch = schedule([round(1, [1], { sitOut: true }), round(2, [2])]);
    const prev: PlayState = { state: "roundInfo", roundIndex: 0 };
    const next = playReducer(prev, { type: "sitOutContinue" }, sch);
    // Straight to the move screen for the next round — no enterDeals.
    expect(next).toEqual({ state: "moveInfo", nextRoundIndex: 1 });
  });
});

describe("play reducer — null-schedule guards", () => {
  it("submit is a no-op when no schedule is loaded", () => {
    const prev: PlayState = {
      state: "enterContract",
      roundIndex: 0,
      boardIndex: 0,
    };
    const next = playReducer(prev, { type: "submit", boardNumber: 1 }, null);
    expect(next).toBe(prev);
  });

  it("dealsContinue is a no-op when no schedule is loaded", () => {
    const prev: PlayState = {
      state: "enterDeals",
      roundIndex: 0,
      nextRoundIndex: 1,
    };
    const next = playReducer(prev, { type: "dealsContinue" }, null);
    expect(next).toBe(prev);
  });
});

describe("opening-lead and result carry-through", () => {
  const rounds = [round(1, [1, 2])];
  function resolvedAt(
    position: Extract<
      ResolvedPlayState["phase"],
      { kind: "round" }
    >["position"],
  ): ResolvedPlayState {
    return {
      assignmentId: "A1",
      side: "NS",
      rounds,
      phase: { kind: "round", roundIndex: 0, position },
    } as ResolvedPlayState;
  }
  it("resumes waiting with the submitted result and lead", () => {
    expect(
      playStateFromResolved(
        resolvedAt({
          at: "waitingConfirmation",
          boardNumber: 2,
          result: "3NTN=",
          lead: "SA",
        }),
      ),
    ).toEqual({
      state: "waiting",
      roundIndex: 0,
      boardIndex: 1,
      result: "3NTN=",
      lead: "SA",
    });
  });
  it("resumes waiting without a result or lead when none were recorded", () => {
    expect(
      playStateFromResolved(
        resolvedAt({ at: "waitingConfirmation", boardNumber: 1 }),
      ),
    ).toEqual({ state: "waiting", roundIndex: 0, boardIndex: 0 });
  });
  it("resumes a mismatch with both sides' leads", () => {
    expect(
      playStateFromResolved(
        resolvedAt({
          at: "mismatch",
          boardNumber: 1,
          nsBoardNumber: 1,
          nsResult: "3NTN=",
          nsLead: "SA",
          ewBoardNumber: 1,
          ewResult: "3NTN+1",
          ewLead: "HK",
        }),
      ),
    ).toMatchObject({ state: "mismatch", nsLead: "SA", ewLead: "HK" });
  });
  it("resumes a mismatch without leads when none were recorded", () => {
    const state = playStateFromResolved(
      resolvedAt({
        at: "mismatch",
        boardNumber: 1,
        nsBoardNumber: 1,
        nsResult: "3NTN=",
        ewBoardNumber: 1,
        ewResult: "3NTN+1",
      }),
    );
    expect(state).not.toHaveProperty("nsLead");
    expect(state).not.toHaveProperty("ewLead");
  });
  it("submit carries the result and lead into waiting", () => {
    const prev: PlayState = {
      state: "enterContract",
      roundIndex: 0,
      boardIndex: 0,
    };
    expect(
      playReducer(
        prev,
        { type: "submit", boardNumber: 1, result: "3NTN=", lead: "SA" },
        schedule(rounds),
      ),
    ).toEqual({
      state: "waiting",
      roundIndex: 0,
      boardIndex: 0,
      result: "3NTN=",
      lead: "SA",
    });
  });
  it("submit without a result or lead omits them", () => {
    const prev: PlayState = {
      state: "enterContract",
      roundIndex: 0,
      boardIndex: 0,
    };
    expect(
      playReducer(prev, { type: "submit", boardNumber: 1 }, schedule(rounds)),
    ).toEqual({ state: "waiting", roundIndex: 0, boardIndex: 0 });
  });
  it("boardMismatch carries both sides' leads", () => {
    const prev: PlayState = { state: "waiting", roundIndex: 0, boardIndex: 0 };
    const next = playReducer(
      prev,
      {
        type: "boardMismatch",
        roundNumber: 1,
        tableNumber: 1,
        nsBoardNumber: 1,
        nsResult: "3NTN=",
        nsLead: "SA",
        ewBoardNumber: 1,
        ewResult: "3NTN+1",
        ewLead: "HK",
      },
      schedule(rounds),
    );
    expect(next).toMatchObject({
      state: "mismatch",
      nsLead: "SA",
      ewLead: "HK",
    });
  });
});
