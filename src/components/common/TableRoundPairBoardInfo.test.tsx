import { render, screen } from "@testing-library/react";
import { TableRoundPairBoardInfo } from "./TableRoundPairBoardInfo";
import { describe, it, expect } from "vitest";

describe("TableRoundPairBoardInfo", () => {
  it("renders no visible content when no props are provided", () => {
    render(<TableRoundPairBoardInfo />);

    expect(screen.queryByText(/Pair/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Table/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Round/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Board/)).not.toBeInTheDocument();
  });

  it("renders pair when provided", () => {
    render(<TableRoundPairBoardInfo pair="12" />);

    expect(screen.getByText("Pair 12")).toBeInTheDocument();
  });

  it("renders table, round and board together", () => {
    render(<TableRoundPairBoardInfo table={5} round={2} board={10} />);

    expect(screen.getByText("Table 5")).toBeInTheDocument();
    expect(screen.getByText(", Round 2")).toBeInTheDocument();
    expect(screen.getByText(", Board 10")).toBeInTheDocument();
  });

  it("renders only table when only table is provided", () => {
    render(<TableRoundPairBoardInfo table={3} />);

    expect(screen.getByText("Table 3")).toBeInTheDocument();
    expect(screen.queryByText(/Round/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Board/)).not.toBeInTheDocument();
  });

  it("renders round without table (note leading comma)", () => {
    render(<TableRoundPairBoardInfo round={4} />);

    expect(screen.getByText(", Round 4")).toBeInTheDocument();
  });

  it("renders board without table or round (note leading comma)", () => {
    render(<TableRoundPairBoardInfo board={7} />);

    expect(screen.getByText(", Board 7")).toBeInTheDocument();
  });

  it("renders pair separately from table/round/board", () => {
    render(<TableRoundPairBoardInfo pair="9" table={1} round={2} />);

    expect(screen.getByText("Pair 9")).toBeInTheDocument();
    expect(screen.getByText("Table 1")).toBeInTheDocument();
    expect(screen.getByText(", Round 2")).toBeInTheDocument();
  });
});
