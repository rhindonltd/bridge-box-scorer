import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { PlayState, Schedule } from "@/hooks/play-state-machine";

// Each child screen is stubbed to a marker that echoes the key props/handlers
// we care about, so the test asserts the state→screen mapping and wiring
// without pulling in the real (context/socket-heavy) screens.
vi.mock("@/app/game/[gameId]/play/[initialSeat]/PlayHeaderMenu", () => ({
  PlayHeaderMenu: ({ gameId, seat }: { gameId: string; seat: string }) => (
    <div data-testid="header-menu">{`${gameId}:${seat}`}</div>
  ),
}));

vi.mock("@/components/common/Spinner", () => ({
  FullScreenSpinner: () => <div data-testid="spinner" />,
}));

vi.mock("@/app/game/[gameId]/play/[initialSeat]/RoundInfoPage", () => ({
  RoundInfoPage: ({
    round,
    table,
    onEnterRound,
    headerRight,
  }: {
    round: number;
    table: number;
    onEnterRound: () => void;
    headerRight: React.ReactNode;
  }) => (
    <div data-testid="round-info">
      {`r${round}t${table}`}
      {headerRight}
      <button onClick={onEnterRound}>enter-round</button>
    </div>
  ),
}));

vi.mock("@/app/game/[gameId]/play/[initialSeat]/SitOutPage", () => ({
  SitOutPage: ({
    round,
    onHandleSitOutContinue,
  }: {
    round: number;
    onHandleSitOutContinue: () => void;
  }) => (
    <div data-testid="sit-out">
      {`r${round}`}
      <button onClick={onHandleSitOutContinue}>sit-out-continue</button>
    </div>
  ),
}));

vi.mock("@/app/game/[gameId]/play/[initialSeat]/ContractWizard", () => ({
  ContractWizard: ({
    playedBoards,
    onComplete,
  }: {
    playedBoards: number[];
    onComplete: (d: {
      board: number;
      contract: string;
      result: number;
    }) => void;
  }) => (
    <div data-testid="contract-wizard">
      <span data-testid="played-boards">{playedBoards.join(",")}</span>
      <button
        onClick={() => onComplete({ board: 1, contract: "PO", result: 0 })}
      >
        complete-po
      </button>
      <button
        onClick={() => onComplete({ board: 1, contract: "3NTN", result: 0 })}
      >
        complete-contract
      </button>
    </div>
  ),
}));

vi.mock(
  "@/app/game/[gameId]/play/[initialSeat]/WaitingForConfirmation",
  () => ({
    WaitingForConfirmation: ({ boardNumber }: { boardNumber: number }) => (
      <div data-testid="waiting">{boardNumber}</div>
    ),
  }),
);

vi.mock("@/app/game/[gameId]/play/[initialSeat]/ResultMismatch", () => ({
  ResultMismatch: ({
    nsBoardNumber,
    ewBoardNumber,
    onReenter,
  }: {
    nsBoardNumber: number;
    ewBoardNumber: number;
    onReenter: () => void;
  }) => (
    <div data-testid="mismatch">
      {`${nsBoardNumber}/${ewBoardNumber}`}
      <button onClick={onReenter}>reenter</button>
    </div>
  ),
}));

vi.mock("@/app/game/[gameId]/play/[initialSeat]/MoveInfoPage", () => ({
  MoveInfoPage: ({
    roundNumber,
    sitOut,
    onMoveInfoContinue,
  }: {
    roundNumber: number;
    sitOut: boolean;
    onMoveInfoContinue: () => void;
  }) => (
    <div data-testid="move-info">
      {`r${roundNumber}${sitOut ? "-sitout" : ""}`}
      <button onClick={onMoveInfoContinue}>move-continue</button>
    </div>
  ),
}));

vi.mock("@/app/game/[gameId]/play/[initialSeat]/EnterDealsPage", () => ({
  EnterDealsPage: ({
    boards,
    onDone,
  }: {
    boards: number[];
    onDone: () => void;
  }) => (
    <div data-testid="enter-deals">
      {boards.join(",")}
      <button onClick={onDone}>deals-done</button>
    </div>
  ),
}));

