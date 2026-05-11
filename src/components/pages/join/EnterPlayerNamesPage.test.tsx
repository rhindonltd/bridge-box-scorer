import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { EnterPlayerNamesPage } from "./EnterPlayerNamesPage";

// Mock dependencies to isolate page behavior
vi.mock("@/components/common/SectionInfo", () => ({
  SectionInfo: () => <div data-testid="section-info" />,
}));

vi.mock("@/components/common/TableRoundPairBoardInfo", () => ({
  TableRoundPairBoardInfo: ({ table }: any) => (
    <div data-testid="table-info">Table {table}</div>
  ),
}));

vi.mock("@/components/join/EnterPlayerNames", () => ({
  default: ({ direction }: any) => (
    <div data-testid="enter-player-names">Direction: {direction}</div>
  ),
}));

describe("EnterPlayerNamesPage", () => {
  const baseProps = {
    table: 3,
    direction: "NS" as const,
    submitPlayerNames: vi.fn(),
  };

  it("renders SectionInfo", () => {
    render(<EnterPlayerNamesPage {...baseProps} />);

    expect(screen.getByTestId("section-info")).toBeInTheDocument();
  });

  it("renders table info with correct table number", () => {
    render(<EnterPlayerNamesPage {...baseProps} />);

    expect(screen.getByText("Table 3")).toBeInTheDocument();
  });

  it("renders EnterPlayerNames component", () => {
    render(<EnterPlayerNamesPage {...baseProps} />);

    expect(screen.getByTestId("enter-player-names")).toBeInTheDocument();
  });

  it("passes direction to EnterPlayerNames", () => {
    render(<EnterPlayerNamesPage {...baseProps} direction="EW" />);

    expect(screen.getByText("Direction: EW")).toBeInTheDocument();
  });

  it("applies page layout classes", () => {
    const { container } = render(<EnterPlayerNamesPage {...baseProps} />);

    const root = container.firstChild as HTMLElement;

    expect(root).toHaveClass("h-screen", "flex", "flex-col", "bg-gray-100");
  });

  it("wraps main content in center container", () => {
    const { container } = render(<EnterPlayerNamesPage {...baseProps} />);

    const main = screen.getByTestId("enter-player-names").parentElement;

    expect(main).toHaveClass(
      "flex-1",
      "flex",
      "items-center",
      "justify-center",
      "p-2",
      "min-h-0",
    );
  });
});
