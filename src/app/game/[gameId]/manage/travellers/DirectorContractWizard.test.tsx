import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

let gameOverrides: Record<string, unknown> = {};
vi.mock("@/context/GameContext", () => ({
  useRequiredGame: () => ({
    game: {
      eventName: "Club Night",
      sectionName: null,
      ...gameOverrides,
    },
  }),
}));

vi.mock("lucide-react", () => ({
  ArrowLeft: () => <span data-testid="arrow" />,
}));

// Each step stub exposes buttons that fire its callbacks.
vi.mock("@/components/contract-wizard/StepAdjustmentType", () => ({
  StepAdjustmentType: ({
    onEnterContract,
    onAdjustedScore,
    onWeightedScore,
    onCancelBoard,
    onRemoveTeamsBoard,
    onVoidTeamsMatch,
    onVoidPairsMatch,
  }: {
    onEnterContract: () => void;
    onAdjustedScore: () => void;
    onWeightedScore: () => void;
    onCancelBoard: () => void;
    onRemoveTeamsBoard?: () => void;
    onVoidTeamsMatch?: () => void;
    onVoidPairsMatch?: () => void;
  }) => (
    <div data-testid="step-hub">
      <button onClick={onEnterContract}>hub-contract</button>
      <button onClick={onAdjustedScore}>hub-adjusted</button>
      <button onClick={onWeightedScore}>hub-weighted</button>
      <button onClick={onCancelBoard}>hub-cancel</button>
      {onRemoveTeamsBoard && (
        <button onClick={onRemoveTeamsBoard}>hub-remove-teams</button>
      )}
      {onVoidTeamsMatch && (
        <button onClick={onVoidTeamsMatch}>hub-void-match</button>
      )}
      {onVoidPairsMatch && (
        <button onClick={onVoidPairsMatch}>hub-void-pairs</button>
      )}
    </div>
  ),
}));

vi.mock("@/components/contract-wizard/StepPairsVoid", () => ({
  StepPairsVoid: ({ onSubmit }: { onSubmit: (cause: string) => void }) => (
    <div data-testid="step-pairs-void">
      <button onClick={() => onSubmit("OFFENDER_EW")}>void-pairs-ew</button>
    </div>
  ),
}));

vi.mock("@/components/contract-wizard/StepTeamsRemoval", () => ({
  StepTeamsRemoval: ({
    onSubmit,
  }: {
    onSubmit: (fault: string) => void;
  }) => (
    <div data-testid="step-teams-removal">
      <button onClick={() => onSubmit("EW_FAULT")}>removal-ew</button>
    </div>
  ),
}));

vi.mock("@/components/contract-wizard/StepVoidMatch", () => ({
  StepVoidMatch: ({ onSubmit }: { onSubmit: (cause: string) => void }) => (
    <div data-testid="step-void-match">
      <button onClick={() => onSubmit("SEATING_STANDARD")}>void-seating</button>
    </div>
  ),
}));