vi.mock("@/app/game/[gameId]/play/[initialSeat]/GameComplete", () => ({
  GameComplete: () => <div data-testid="game-complete" />,
}));

// BoardResults path: stub the traveller provider/hook + scored-board hook and
// the leaf page so the loader renders deterministically.
vi.mock("@/context/TravellerContext", () => ({
  TravellerProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="traveller-provider">{children}</div>
  ),
  useTravellerContext: () => ({ deal: null }),
}));

const mockUseScoredBoard = vi.fn();
vi.mock("./useScoredBoard", () => ({
  useScoredBoard: (...a: unknown[]) => mockUseScoredBoard(...a),
}));

vi.mock("@/app/game/[gameId]/play/[initialSeat]/BoardResultsPage", () => ({
  BoardResultsPage: ({
    board,
    lastBoardOfRound,
  }: {
    board: number;
    lastBoardOfRound: boolean;
  }) => (
    <div data-testid="board-results">{`b${board}${lastBoardOfRound ? "-last" : ""}`}</div>
  ),
}));

const mockSubmitResult = vi.fn();
const mockParseContract = vi.fn();
const mockBuildCode = vi.fn();
vi.mock("@/model/contract", () => ({
  parseContract: (...a: unknown[]) => mockParseContract(...a),
}));
vi.mock("@/lib/buildPlayedContractCode", () => ({
  buildPlayedContractCode: (...a: unknown[]) => mockBuildCode(...a),
}));

import { PlayStateRouter, type PlayHandlers } from "./PlayStateRouter";

// A two-round schedule: round 1 has two boards, round 2 is a sit-out.
const schedule: Schedule = {
  assignmentId: "1NS",
  side: "NS",
  rounds: [
    {
      roundNumber: 1,
      tableNumber: 4,
      boards: [1, 2],
      boardStatuses: [
        { boardNumber: 1, status: "CONFIRMED" },
        { boardNumber: 2, status: "PENDING" },
      ],
      players: { N: null, S: null, E: null, W: null },
    },
    {
      roundNumber: 2,
      tableNumber: 5,
      boards: [3, 4],
      boardStatuses: [],
      players: { N: null, S: null, E: null, W: null },
      sitOut: true,
    },
  ],
};

function makeHandlers(): PlayHandlers {
  return {
    handleSitOutContinue: vi.fn(),
    handleMoveInfoContinue: vi.fn(),
    handleBoardResultsNext: vi.fn(),
    handleRoundResultsContinue: vi.fn(),
    handleDealsContinue: vi.fn(),
    handleReenter: vi.fn(),
    handleEnterRound: vi.fn(),
    submitResult: mockSubmitResult,
    submitDeal: vi.fn(),
  };
}

function renderRouter(playState: PlayState, handlers = makeHandlers()) {
  render(
    <PlayStateRouter
      schedule={schedule}
      playState={playState}
      gameId="g1"
      seat="1NS"
      gameType="PAIRS"
      scoringType="MP"
      leadCardRequired={false}
      handlers={handlers}
    />,
  );
  return handlers;
}

