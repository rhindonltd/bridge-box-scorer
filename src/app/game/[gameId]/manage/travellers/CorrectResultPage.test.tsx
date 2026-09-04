import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const mockEmitWithAck = vi.fn();
const mockParseContract = vi.fn();
const mockBuildCode = vi.fn();

let swrState: { data: unknown; isLoading: boolean };
vi.mock("swr", () => ({
  default: () => ({ data: swrState.data, isLoading: swrState.isLoading }),
}));

vi.mock("@/lib/fetcher", () => ({ fetcher: vi.fn() }));
vi.mock("@/swr/swr-keys", () => ({
  swrKeys: { boards: (id: string) => `/api/games/${id}/boards` },
}));

vi.mock("@/context/GameContext", () => ({
  useRequiredGame: () => ({
    game: { gameId: "g1", leadCardRequired: true },
  }),
}));

vi.mock("@/lib/socket", () => ({
  emitWithAck: (...args: unknown[]) => mockEmitWithAck(...args),
}));

vi.mock("@/lib/director-token", () => ({
  getDirectorToken: () => "tok",
}));

vi.mock("@/model/contract", () => ({
  parseContract: (...args: unknown[]) => mockParseContract(...args),
}));

vi.mock("@/lib/buildPlayedContractCode", () => ({
  buildPlayedContractCode: (...args: unknown[]) => mockBuildCode(...args),
}));

// Child components stubbed so the test focuses on the state machine.
vi.mock("@/app/game/[gameId]/manage/travellers/SelectBoardPage", () => ({
  SelectBoardPage: ({
    boards,
    isLoading,
    onBoardSelected,
  }: {
    boards: number[];
    isLoading: boolean;
    onBoardSelected: (n: number) => void;
  }) => (
    <div>
      <span data-testid="boards">{boards.join(",")}</span>
      <span data-testid="boards-loading">{String(isLoading)}</span>
      <button onClick={() => onBoardSelected(2)}>pick-board</button>
    </div>
  ),
}));

vi.mock("@/context/TravellerContext", () => ({
  TravellerProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="traveller-provider">{children}</div>
  ),
  useTravellerContext: () => ({ instances: [], isLoading: false }),
}));

vi.mock("./Traveller", () => ({
  Traveller: ({
    boardNumber,
    onLineSelected,
    onBack,
  }: {
    boardNumber: number;
    onLineSelected: (i: unknown) => void;
    onBack: () => void;
  }) => (
    <div>
      <span data-testid="traveller-board">{boardNumber}</span>
      <button
        onClick={() =>
          onLineSelected({
            boardNumber,
            roundNumber: 4,
            tableNumber: 5,
          })
        }
      >
        pick-line
      </button>
      <button onClick={onBack}>traveller-back</button>
    </div>
  ),
}));

let wizardOnComplete: (data: unknown) => void;
let wizardOnBack: () => void;
vi.mock("./DirectorContractWizard", () => ({
  DirectorContractWizard: ({
    boardNumber,
    round,
    table,
    onComplete,
    onBack,
  }: {
    boardNumber: number;
    round: number;
    table: number;
    onComplete: (d: unknown) => void;
    onBack: () => void;
  }) => {
    wizardOnComplete = onComplete;
    wizardOnBack = onBack;
    return (
      <div data-testid="wizard">
        {boardNumber}-{round}-{table}
      </div>
    );
  },
}));

import { CorrectResultPage } from "./CorrectResultPage";

async function goToWizard() {
  fireEvent.click(screen.getByText("pick-board")); // -> viewTraveller
  fireEvent.click(screen.getByText("pick-line")); // -> enterContract
  await screen.findByTestId("wizard");
}