vi.mock("@/components/contract-wizard/StepLevel", () => ({
  StepLevel: ({
    onLevelSelected,
    onSpecialOutcome,
  }: {
    onLevelSelected: (l: number) => void;
    onSpecialOutcome: (o: string) => void;
  }) => (
    <div data-testid="step-level">
      <button onClick={() => onLevelSelected(3)}>level-3</button>
      <button onClick={() => onSpecialOutcome("PO")}>special-po</button>
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

vi.mock("@/components/contract-wizard/StepWeightedScore", () => ({
  StepWeightedScore: ({
    onSubmit,
  }: {
    onSubmit: (
      components: { contract: string; weight: number }[],
    ) => void;
  }) => (
    <div data-testid="step-weighted">
      <button
        onClick={() => onSubmit([{ contract: "3NTN=", weight: 100 }])}
      >
        weighted-submit
      </button>
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

  it("shows the header, sub-header and the adjustment-type hub first", () => {
    renderWizard();
    expect(screen.getByText("Adjust Result")).toBeInTheDocument();
    expect(screen.getByText("Club Night")).toBeInTheDocument();
    expect(screen.getByText("Table 4, Round 3")).toBeInTheDocument();
    expect(screen.getByText("Board 2")).toBeInTheDocument();
    expect(screen.getByTestId("step-hub")).toBeInTheDocument();
  });

  it("enters the contract flow (Level) from the hub", () => {
    renderWizard();
    fireEvent.click(screen.getByText("hub-contract"));
    expect(screen.getByText("Enter Contract")).toBeInTheDocument();
    expect(screen.getByTestId("step-level")).toBeInTheDocument();
  });

  it("renders the section subtitle when present", () => {
    gameOverrides = { sectionName: "Alpha" };
    renderWizard();
    expect(screen.getByText("Section Alpha")).toBeInTheDocument();
  });

  it("walks the full played-contract flow with a lead and submits", () => {
    const { onComplete } = renderWizard({ leadCardRequired: true });

    fireEvent.click(screen.getByText("hub-contract"));
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

    fireEvent.click(screen.getByText("hub-contract"));
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
    fireEvent.click(screen.getByText("hub-contract"));
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

  it("submits an adjusted score from the hub", () => {
    const { onComplete } = renderWizard();
    fireEvent.click(screen.getByText("hub-adjusted"));
    expect(screen.getByTestId("step-adjusted")).toBeInTheDocument();
    fireEvent.click(screen.getByText("adjusted-submit"));
    expect(onComplete).toHaveBeenCalledWith({
      type: "adjusted",
      nsPercent: 60,
      ewPercent: 40,
    });
  });

  it("submits a weighted score from the hub", () => {
    const { onComplete } = renderWizard();
    fireEvent.click(screen.getByText("hub-weighted"));
    expect(screen.getByTestId("step-weighted")).toBeInTheDocument();
    fireEvent.click(screen.getByText("weighted-submit"));
    expect(onComplete).toHaveBeenCalledWith({
      type: "weighted",
      components: [{ contract: "3NTN=", weight: 100 }],
    });
  });

  it("cancelling a board uses the same adjusted-score screen and emits a cancel result", () => {
    const { onComplete } = renderWizard();
    fireEvent.click(screen.getByText("hub-cancel"));
    // Same adjusted-score UI as the Adjusted Score branch.
    expect(screen.getByTestId("step-adjusted")).toBeInTheDocument();
    fireEvent.click(screen.getByText("adjusted-submit"));
    expect(onComplete).toHaveBeenCalledWith({
      type: "cancel",
      nsPercent: 60,
      ewPercent: 40,
    });
  });

  it("hides the teams-removal branch by default", () => {
    renderWizard();
    expect(screen.queryByText("hub-remove-teams")).not.toBeInTheDocument();
  });

  it("routes and submits a teams board removal when allowed", () => {
    const { onComplete } = renderWizard({ allowTeamsRulings: true });
    fireEvent.click(screen.getByText("hub-remove-teams"));
    expect(screen.getByTestId("step-teams-removal")).toBeInTheDocument();
    fireEvent.click(screen.getByText("removal-ew"));
    expect(onComplete).toHaveBeenCalledWith({
      type: "removeTeams",
      fault: "EW_FAULT",
    });
  });

  it("returns from the teams-removal step to the hub", () => {
    renderWizard({ allowTeamsRulings: true });
    fireEvent.click(screen.getByText("hub-remove-teams"));
    fireEvent.click(screen.getByLabelText("Go back"));
    expect(screen.getByTestId("step-hub")).toBeInTheDocument();
  });

  it("hides the void-match branch by default", () => {
    renderWizard();
    expect(screen.queryByText("hub-void-match")).not.toBeInTheDocument();
  });

  it("routes and submits a void match when allowed", () => {
    const { onComplete } = renderWizard({ allowTeamsRulings: true });
    fireEvent.click(screen.getByText("hub-void-match"));
    expect(screen.getByTestId("step-void-match")).toBeInTheDocument();
    fireEvent.click(screen.getByText("void-seating"));
    expect(onComplete).toHaveBeenCalledWith({
      type: "voidMatch",
      cause: "SEATING_STANDARD",
    });
  });

  it("returns from the void-match step to the hub", () => {
    renderWizard({ allowTeamsRulings: true });
    fireEvent.click(screen.getByText("hub-void-match"));
    fireEvent.click(screen.getByLabelText("Go back"));
    expect(screen.getByTestId("step-hub")).toBeInTheDocument();
  });

  it("hides the pairs-void branch by default", () => {
    renderWizard();
    expect(screen.queryByText("hub-void-pairs")).not.toBeInTheDocument();
  });

  it("routes and submits a pairs void when allowed", () => {
    const { onComplete } = renderWizard({ allowPairsVoid: true });
    fireEvent.click(screen.getByText("hub-void-pairs"));
    expect(screen.getByTestId("step-pairs-void")).toBeInTheDocument();
    fireEvent.click(screen.getByText("void-pairs-ew"));
    expect(onComplete).toHaveBeenCalledWith({
      type: "voidPairs",
      cause: "OFFENDER_EW",
    });
  });

  it("returns from the pairs-void step to the hub", () => {
    renderWizard({ allowPairsVoid: true });
    fireEvent.click(screen.getByText("hub-void-pairs"));
    fireEvent.click(screen.getByLabelText("Go back"));
    expect(screen.getByTestId("step-hub")).toBeInTheDocument();
  });

  it("navigates back through every step", () => {
    const { onBack } = renderWizard({ leadCardRequired: true });

    // Hub (step 0) back -> onBack
    fireEvent.click(screen.getByLabelText("Go back"));
    expect(onBack).toHaveBeenCalledTimes(1);

    // hub -> 1 (level), back -> hub
    fireEvent.click(screen.getByText("hub-contract"));
    fireEvent.click(screen.getByLabelText("Go back"));
    expect(screen.getByTestId("step-hub")).toBeInTheDocument();

    // hub -> 1 (level) -> 2 (suit), back -> 1 (level)
    fireEvent.click(screen.getByText("hub-contract"));
    fireEvent.click(screen.getByText("level-3"));
    fireEvent.click(screen.getByLabelText("Go back"));
    expect(screen.getByTestId("step-level")).toBeInTheDocument();

    // 1 -> 2 (suit) -> 3 (declarer), back -> 2 (suit)
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
    fireEvent.click(screen.getByText("hub-contract"));
    fireEvent.click(screen.getByText("level-3"));
    fireEvent.click(screen.getByText("suit-nt"));
    fireEvent.click(screen.getByText("declarer-n"));
    // step 5 (result); back -> step 3 (declarer)
    fireEvent.click(screen.getByLabelText("Go back"));
    expect(screen.getByTestId("step-declarer")).toBeInTheDocument();
  });

  it("returns from confirm to level for a special outcome", () => {
    renderWizard();
    fireEvent.click(screen.getByText("hub-contract"));
    fireEvent.click(screen.getByText("special-po"));
    // step 6 (confirm); back -> step 1 (level) because specialOutcome is set
    fireEvent.click(screen.getByLabelText("Go back"));
    expect(screen.getByTestId("step-level")).toBeInTheDocument();
  });

  it("returns from the adjusted-score step to the hub", () => {
    renderWizard();
    fireEvent.click(screen.getByText("hub-adjusted"));
    // step 7; back -> hub
    fireEvent.click(screen.getByLabelText("Go back"));
    expect(screen.getByTestId("step-hub")).toBeInTheDocument();
  });

  it("returns from the weighted-score step to the hub", () => {
    renderWizard();
    fireEvent.click(screen.getByText("hub-weighted"));
    fireEvent.click(screen.getByLabelText("Go back"));
    expect(screen.getByTestId("step-hub")).toBeInTheDocument();
  });

  it("returns from the cancel (adjusted-score) step to the hub", () => {
    renderWizard();
    fireEvent.click(screen.getByText("hub-cancel"));
    expect(screen.getByTestId("step-adjusted")).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Go back"));
    expect(screen.getByTestId("step-hub")).toBeInTheDocument();
  });
});
