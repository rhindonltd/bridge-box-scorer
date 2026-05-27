import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { EnterPairPlayerNamesPage } from "./EnterPairPlayerNamesPage";

const mockTableRoundPairBoardInfo = vi.fn();
const mockEnterPairPlayerNames = vi.fn();

vi.mock("@/components/common/SectionInfo", () => ({
  SectionInfo: () => <div data-testid="section-info" />,
}));

vi.mock("@/components/common/TableRoundPairBoardInfo", () => ({
  TableRoundPairBoardInfo: (props: unknown) => {
    mockTableRoundPairBoardInfo(props);

    return <div data-testid="table-round-board-info" />;
  },
}));

vi.mock("@/components/join/EnterPairPlayerNames", () => ({
  default: (props: unknown) => {
    mockEnterPairPlayerNames(props);

    return <div data-testid="enter-pair-player-names" />;
  },
}));

describe("EnterPairPlayerNamesPage", () => {
  const seat = {
    tableNumber: 4,
    direction: "south",
  };

  const onSubmitPair = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders all page sections", () => {
    render(
      <EnterPairPlayerNamesPage
        seat={seat as never}
        onSubmitPair={onSubmitPair}
      />,
    );

    expect(screen.getByTestId("section-info")).toBeInTheDocument();
    expect(screen.getByTestId("table-round-board-info")).toBeInTheDocument();
    expect(screen.getByTestId("enter-pair-player-names")).toBeInTheDocument();
  });

  it("passes table number to TableRoundPairBoardInfo", () => {
    render(
      <EnterPairPlayerNamesPage
        seat={seat as never}
        onSubmitPair={onSubmitPair}
      />,
    );

    expect(mockTableRoundPairBoardInfo).toHaveBeenCalledWith({
      table: 4,
    });
  });

  it("passes direction and submit callback to EnterPairPlayerNames", () => {
    render(
      <EnterPairPlayerNamesPage
        seat={seat as never}
        onSubmitPair={onSubmitPair}
      />,
    );

    expect(mockEnterPairPlayerNames).toHaveBeenCalledWith({
      direction: "south",
      onSubmitPair,
    });
  });

  it("passes the exact callback reference", () => {
    render(
      <EnterPairPlayerNamesPage
        seat={seat as never}
        onSubmitPair={onSubmitPair}
      />,
    );

    const props = mockEnterPairPlayerNames.mock.calls[0][0];

    expect(props.onSubmitPair).toBe(onSubmitPair);
  });

  it("renders correctly for another seat configuration", () => {
    render(
      <EnterPairPlayerNamesPage
        seat={
          {
            tableNumber: 11,
            direction: "west",
          } as never
        }
        onSubmitPair={onSubmitPair}
      />,
    );

    expect(mockTableRoundPairBoardInfo).toHaveBeenCalledWith({
      table: 11,
    });

    expect(mockEnterPairPlayerNames).toHaveBeenCalledWith({
      direction: "west",
      onSubmitPair,
    });
  });
});
