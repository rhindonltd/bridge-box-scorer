import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ContractWizard } from "@/app/game/[gameId]/play/[initialSeat]/ContractWizard";

const mockGame = vi.fn();
vi.mock("@/context/GameContext", () => ({
  useRequiredGame: () => ({ game: mockGame() }),
}));

const mockAssignment = vi.fn();
vi.mock("@/context/AssignmentContext", () => ({
  useAssignment: () => ({ assignment: mockAssignment() }),
}));

// --- Step stubs: each exposes buttons that fire the wizard callbacks. ---

vi.mock("@/components/contract-wizard/StepBoard", () => ({
  StepBoard: ({ onBoardSelected }: any) => (
    <button data-testid="step-board" onClick={() => onBoardSelected(7)}>
      board
    </button>
  ),
}));

vi.mock("@/components/contract-wizard/StepLevel", () => ({
  StepLevel: ({ onLevelSelected, onSpecialOutcome }: any) => (
    <div>
      <button data-testid="step-level" onClick={() => onLevelSelected(3)}>
        level
      </button>
      <button
        data-testid="step-special"
        onClick={() => onSpecialOutcome("PO")}
      >
        special
      </button>
    </div>
  ),
}));

vi.mock("@/components/contract-wizard/StepSuit", () => ({
  StepSuit: ({ onSuitSelected }: any) => (
    <button data-testid="step-suit" onClick={() => onSuitSelected("NT")}>
      suit
    </button>
  ),
}));

vi.mock("@/components/contract-wizard/StepDeclarer", () => ({
  StepDeclarer: ({ onDeclarerSelected }: any) => (
    <div>
      <button
        data-testid="step-declarer"
        onClick={() => onDeclarerSelected("N", "")}
      >
        declarer
      </button>
      <button
        data-testid="step-declarer-x"
        onClick={() => onDeclarerSelected("N", "X")}
      >
        declarer-x
      </button>
    </div>
  ),
}));

vi.mock("@/components/contract-wizard/StepOpeningLead", () => ({
  StepOpeningLead: ({ onLeadComplete }: any) => (
    <button data-testid="step-lead" onClick={() => onLeadComplete("H", "K")}>
      lead
    </button>
  ),
}));

vi.mock("@/components/contract-wizard/StepResult", () => ({
  StepResult: ({ onResultComplete }: any) => (
    <div>
      <button
        data-testid="step-result-made"
        onClick={() => onResultComplete("made", 1)}
      >
        made
      </button>
      <button
        data-testid="step-result-down"
        onClick={() => onResultComplete("down", 2)}
      >
        down
      </button>
    </div>
  ),
}));

vi.mock("@/components/contract-wizard/StepConfirm", () => ({
  StepConfirm: ({ onSubmit, level, suit, declarer, specialOutcome }: any) => (
    <button
      data-testid="step-confirm"
      onClick={onSubmit}
      data-level={String(level)}
      data-suit={String(suit)}
      data-declarer={String(declarer)}
      data-special={String(specialOutcome)}
    >
      confirm
    </button>
  ),
}));

vi.mock("@/components/contract-wizard/BoardDropDown", () => ({
  BoardDropDown: ({ selectedBoard }: any) => (
    <div data-testid="board-dropdown">board:{String(selectedBoard)}</div>
  ),
}));

const baseProps = {
  round: 2,
  table: 3,
  roundBoards: [7, 8, 9],
  playedBoards: [] as number[],
  leadCardRequired: false,
  onComplete: vi.fn(),
};