describe("PlayStateRouter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseScoredBoard.mockReturnValue({ board: 1, lines: [] });
  });

  it("renders a spinner in the loading state", () => {
    renderRouter({ state: "loading" });
    expect(screen.getByTestId("spinner")).toBeInTheDocument();
  });

  it("renders RoundInfoPage for a normal round, with the header menu wired", () => {
    renderRouter({ state: "roundInfo", roundIndex: 0 });
    expect(screen.getByTestId("round-info")).toHaveTextContent("r1t4");
    expect(screen.getByTestId("header-menu")).toHaveTextContent("g1:1NS");
  });

  it("renders SitOutPage when the round is a sit-out", () => {
    renderRouter({ state: "roundInfo", roundIndex: 1 });
    expect(screen.getByTestId("sit-out")).toHaveTextContent("r2");
    expect(screen.queryByTestId("round-info")).toBeNull();
  });

  it("renders the ContractWizard with the round's confirmed boards as played", () => {
    renderRouter({ state: "enterContract", roundIndex: 0, boardIndex: 0 });
    expect(screen.getByTestId("played-boards")).toHaveTextContent("1");
  });

  it("submits a special outcome (PO) directly without parsing a contract", () => {
    const handlers = renderRouter({
      state: "enterContract",
      roundIndex: 0,
      boardIndex: 0,
    });
    fireEvent.click(screen.getByText("complete-po"));
    expect(mockParseContract).not.toHaveBeenCalled();
    expect(handlers.submitResult).toHaveBeenCalledWith(1, "PO");
  });

  it("parses and builds the code for a played contract", () => {
    mockParseContract.mockReturnValue({
      level: 3,
      suit: "NT",
      doubling: "",
      declarer: "N",
    });
    mockBuildCode.mockReturnValue("3NT-N=");
    const handlers = renderRouter({
      state: "enterContract",
      roundIndex: 0,
      boardIndex: 0,
    });
    fireEvent.click(screen.getByText("complete-contract"));
    expect(mockParseContract).toHaveBeenCalledWith("3NTN");
    expect(handlers.submitResult).toHaveBeenCalledWith(1, "3NT-N=");
  });

  it("renders WaitingForConfirmation with the current board", () => {
    renderRouter({ state: "waiting", roundIndex: 0, boardIndex: 1 });
    expect(screen.getByTestId("waiting")).toHaveTextContent("2");
  });

  it("renders ResultMismatch with both boards and wires reenter", () => {
    const handlers = renderRouter({
      state: "mismatch",
      roundIndex: 0,
      boardIndex: 0,
      nsBoardNumber: 7,
      nsResult: "3NT=",
      ewBoardNumber: 8,
      ewResult: "3NT+1",
    });
    expect(screen.getByTestId("mismatch")).toHaveTextContent("7/8");
    fireEvent.click(screen.getByText("reenter"));
    expect(handlers.handleReenter).toHaveBeenCalled();
  });

  it("renders the board-results loader (traveller provider + results page)", () => {
    renderRouter({ state: "boardResults", roundIndex: 0, boardIndex: 1 });
    expect(screen.getByTestId("traveller-provider")).toBeInTheDocument();
    // boardIndex 1 is the last board of round 1's two boards.
    expect(screen.getByTestId("board-results")).toHaveTextContent("b2-last");
  });

  it("shows a spinner in board-results while the scored board is still loading", () => {
    // useScoredBoard not ready yet -> the loader renders the spinner.
    mockUseScoredBoard.mockReturnValue(null);
    renderRouter({ state: "boardResults", roundIndex: 0, boardIndex: 0 });
    expect(screen.getByTestId("spinner")).toBeInTheDocument();
    expect(screen.queryByTestId("board-results")).toBeNull();
  });

  it("renders EnterDealsPage with the round's boards", () => {
    renderRouter({ state: "enterDeals", roundIndex: 0, nextRoundIndex: 1 });
    expect(screen.getByTestId("enter-deals")).toHaveTextContent("1,2");
  });

  it("renders MoveInfoPage for the next round, reflecting its sit-out flag", () => {
    renderRouter({ state: "moveInfo", nextRoundIndex: 1 });
    expect(screen.getByTestId("move-info")).toHaveTextContent("r2-sitout");
  });

  it("defaults MoveInfoPage sitOut to false when the next round has no flag", () => {
    // Round 0 has no `sitOut` property -> `?? false` fallback.
    renderRouter({ state: "moveInfo", nextRoundIndex: 0 });
    const moveInfo = screen.getByTestId("move-info");
    expect(moveInfo).toHaveTextContent("r1");
    expect(moveInfo).not.toHaveTextContent("sitout");
  });

  it("renders GameComplete in the terminal state", () => {
    renderRouter({ state: "gameComplete" });
    expect(screen.getByTestId("game-complete")).toBeInTheDocument();
  });
});