describe("CorrectResultPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    swrState = { data: { boards: [1, 2, 3] }, isLoading: false };
    mockEmitWithAck.mockResolvedValue(undefined);
  });

  afterEach(() => vi.clearAllMocks());

  it("shows the board selector with the fetched boards", () => {
    render(<CorrectResultPage onResultCorrected={vi.fn()} />);
    expect(screen.getByTestId("boards").textContent).toBe("1,2,3");
    expect(screen.getByTestId("boards-loading").textContent).toBe("false");
  });

  it("defaults to an empty board list when data is missing", () => {
    swrState = { data: undefined, isLoading: true };
    render(<CorrectResultPage onResultCorrected={vi.fn()} />);
    expect(screen.getByTestId("boards").textContent).toBe("");
    expect(screen.getByTestId("boards-loading").textContent).toBe("true");
  });

  it("navigates selectBoard -> viewTraveller -> back", () => {
    render(<CorrectResultPage onResultCorrected={vi.fn()} />);
    fireEvent.click(screen.getByText("pick-board"));
    expect(screen.getByTestId("traveller-provider")).toBeInTheDocument();
    expect(screen.getByTestId("traveller-board").textContent).toBe("2");

    fireEvent.click(screen.getByText("traveller-back"));
    expect(screen.getByTestId("boards")).toBeInTheDocument();
  });

  it("navigates into the contract wizard and can go back to the traveller", async () => {
    render(<CorrectResultPage onResultCorrected={vi.fn()} />);
    await goToWizard();
    expect(screen.getByTestId("wizard").textContent).toBe("2-4-5");

    wizardOnBack();
    await waitFor(() =>
      expect(screen.getByTestId("traveller-board")).toBeInTheDocument(),
    );
  });

  it("saves an adjusted (percentage) override", async () => {
    const onResultCorrected = vi.fn();
    render(<CorrectResultPage onResultCorrected={onResultCorrected} />);
    await goToWizard();

    wizardOnComplete({ type: "adjusted", nsPercent: 60, ewPercent: 40 });

    await waitFor(() => expect(onResultCorrected).toHaveBeenCalled());
    expect(mockEmitWithAck).toHaveBeenCalledWith(
      "traveller:overrideResult",
      expect.objectContaining({
        gameId: "g1",
        boardNumber: 2,
        roundNumber: 4,
        tableNumber: 5,
        result: "A60/40",
      }),
    );
  });

  it("saves a special-outcome override (PO/NP) without parsing a contract", async () => {
    const onResultCorrected = vi.fn();
    render(<CorrectResultPage onResultCorrected={onResultCorrected} />);
    await goToWizard();

    wizardOnComplete({ type: "played", contract: "PO", result: 0 });

    await waitFor(() => expect(onResultCorrected).toHaveBeenCalled());
    expect(mockParseContract).not.toHaveBeenCalled();
    expect(mockEmitWithAck).toHaveBeenCalledWith(
      "traveller:overrideResult",
      expect.objectContaining({ result: "PO" }),
    );
  });

  it("parses and builds a played contract override", async () => {
    mockParseContract.mockReturnValue({
      level: 3,
      suit: "NT",
      doubling: "",
      declarer: "N",
    });
    mockBuildCode.mockReturnValue("3NT-N=");
    const onResultCorrected = vi.fn();
    render(<CorrectResultPage onResultCorrected={onResultCorrected} />);
    await goToWizard();

    wizardOnComplete({ type: "played", contract: "3NTN", result: 0 });

    await waitFor(() => expect(onResultCorrected).toHaveBeenCalled());
    expect(mockParseContract).toHaveBeenCalledWith("3NTN");
    expect(mockBuildCode).toHaveBeenCalledWith(3, "NT", "", "N", 0);
    expect(mockEmitWithAck).toHaveBeenCalledWith(
      "traveller:overrideResult",
      expect.objectContaining({ result: "3NT-N=" }),
    );
  });

  it("shows a saving spinner and then an error banner if the override fails", async () => {
    mockEmitWithAck.mockRejectedValue(new Error("boom"));
    render(<CorrectResultPage onResultCorrected={vi.fn()} />);
    await goToWizard();

    wizardOnComplete({ type: "adjusted", nsPercent: 50, ewPercent: 50 });

    // Back on the board selector with the error banner.
    await waitFor(() => expect(screen.getByText("boom")).toBeInTheDocument());
    expect(screen.getByTestId("boards")).toBeInTheDocument();
  });

  it("shows a default error message for a non-Error rejection", async () => {
    mockEmitWithAck.mockRejectedValue("nope");
    render(<CorrectResultPage onResultCorrected={vi.fn()} />);
    await goToWizard();

    wizardOnComplete({ type: "adjusted", nsPercent: 50, ewPercent: 50 });

    await waitFor(() =>
      expect(screen.getByText("Failed to save override")).toBeInTheDocument(),
    );
  });
});