describe("ContractWizard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGame.mockReturnValue({
      eventName: "Monday Pairs",
      sessionName: "Evening",
      sectionName: "A",
    });
    mockAssignment.mockReturnValue({ type: "PAIR", id: "3" });
  });

  function back() {
    fireEvent.click(screen.getByRole("button", { name: "Go back" }));
  }

  it("renders the header with event/session/section and assignment", () => {
    render(<ContractWizard {...baseProps} />);
    expect(screen.getByText("Table 3, Round 2")).toBeInTheDocument();
    expect(screen.getByText("Monday Pairs")).toBeInTheDocument();
    expect(screen.getByText(/Evening/)).toBeInTheDocument();
    expect(screen.getByText("Pair 3")).toBeInTheDocument();
    // Step 0: no back button, no board dropdown yet.
    expect(
      screen.queryByRole("button", { name: "Go back" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByTestId("board-dropdown")).not.toBeInTheDocument();
  });

  it("renders session-only sub text and Team label", () => {
    mockGame.mockReturnValue({
      eventName: "Teams",
      sessionName: "Morning",
      sectionName: "",
    });
    mockAssignment.mockReturnValue({ type: "TEAM", id: "9" });
    render(<ContractWizard {...baseProps} />);
    expect(screen.getByText("Morning")).toBeInTheDocument();
    expect(screen.getByText("Team 9")).toBeInTheDocument();
  });

  it("renders no sub text and no assignment badge when absent", () => {
    mockGame.mockReturnValue({
      eventName: "Plain",
      sessionName: "",
      sectionName: "",
    });
    mockAssignment.mockReturnValue(null);
    render(<ContractWizard {...baseProps} />);
    expect(screen.getByText("Plain")).toBeInTheDocument();
    expect(screen.queryByText(/Pair|Team/)).not.toBeInTheDocument();
  });

  it("drives a full played contract and submits (no lead required)", () => {
    const onComplete = vi.fn();
    render(<ContractWizard {...baseProps} onComplete={onComplete} />);

    fireEvent.click(screen.getByTestId("step-board"));
    // After leaving step 0 the board dropdown appears.
    expect(screen.getByTestId("board-dropdown")).toHaveTextContent("board:7");
    fireEvent.click(screen.getByTestId("step-level"));
    fireEvent.click(screen.getByTestId("step-suit"));
    fireEvent.click(screen.getByTestId("step-declarer"));
    // lead not required -> goes straight to result.
    fireEvent.click(screen.getByTestId("step-result-made"));
    fireEvent.click(screen.getByTestId("step-confirm"));

    expect(onComplete).toHaveBeenCalledWith({
      board: 7,
      contract: "3NTN",
      result: 1,
      lead: null,
    });
  });

  it("includes a lead and a doubled contract with a down result", () => {
    const onComplete = vi.fn();
    render(
      <ContractWizard
        {...baseProps}
        leadCardRequired
        onComplete={onComplete}
      />,
    );

    fireEvent.click(screen.getByTestId("step-board"));
    fireEvent.click(screen.getByTestId("step-level"));
    fireEvent.click(screen.getByTestId("step-suit"));
    fireEvent.click(screen.getByTestId("step-declarer-x"));
    fireEvent.click(screen.getByTestId("step-lead"));
    fireEvent.click(screen.getByTestId("step-result-down"));
    fireEvent.click(screen.getByTestId("step-confirm"));

    expect(onComplete).toHaveBeenCalledWith({
      board: 7,
      contract: "3NTXN",
      result: -2,
      lead: "HK",
    });
  });

  it("submits a special outcome directly", () => {
    const onComplete = vi.fn();
    render(<ContractWizard {...baseProps} onComplete={onComplete} />);

    fireEvent.click(screen.getByTestId("step-board"));
    fireEvent.click(screen.getByTestId("step-special"));
    // Special outcome jumps straight to confirm.
    fireEvent.click(screen.getByTestId("step-confirm"));

    expect(onComplete).toHaveBeenCalledWith({
      board: 7,
      contract: "PO",
      result: 0,
      lead: null,
    });
  });

  it("walks the back button through every step", () => {
    render(<ContractWizard {...baseProps} leadCardRequired />);

    // step 0 -> 1
    fireEvent.click(screen.getByTestId("step-board"));
    // 1 -> 2
    fireEvent.click(screen.getByTestId("step-level"));
    // 2 -> 3
    fireEvent.click(screen.getByTestId("step-suit"));
    // 3 -> 4 (lead required)
    fireEvent.click(screen.getByTestId("step-declarer"));
    // 4 -> 5
    fireEvent.click(screen.getByTestId("step-lead"));
    // 5 -> 6
    fireEvent.click(screen.getByTestId("step-result-made"));
    expect(screen.getByTestId("step-confirm")).toBeInTheDocument();

    // 6 -> 5 (played contract)
    back();
    expect(screen.getByTestId("step-result-made")).toBeInTheDocument();
    // 5 -> 4 (lead required)
    back();
    expect(screen.getByTestId("step-lead")).toBeInTheDocument();
    // 4 -> 3
    back();
    expect(screen.getByTestId("step-declarer")).toBeInTheDocument();
    // 3 -> 2
    back();
    expect(screen.getByTestId("step-suit")).toBeInTheDocument();
    // 2 -> 1
    back();
    expect(screen.getByTestId("step-level")).toBeInTheDocument();
    // 1 -> 0
    back();
    expect(screen.getByTestId("step-board")).toBeInTheDocument();
  });

  it("back from result skips the lead step when a lead is not required", () => {
    render(<ContractWizard {...baseProps} />);
    fireEvent.click(screen.getByTestId("step-board"));
    fireEvent.click(screen.getByTestId("step-level"));
    fireEvent.click(screen.getByTestId("step-suit"));
    fireEvent.click(screen.getByTestId("step-declarer"));
    // now at result (step 5)
    back();
    // 5 -> 3 when no lead required
    expect(screen.getByTestId("step-declarer")).toBeInTheDocument();
  });

  it("back from confirm returns to level for a special outcome", () => {
    render(<ContractWizard {...baseProps} />);
    fireEvent.click(screen.getByTestId("step-board"));
    fireEvent.click(screen.getByTestId("step-special"));
    // at confirm (step 6) with a special outcome
    back();
    // 6 -> 1
    expect(screen.getByTestId("step-level")).toBeInTheDocument();
  });
});
