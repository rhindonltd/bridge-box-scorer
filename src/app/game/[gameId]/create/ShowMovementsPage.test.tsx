import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PairMovementSpec } from "@/db/movements/schema";

// ---- mocks ----

let mockGame: { gameId: string; tables: number; gameType: string };

vi.mock("@/context/GameContext", () => ({
  useRequiredGame: () => ({
    game: mockGame,
    mutateGame: vi.fn(),
  }),
}));

// SWR: return pairMovements for the pairs endpoint, empty otherwise. The key is
// the first argument passed to useSWR.
let mockPairMovements: PairMovementSpec[] = [];
vi.mock("swr", () => ({
  default: (key: string | null) => {
    if (typeof key === "string" && key.includes("/api/movements/pairs/")) {
      return { data: mockPairMovements };
    }
    return { data: [] };
  },
}));

const mockSelectMovement = vi.fn();
const mockSelectMitchellMovement = vi.fn();
vi.mock("@/lib/game-service", () => ({
  selectMovement: (...args: unknown[]) => mockSelectMovement(...args),
  selectMitchellMovement: (...args: unknown[]) =>
    mockSelectMitchellMovement(...args),
}));

vi.mock("@/lib/fetcher", () => ({ fetcher: vi.fn() }));

import { ShowMovementsPage } from "./ShowMovementsPage";

describe("ShowMovementsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPairMovements = [];
    mockGame = { gameId: "g1", tables: 7, gameType: "PAIRS" };
  });

  it("shows the Recommended Movements section for a pairs game", () => {
    render(<ShowMovementsPage onShowTablesPage={vi.fn()} />);
    expect(screen.getByText("Recommended Movements")).toBeInTheDocument();
  });

  it("does not render the old Generated / Pairs Movements sections or a boards-per-round stepper", () => {
    render(<ShowMovementsPage onShowTablesPage={vi.fn()} />);
    expect(screen.queryByText("Generated Movements")).not.toBeInTheDocument();
    expect(screen.queryByText("Pairs Movements")).not.toBeInTheDocument();
    expect(screen.queryByText("Boards per round:")).not.toBeInTheDocument();
  });

  it("orders recommended cards by boards a pair plays (descending)", () => {
    // 7 tables: HOWELL (26, from DB spec) then MITCHELL (28, generated 7x4).
    // The generated Mitchell (28) should sort above the Howell (26).
    mockPairMovements = [
      {
        id: 1,
        name: "7 Table Howell",
        type: "2",
        tables: 7,
        boards: 26,
        boardsPerRound: 2,
        rounds: 13,
        missingPair: null,
      },
    ];

    render(<ShowMovementsPage onShowTablesPage={vi.fn()} />);

    const boardsCells = screen.getAllByText("Boards a Pair Plays");
    // Read the numeric value rendered next to each stat label's sibling.
    const values = boardsCells.map(
      (el) => el.nextElementSibling?.textContent ?? "",
    );
    const numbers = values.map(Number);
    const sortedDesc = [...numbers].sort((a, b) => b - a);
    expect(numbers).toEqual(sortedDesc);
  });

  it("selecting a generated recommendation opens the movement detail view", async () => {
    render(<ShowMovementsPage onShowTablesPage={vi.fn()} />);

    // The first recommended card for 7 tables resolves to a generated Mitchell.
    const firstCard = screen.getByRole("button", { name: /Standard Mitchell/ });
    fireEvent.click(firstCard);

    // Detail view shows a "Use Movement" action button.
    expect(
      await screen.findByRole("button", { name: "Use Movement" }),
    ).toBeInTheDocument();
  });

  it("shows an empty-state message when no recommendations map to the table count", () => {
    // 1 table has no curated entries and no generated options.
    mockGame = { gameId: "g1", tables: 1, gameType: "PAIRS" };
    render(<ShowMovementsPage onShowTablesPage={vi.fn()} />);

    expect(screen.getByText("Recommended Movements")).toBeInTheDocument();
    expect(
      screen.getByText(
        "No recommended movements are available for this table count yet.",
      ),
    ).toBeInTheDocument();
  });

  it("shows the Teams movements fallback for a teams game", () => {
    mockGame = { gameId: "g1", tables: 4, gameType: "TEAMS" };
    render(<ShowMovementsPage onShowTablesPage={vi.fn()} />);
    expect(screen.getByText("Teams Movements")).toBeInTheDocument();
    expect(screen.queryByText("Recommended Movements")).not.toBeInTheDocument();
  });
});
