import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SocketEvents } from "@/socket/socket-events";

const mockOn = vi.fn();
const mockOff = vi.fn();
vi.mock("@/lib/socket", () => ({
  getSocket: () => ({ on: mockOn, off: mockOff }),
}));

const mockFetcher = vi.fn();
vi.mock("@/lib/fetcher", () => ({
  fetcher: (...args: unknown[]) => mockFetcher(...args),
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
    mockFetcher.mockResolvedValue({ movement: oneTable });
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

  it("renders a loading spinner while movement data loads", () => {
    mockUseSections.mockReturnValue({ sections: [section("A")] });
    mockUseSWR.mockReturnValue({
      data: undefined,
      isLoading: true,
      mutate: vi.fn(),
    });

    const { container } = render(<ManageMovementPage backHref="/back" />);
    expect(container.querySelector(".animate-spin")).toBeTruthy();
  });

  it("renders an empty state when no movement is set up", () => {
    mockUseSections.mockReturnValue({ sections: [section("A")] });
    mockUseSWR.mockReturnValue({
      data: { type: "PAIRS", tables: [] },
      isLoading: false,
      mutate: vi.fn(),
    });

    render(<ManageMovementPage backHref="/back" />);
    expect(screen.getByText("No movement set up yet.")).toBeInTheDocument();
  });

  it("unwraps the movement payload in the SWR fetcher", async () => {
    mockUseSections.mockReturnValue({ sections: [section("A")] });
    render(<ManageMovementPage backHref="/back" />);

    // The second arg passed to useSWR is the movementFetcher; invoke it with a
    // stubbed low-level fetcher response to exercise its unwrap logic.
    const passedFetcher = mockUseSWR.mock.calls.at(-1)?.[1] as (
      url: string,
    ) => Promise<unknown>;

    // fetcher is mocked to resolve { movement }.
    const result = await passedFetcher("/api/games/g1/movement?section=A");
    expect(result).toEqual(oneTable);
    expect(mockFetcher).toHaveBeenCalledWith(
      "/api/games/g1/movement?section=A",
    );
  });

  it("re-fetches on the board-result-updated socket event", () => {
    mockUseSections.mockReturnValue({ sections: [section("A")] });
    const mutate = vi.fn();
    mockUseSWR.mockReturnValue({
      data: oneTable,
      isLoading: false,
      mutate,
    });

    render(<ManageMovementPage backHref="/back" />);

    // The effect registered a BOARD_RESULT_UPDATED handler; invoke it.
    const call = mockOn.mock.calls.find(
      (c) => c[0] === SocketEvents.BOARD_RESULT_UPDATED,
    );
    expect(call).toBeTruthy();
    call![1]();
    expect(mutate).toHaveBeenCalled();
  });
});
