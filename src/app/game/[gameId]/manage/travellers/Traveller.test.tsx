import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { Card, Rank } from "@/model/common";

vi.mock("@/components/layout/GamePageLayout", () => ({
  GamePageLayout: ({
    headerTitle,
    backAction,
    children,
  }: {
    headerTitle: string;
    backAction?: () => void;
    children: React.ReactNode;
  }) => (
    <div>
      {backAction && (
        <button aria-label="Back to board list" onClick={backAction}>
          Back
        </button>
      )}
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
    boardNumber: 5,
    participants: {
      type: "PAIRS",
      ns: "3",
      ew: "4",
      nsNames: "Alice & Bob",
      ewNames: "Carol & Dave",
    },
    currentResult: "3NTN=",
    status: "CONFIRMED",
    ...overrides,
  };
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
    expect(screen.getByText("Traveller - Board 5")).toBeInTheDocument();
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

  it("shows the board number in the header title in the loaded state", () => {
    render(
      <Traveller
        boardNumber={7}
        instances={[pairInstance({ boardNumber: 7 })]}
        isLoading={false}
        onLineSelected={vi.fn()}
        onBack={vi.fn()}
      />,
    );
    expect(screen.getByText("Traveller - Board 7")).toBeInTheDocument();
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
        ns: "1",
        ew: "2",
        nsNames: undefined,
        ewNames: undefined,
      },
      currentResult: null,
    });

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

  it("does not show the Show hand toggle when there is no deal", () => {
    render(
      <Traveller
        boardNumber={5}
        instances={[pairInstance()]}
        deal={null}
        isLoading={false}
        onLineSelected={vi.fn()}
        onBack={vi.fn()}
      />,
    );
    expect(screen.queryByTestId("show-hand-toggle")).not.toBeInTheDocument();
  });

  it("reveals the deal via the Show hand toggle when a deal is present", () => {
    const ranks: Rank[] = ["A", "K", "Q", "J", "T", "9", "8", "7", "6", "5", "4", "3", "2"];
    const deal = {
      N: ranks.map((r): Card => `S${r}`),
      E: ranks.map((r): Card => `H${r}`),
      S: ranks.map((r): Card => `D${r}`),
      W: ranks.map((r): Card => `C${r}`),
    };

    render(
      <Traveller
        boardNumber={5}
        instances={[pairInstance()]}
        deal={deal}
        isLoading={false}
        onLineSelected={vi.fn()}
        onBack={vi.fn()}
      />,
    );

    // Off by default.
    expect(screen.queryByTestId("deal-display")).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId("show-hand-toggle"));
    expect(screen.getByTestId("deal-display")).toBeInTheDocument();
  });

  it("renders team match cards and selects the tapped room's instance (teams)", () => {
    const onLineSelected = vi.fn();
    // Two rooms of one match: table 1 (home team Sharks) and table 2 (Owls).
    const room1 = pairInstance({
      roundNumber: 1,
      tableNumber: 1,
      boardNumber: 5,
      participants: { type: "PAIRS", ns: "A1NS", ew: "A2EW" },
      currentResult: "4HN=",
    });
    const room2 = pairInstance({
      roundNumber: 1,
      tableNumber: 2,
      boardNumber: 5,
      participants: { type: "PAIRS", ns: "A2NS", ew: "A1EW" },
      currentResult: "3NTN=",
    });
    const teamMatches = [
      {
        tables: [1, 2],
        teams: [
          { table: 1, id: "A1NS", name: "Sharks" },
          { table: 2, id: "A2NS", name: "Owls" },
        ],
        margin: 6,
      },
    ];

    render(
      <Traveller
        boardNumber={5}
        instances={[room1, room2]}
        teamMatches={teamMatches}
        isLoading={false}
        onLineSelected={onLineSelected}
        onBack={vi.fn()}
      />,
    );

    // The match card names both teams and shows the IMP margin.
    expect(screen.getByText("Sharks v Owls")).toBeInTheDocument();
    expect(screen.getByText("+6 IMP")).toBeInTheDocument();
    // Each physical table stays a selectable room row.
    fireEvent.click(screen.getByTestId("traveller-row-1-1"));
    expect(onLineSelected).toHaveBeenCalledWith(room1);
    fireEvent.click(screen.getByTestId("traveller-row-1-2"));
    expect(onLineSelected).toHaveBeenCalledWith(room2);
  });

  it("shows 'Tied' for a level team match and the IMP margin for a win", () => {
    const rooms = [
      pairInstance({ roundNumber: 1, tableNumber: 1, boardNumber: 5 }),
      pairInstance({ roundNumber: 1, tableNumber: 2, boardNumber: 5 }),
      pairInstance({ roundNumber: 1, tableNumber: 3, boardNumber: 5 }),
      pairInstance({ roundNumber: 1, tableNumber: 4, boardNumber: 5 }),
    ];
    // Two ordinary two-team cards: one level, one a +7 IMP win. (A triple also
    // frames each of its board-sets as an ordinary two-team card, so there is
    // no special "three-way" rendering any more.)
    const teamMatches = [
      {
        tables: [1, 2],
        teams: [
          { table: 1, id: "A1NS", name: "Sharks" },
          { table: 2, id: "A2NS", name: "Owls" },
        ],
        margin: 0,
      },
      {
        tables: [3, 4],
        teams: [
          { table: 3, id: "A3NS", name: "Robins" },
          { table: 4, id: "A4NS", name: "Hawks" },
        ],
        margin: 7,
      },
    ];

    render(
      <Traveller
        boardNumber={5}
        instances={rooms}
        teamMatches={teamMatches}
        isLoading={false}
        onLineSelected={vi.fn()}
        onBack={vi.fn()}
      />,
    );

    expect(screen.getByText("Tied")).toBeInTheDocument();
    expect(screen.getByText("+7 IMP")).toBeInTheDocument();
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
