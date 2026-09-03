import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const mockOn = vi.fn();
const mockOff = vi.fn();
vi.mock("@/lib/socket", () => ({
  getSocket: () => ({ on: mockOn, off: mockOff }),
}));

vi.mock("@/context/GameContext", () => ({
  useRequiredGame: () => ({ game: { gameId: "g1", eventName: "Club Night" } }),
}));

const mockUseSections = vi.fn();
vi.mock("@/hooks/sections", () => ({
  useSections: (...args: unknown[]) => mockUseSections(...args),
}));

// Capture the SWR key the page requests so we can assert the section param.
const mockUseSWR = vi.fn();
vi.mock("swr", () => ({
  default: (...args: unknown[]) => mockUseSWR(...args),
}));

// Keep MovementDetailView simple: surface the table numbers it received.
vi.mock("@/components/movement/MovementDetailView", () => ({
  MovementDetailView: ({ tables }: { tables: { tableNumber: number }[] }) => (
    <div data-testid="detail">{tables.map((t) => t.tableNumber).join(",")}</div>
  ),
}));

import { ManageMovementPage } from "./ManageMovementPage";

const oneTable = { type: "PAIRS", tables: [{ tableNumber: 1, rounds: [] }] };

function section(letter: string) {
  return {
    section: letter,
    label: letter,
    tables: 5,
    ordinal: 0,
    selectedMovement: null,
  };
}

describe("ManageMovementPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSWR.mockReturnValue({
      data: oneTable,
      isLoading: false,
      mutate: vi.fn(),
    });
  });

  it("shows no section selector for a single-section game", () => {
    mockUseSections.mockReturnValue({ sections: [section("A")] });

    render(<ManageMovementPage backHref="/back" />);

    expect(screen.queryByText("Section A")).not.toBeInTheDocument();
    // Fetches section A's movement even though no selector is shown.
    expect(mockUseSWR).toHaveBeenCalledWith(
      "/api/games/g1/movement?section=A",
      expect.any(Function),
    );
    expect(screen.getByTestId("detail")).toBeInTheDocument();
  });

  it("shows a section pill per section for a multi-section game", () => {
    mockUseSections.mockReturnValue({
      sections: [section("A"), section("B")],
    });

    render(<ManageMovementPage backHref="/back" />);

    expect(screen.getByText("Section A")).toBeInTheDocument();
    expect(screen.getByText("Section B")).toBeInTheDocument();
    // Defaults to the first section (A).
    expect(mockUseSWR).toHaveBeenCalledWith(
      "/api/games/g1/movement?section=A",
      expect.any(Function),
    );
  });

  it("switches the fetched section when another pill is selected", () => {
    mockUseSections.mockReturnValue({
      sections: [section("A"), section("B")],
    });

    render(<ManageMovementPage backHref="/back" />);

    fireEvent.click(screen.getByText("Section B"));

    // Latest render requests section B.
    const lastKey = mockUseSWR.mock.calls.at(-1)?.[0];
    expect(lastKey).toBe("/api/games/g1/movement?section=B");
  });

  it("does not fetch until a section is known", () => {
    mockUseSections.mockReturnValue({ sections: [] });

    render(<ManageMovementPage backHref="/back" />);

    expect(mockUseSWR).toHaveBeenCalledWith(null, expect.any(Function));
  });
});
