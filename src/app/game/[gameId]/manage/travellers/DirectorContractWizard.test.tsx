import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

let gameOverrides: Record<string, unknown> = {};
vi.mock("@/context/GameContext", () => ({
  useRequiredGame: () => ({
    game: {
      eventName: "Club Night",
      sessionName: null,
      sectionName: null,
      ...gameOverrides,
    },
  }),
}));

vi.mock("lucide-react", () => ({
  ArrowLeft: () => <span data-testid="arrow" />,
}));

// Each step stub exposes buttons that fire its callbacks.
vi.mock("@/components/contract-wizard/StepLevel", () => ({
  StepLevel: ({
    onLevelSelected,
    onSpecialOutcome,
    onAdjustedScore,
  }: {
    onLevelSelected: (l: number) => void;
    onSpecialOutcome: (o: string) => void;
    onAdjustedScore: () => void;
  }) => (
    <div data-testid="step-level">
      <button onClick={() => onLevelSelected(3)}>level-3</button>
      <button onClick={() => onSpecialOutcome("PO")}>special-po</button>
      <button onClick={onAdjustedScore}>adjusted</button>
    </div>
  ),
}));

vi.mock("@/components/contract-wizard/StepSuit", () => ({
  StepSuit: ({ onSuitSelected }: { onSuitSelected: (s: string) => void }) => (
    <div data-testid="step-suit">
      <button onClick={() => onSuitSelected("NT")}>suit-nt</button>
    </div>
  ),
}));

vi.mock("@/components/contract-wizard/StepDeclarer", () => ({
  StepDeclarer: ({
    onDeclarerSelected,
  }: {
    onDeclarerSelected: (d: string, dbl: string) => void;
  }) => (
    <div data-testid="step-declarer">
      <button onClick={() => onDeclarerSelected("N", "")}>declarer-n</button>
    </div>
  ),
}));

vi.mock("@/components/contract-wizard/StepOpeningLead", () => ({
  StepOpeningLead: ({
    onLeadComplete,
  }: {
    onLeadComplete: (s: string, r: string) => void;
  }) => (
    <div data-testid="step-lead">
      <button onClick={() => onLeadComplete("S", "A")}>lead-sa</button>
    </div>
  ),
}));

vi.mock("@/components/contract-wizard/StepResult", () => ({
  StepResult: ({
    onResultComplete,
  }: {
    onResultComplete: (m: "made" | "down", v: number) => void;
  }) => (
    <div data-testid="step-result">
      <button onClick={() => onResultComplete("made", 1)}>result-made</button>
      <button onClick={() => onResultComplete("down", 2)}>result-down</button>
    </div>
  ),
}));

vi.mock("@/components/contract-wizard/StepConfirm", () => ({
  StepConfirm: ({ onSubmit }: { onSubmit: () => void }) => (
    <div data-testid="step-confirm">
      <button onClick={onSubmit}>confirm-submit</button>
    </div>
  ),
}));

vi.mock("@/components/contract-wizard/StepAdjustedScore", () => ({
  StepAdjustedScore: ({
    onSubmit,
  }: {
    onSubmit: (ns: number, ew: number) => void;
  }) => (
    <div data-testid="step-adjusted">
      <button onClick={() => onSubmit(60, 40)}>adjusted-submit</button>
    </div>
  ),
}));

import { DirectorContractWizard } from "./DirectorContractWizard";

function renderWizard(
  props: Partial<React.ComponentProps<typeof DirectorContractWizard>> = {},
) {
  const onComplete = vi.fn();
  const onBack = vi.fn();
  render(
    <DirectorContractWizard
      boardNumber={2}
      round={3}
      table={4}
      leadCardRequired
      onComplete={onComplete}
      onBack={onBack}
      {...props}
    />,
  );
  return { onComplete, onBack };
}

