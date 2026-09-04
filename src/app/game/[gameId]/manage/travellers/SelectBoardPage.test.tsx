import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("@/components/layout/GamePageLayout", () => ({
  GamePageLayout: ({
    headerTitle,
    children,
  }: {
    headerTitle: string;
    children: React.ReactNode;
  }) => (
    <div>
      <h1>{headerTitle}</h1>
      {children}
    </div>
  ),
}));

import { SelectBoardPage } from "./SelectBoardPage";

describe("SelectBoardPage", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows a spinner while loading", () => {
    const { container } = render(
      <SelectBoardPage boards={[]} isLoading onBoardSelected={vi.fn()} />,
    );
    expect(container.querySelector(".animate-spin")).toBeTruthy();
  });

  it("shows an empty state when no boards exist", () => {
    render(
      <SelectBoardPage
        boards={[]}
        isLoading={false}
        onBoardSelected={vi.fn()}
      />,
    );
    expect(screen.getByText("No boards found")).toBeInTheDocument();
  });

  it("renders a button per board and reports selection", () => {
    const onBoardSelected = vi.fn();
    render(
      <SelectBoardPage
        boards={[1, 2, 3]}
        isLoading={false}
        onBoardSelected={onBoardSelected}
      />,
    );

    expect(screen.getByTestId("select-board-1")).toBeInTheDocument();
    expect(screen.getByTestId("select-board-3")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("select-board-2"));
    expect(onBoardSelected).toHaveBeenCalledWith(2);
  });
});
