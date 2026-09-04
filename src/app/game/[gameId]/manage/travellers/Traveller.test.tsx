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

vi.mock("@/components/traveller/BoardResult", () => ({
  BoardResult: ({ boardOutcome }: { boardOutcome: unknown }) => (
    <span data-testid="contract">{JSON.stringify(boardOutcome)}</span>
  ),
}));

import { Traveller } from "./Traveller";
import type { BoardInstance } from "@/model/participants";

function pairInstance(overrides: Partial<BoardInstance> = {}): BoardInstance {
  return {
    roundNumber: 1,
    tableNumber: 2,
    participants: {
      type: "PAIRS",
      ns: 3,
      ew: 4,
      nsNames: "Alice & Bob",
      ewNames: "Carol & Dave",
    },
    currentResult: { level: 3, suit: "NT" },
    ...(overrides as object),
  } as BoardInstance;
}

describe("Traveller", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows a loading state", () => {
    const { container } = render(
      <Traveller
        boardNumber={5}
        instances={[]}
        isLoading
        onLineSelected={vi.fn()}
        onBack={vi.fn()}
      />,
    );
    expect(container.querySelector(".animate-spin")).toBeTruthy();
    expect(screen.getByText("Board 5")).toBeInTheDocument();
  });

  it("fires onBack from the loading header", () => {
    const onBack = vi.fn();
    render(
      <Traveller
        boardNumber={5}
        instances={[]}
        isLoading
        onLineSelected={vi.fn()}
        onBack={onBack}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Back to board list" }));
    expect(onBack).toHaveBeenCalled();
  });

  it("shows an empty message when there are no results", () => {
    render(
      <Traveller
        boardNumber={5}
        instances={[]}
        isLoading={false}
        onLineSelected={vi.fn()}
        onBack={vi.fn()}
      />,
    );
    expect(
      screen.getByText("No results for this board yet"),
    ).toBeInTheDocument();
  });

  it("renders a pair row with names and a contract, and selects on click", () => {
    const onLineSelected = vi.fn();
    const instance = pairInstance();
    render(
      <Traveller
        boardNumber={5}
        instances={[instance]}
        isLoading={false}
        onLineSelected={onLineSelected}
        onBack={vi.fn()}
      />,
    );

    expect(screen.getByText("Alice & Bob")).toBeInTheDocument();
    expect(screen.getByText("Carol & Dave")).toBeInTheDocument();
    expect(screen.getByTestId("contract")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("traveller-row-1-2"));
    expect(onLineSelected).toHaveBeenCalledWith(instance);
  });

  it("renders a pair row without names and a dash when there is no result", () => {
    const instance = pairInstance({
      participants: {
        type: "PAIRS",
        ns: 1,
        ew: 2,
        nsNames: undefined,
        ewNames: undefined,
      },
      currentResult: null,
    } as Partial<BoardInstance>);

    render(
      <Traveller
        boardNumber={7}
        instances={[instance]}
        isLoading={false}
        onLineSelected={vi.fn()}
        onBack={vi.fn()}
      />,
    );

    expect(screen.queryByTestId("contract")).not.toBeInTheDocument();
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("omits pair cells for a non-pairs instance", () => {
    const instance = {
      roundNumber: 2,
      tableNumber: 3,
      participants: { type: "INDIVIDUAL" },
      currentResult: null,
    } as unknown as BoardInstance;

    render(
      <Traveller
        boardNumber={9}
        instances={[instance]}
        isLoading={false}
        onLineSelected={vi.fn()}
        onBack={vi.fn()}
      />,
    );

    // Row is present but has no NS/EW pair cells (only the contract dash cell).
    expect(screen.getByTestId("traveller-row-2-3")).toBeInTheDocument();
    expect(screen.getByText("—")).toBeInTheDocument();
  });
});
