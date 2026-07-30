import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import EnterContractPage from "./EnterContractPage";

const selectBoardMock = vi.fn();

vi.mock("@/context/PlayContext", () => ({
  usePlay: () => ({
    boardSelection: { board: 1 },
    selectBoard: selectBoardMock,
  }),
}));

vi.mock("@/context/GameContext", () => ({
  useGame: () => ({
    game: { eventName: "Test Pairs", gameId: "g1", gameType: "PAIRS", tables: 4 },
  }),
}));

vi.mock("@/context/AssignmentContext", () => ({
  useAssignment: () => ({
    assignment: { type: "PAIR", id: "1" },
  }),
}));

vi.mock("@/components/pages/play/PlayableContract", () => ({
  PlayableContract: (props: any) => (
    <div data-testid="playable">
      <button onClick={() => props.onLevelSelected("1")}>level</button>
      <button onClick={() => props.onSuitSelected("S")}>suit</button>
      <button onClick={() => props.onDeclarerSelected("N")}>declarer</button>
      <button onClick={() => props.onDblSelected("X")}>dbl</button>
    </div>
  ),
}));

vi.mock("@/components/contract/SubmitButton", () => ({
  default: ({ onSubmit }: any) => <button onClick={onSubmit}>Submit</button>,
}));

vi.mock("@/components/contract/PassOutButton", () => ({
  default: ({ onPassOut }: any) => <button onClick={onPassOut}>PassOut</button>,
}));

vi.mock("@/components/contract/NotPlayedButton", () => ({
  default: ({ onNotPlayed }: any) => (
    <button onClick={onNotPlayed}>NotPlayed</button>
  ),
}));

describe("EnterContractPage", () => {
  const onOk = vi.fn();

  const baseProps = {
    round: 1,
    table: 1,
    roundBoards: [1, 2, 3],
    onOk,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders layout components", () => {
    render(<EnterContractPage {...baseProps} />);
    expect(screen.getByText("Test Pairs")).toBeInTheDocument();
    expect(screen.getByText(/Table 1/)).toBeInTheDocument();
    expect(screen.getByTestId("playable")).toBeInTheDocument();
  });

  it("calls selectBoard when dropdown changes", () => {
    render(<EnterContractPage {...baseProps} />);
    fireEvent.change(screen.getByDisplayValue("1"), {
      target: { value: "2" },
    });
    expect(selectBoardMock).toHaveBeenCalledWith(2);
  });

  it("handles Pass Out", () => {
    render(<EnterContractPage {...baseProps} />);
    fireEvent.click(screen.getByText("PassOut"));
    fireEvent.click(screen.getByText("Submit"));
    expect(onOk).toHaveBeenCalledWith("PO");
  });

  it("handles Not Played", () => {
    render(<EnterContractPage {...baseProps} />);
    fireEvent.click(screen.getByText("NotPlayed"));
    fireEvent.click(screen.getByText("Submit"));
    expect(onOk).toHaveBeenCalledWith("NP");
  });

  it("builds contract when all fields selected", () => {
    render(<EnterContractPage {...baseProps} />);
    fireEvent.click(screen.getByText("level"));
    fireEvent.click(screen.getByText("suit"));
    fireEvent.click(screen.getByText("declarer"));
    fireEvent.click(screen.getByText("dbl"));
    fireEvent.click(screen.getByText("Submit"));
    expect(onOk).toHaveBeenCalledWith("1SXN");
  });

  it("resets state when PassOut is clicked", () => {
    render(<EnterContractPage {...baseProps} />);
    fireEvent.click(screen.getByText("PassOut"));
    fireEvent.click(screen.getByText("Submit"));
    expect(onOk).toHaveBeenCalledWith("PO");
  });

  it("renders board selector options", () => {
    render(<EnterContractPage {...baseProps} />);
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });
});