describe("DirectorContractWizard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    gameOverrides = {};
  });

  it("shows the header, sub-header and initial level step", () => {
    renderWizard();
    expect(screen.getByText("Club Night")).toBeInTheDocument();
    expect(screen.getByText("Table 4, Round 3")).toBeInTheDocument();
    expect(screen.getByText("Board 2")).toBeInTheDocument();
    expect(screen.getByTestId("step-level")).toBeInTheDocument();
  });

  it("renders the session/section subtitle when present", () => {
    gameOverrides = { sessionName: "Afternoon", sectionName: "Alpha" };
    renderWizard();
    // The subtitle div renders "Afternoon, Alpha" (session + separator + section).
    expect(screen.getByText("Afternoon, Alpha")).toBeInTheDocument();
  });

  it("renders a section-only subtitle", () => {
    gameOverrides = { sessionName: null, sectionName: "B" };
    renderWizard();
    expect(screen.getByText("B")).toBeInTheDocument();
  });

  it("walks the full played-contract flow with a lead and submits", () => {
    const { onComplete } = renderWizard({ leadCardRequired: true });

    fireEvent.click(screen.getByText("level-3"));
    fireEvent.click(screen.getByText("suit-nt"));
    fireEvent.click(screen.getByText("declarer-n"));
    // leadCardRequired -> step 4 (lead)
    expect(screen.getByTestId("step-lead")).toBeInTheDocument();
    fireEvent.click(screen.getByText("lead-sa"));
    fireEvent.click(screen.getByText("result-made"));
    fireEvent.click(screen.getByText("confirm-submit"));

    expect(onComplete).toHaveBeenCalledWith({
      type: "contract",
      contract: "3NTN",
      result: 1,
      lead: "SA",
    });
  });

  it("skips the lead step when a lead card is not required and handles a down result", () => {
    const { onComplete } = renderWizard({ leadCardRequired: false });

    fireEvent.click(screen.getByText("level-3"));
    fireEvent.click(screen.getByText("suit-nt"));
    fireEvent.click(screen.getByText("declarer-n"));
    // No lead step -> straight to result.
    expect(screen.getByTestId("step-result")).toBeInTheDocument();
    fireEvent.click(screen.getByText("result-down"));
    fireEvent.click(screen.getByText("confirm-submit"));

    expect(onComplete).toHaveBeenCalledWith({
      type: "contract",
      contract: "3NTN",
      result: -2,
      lead: null,
    });
  });

  it("submits a special outcome directly from the confirm step", () => {
    const { onComplete } = renderWizard();
    fireEvent.click(screen.getByText("special-po"));
    // Jumps to confirm (step 6).
    expect(screen.getByTestId("step-confirm")).toBeInTheDocument();
    fireEvent.click(screen.getByText("confirm-submit"));
    expect(onComplete).toHaveBeenCalledWith({
      type: "contract",
      contract: "PO",
      result: 0,
      lead: null,
    });
  });

  it("submits an adjusted score", () => {
    const { onComplete } = renderWizard();
    fireEvent.click(screen.getByText("adjusted"));
    expect(screen.getByTestId("step-adjusted")).toBeInTheDocument();
    fireEvent.click(screen.getByText("adjusted-submit"));
    expect(onComplete).toHaveBeenCalledWith({
      type: "adjusted",
      nsPercent: 60,
      ewPercent: 40,
    });
  });

  it("navigates back through every step", () => {
    const { onBack } = renderWizard({ leadCardRequired: true });

    // Step 1 back -> onBack
    fireEvent.click(screen.getByLabelText("Go back"));
    expect(onBack).toHaveBeenCalledTimes(1);

    // 1 -> 2, back -> 1
    fireEvent.click(screen.getByText("level-3"));
    fireEvent.click(screen.getByLabelText("Go back"));
    expect(screen.getByTestId("step-level")).toBeInTheDocument();

    // 1 -> 2 -> 3, back -> 2
    fireEvent.click(screen.getByText("level-3"));
    fireEvent.click(screen.getByText("suit-nt"));
    fireEvent.click(screen.getByLabelText("Go back"));
    expect(screen.getByTestId("step-suit")).toBeInTheDocument();

    // -> 3 -> 4, back -> 3
    fireEvent.click(screen.getByText("suit-nt"));
    fireEvent.click(screen.getByText("declarer-n"));
    fireEvent.click(screen.getByLabelText("Go back"));
    expect(screen.getByTestId("step-declarer")).toBeInTheDocument();

    // -> 4 -> 5, back -> 4 (leadCardRequired)
    fireEvent.click(screen.getByText("declarer-n"));
    fireEvent.click(screen.getByText("lead-sa"));
    fireEvent.click(screen.getByLabelText("Go back"));
    expect(screen.getByTestId("step-lead")).toBeInTheDocument();

    // -> 5 -> 6, back -> 5 (no special outcome)
    fireEvent.click(screen.getByText("lead-sa"));
    fireEvent.click(screen.getByText("result-made"));
    fireEvent.click(screen.getByLabelText("Go back"));
    expect(screen.getByTestId("step-result")).toBeInTheDocument();
  });

  it("returns from result to declarer when no lead card is required", () => {
    renderWizard({ leadCardRequired: false });
    fireEvent.click(screen.getByText("level-3"));
    fireEvent.click(screen.getByText("suit-nt"));
    fireEvent.click(screen.getByText("declarer-n"));
    // step 5 (result); back -> step 3 (declarer)
    fireEvent.click(screen.getByLabelText("Go back"));
    expect(screen.getByTestId("step-declarer")).toBeInTheDocument();
  });

  it("returns from confirm to level for a special outcome", () => {
    renderWizard();
    fireEvent.click(screen.getByText("special-po"));
    // step 6 (confirm); back -> step 1 (level) because specialOutcome is set
    fireEvent.click(screen.getByLabelText("Go back"));
    expect(screen.getByTestId("step-level")).toBeInTheDocument();
  });

  it("returns from the adjusted-score step to level", () => {
    renderWizard();
    fireEvent.click(screen.getByText("adjusted"));
    // step 7; back -> step 1
    fireEvent.click(screen.getByLabelText("Go back"));
    expect(screen.getByTestId("step-level")).toBeInTheDocument();
  });
});
