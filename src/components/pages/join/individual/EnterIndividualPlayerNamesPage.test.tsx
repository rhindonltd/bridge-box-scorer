import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { EnterIndividualPlayerNamesPage } from "./EnterIndividualPlayerNamesPage";

const mockTableRoundPairBoardInfo = vi.fn();
const mockEnterIndividualPlayerNames = vi.fn();

vi.mock("@/components/common/SectionInfo", () => ({
  SectionInfo: () => <div data-testid="section-info" />,
}));

vi.mock("@/components/common/TableRoundPairBoardInfo", () => ({
  TableRoundPairBoardInfo: (props: unknown) => {
    mockTableRoundPairBoardInfo(props);

    return <div data-testid="table-round-board-info" />;
  },
}));

vi.mock("@/components/join/EnterIndividualPlayerNames", () => ({
  default: (props: unknown) => {
    mockEnterIndividualPlayerNames(props);

    return <div data-testid="enter-player-names" />;
  },
}));

describe("EnterIndividualPlayerNamesPage", () => {
  const seat = {
    tableNumber: 7,
    direction: "north",
  };

  const onSubmitPlayer = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders all child sections", () => {
    render(
      <EnterIndividualPlayerNamesPage
        seat={seat as never}
        onSubmitPlayer={onSubmitPlayer}
      />,
    );

    expect(screen.getByTestId("section-info")).toBeInTheDocument();
    expect(screen.getByTestId("table-round-board-info")).toBeInTheDocument();
    expect(screen.getByTestId("enter-player-names")).toBeInTheDocument();
  });

  it("passes table number to TableRoundPairBoardInfo", () => {
    render(
      <EnterIndividualPlayerNamesPage
        seat={seat as never}
        onSubmitPlayer={onSubmitPlayer}
      />,
    );

    expect(mockTableRoundPairBoardInfo).toHaveBeenCalledWith({
      table: 7,
    });
  });

  it("passes direction and submit callback to EnterIndividualPlayerNames", () => {
    render(
      <EnterIndividualPlayerNamesPage
        seat={seat as never}
        onSubmitPlayer={onSubmitPlayer}
      />,
    );

    expect(mockEnterIndividualPlayerNames).toHaveBeenCalledWith({
      direction: "north",
      onSubmitPlayer,
    });
  });

  it("passes the exact callback reference", () => {
    render(
      <EnterIndividualPlayerNamesPage
        seat={seat as never}
        onSubmitPlayer={onSubmitPlayer}
      />,
    );

    const props = mockEnterIndividualPlayerNames.mock.calls[0][0];

    expect(props.onSubmitPlayer).toBe(onSubmitPlayer);
  });

  it("renders correctly for different seat values", () => {
    render(
      <EnterIndividualPlayerNamesPage
        seat={
          {
            tableNumber: 12,
            direction: "east",
          } as never
        }
        onSubmitPlayer={onSubmitPlayer}
      />,
    );

    expect(mockTableRoundPairBoardInfo).toHaveBeenCalledWith({
      table: 12,
    });

    expect(mockEnterIndividualPlayerNames).toHaveBeenCalledWith({
      direction: "east",
      onSubmitPlayer,
    });
  });
});
