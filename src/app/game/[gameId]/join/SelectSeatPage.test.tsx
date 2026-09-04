import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SelectSeatPage } from "@/app/game/[gameId]/join/SelectSeatPage";
import { swrKeys } from "@/swr/swr-keys";

const mockUseSWR = vi.fn();
vi.mock("swr", () => ({
  default: (...args: unknown[]) => mockUseSWR(...args),
}));

vi.mock("@/context/GameContext", () => ({
  useRequiredGame: () => ({ game: { gameId: "g1" }, mutateGame: vi.fn() }),
}));

const mockUseSections = vi.fn();
vi.mock("@/hooks/sections", () => ({
  useSections: (...args: unknown[]) => mockUseSections(...args),
}));

const mockUseSocketSWRSync = vi.fn();
vi.mock("@/hooks/socket-swr-sync", () => ({
  useSocketSWRSync: (...args: unknown[]) => mockUseSocketSWRSync(...args),
}));

vi.mock("@/lib/fetcher", () => ({ fetcher: vi.fn() }));

const mockCreateParticipant = vi.fn();
vi.mock("@/lib/game-service", () => ({
  createParticipant: (...args: unknown[]) => mockCreateParticipant(...args),
}));

vi.mock("@/components/layout/GamePageLayout", () => ({
  GamePageLayout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="layout">{children}</div>
  ),
}));

// SelectTable stub: exposes a button that selects seat A1NS.
vi.mock("@/app/game/[gameId]/join/SelectTable", () => ({
  default: ({
    onSeatSelected,
    startingPositions,
  }: {
    onSeatSelected: (seat: string) => void;
    startingPositions: unknown[];
  }) => (
    <div>
      <div data-testid="starting-count">{startingPositions.length}</div>
      <button data-testid="pick-seat" onClick={() => onSeatSelected("A1NS")}>
        pick
      </button>
    </div>
  ),
}));

// EnterPlayerNames stub: exposes a submit button that emits two players.
vi.mock("@/app/game/[gameId]/join/EnterPlayerNames", () => ({
  default: ({
    seat,
    onSubmitPair,
  }: {
    seat: string;
    onSubmitPair: (p1: unknown, p2: unknown) => void;
  }) => (
    <div>
      <div data-testid="sheet-seat">{seat}</div>
      <button
        data-testid="submit-pair"
        onClick={() =>
          onSubmitPair({ firstName: "A" }, { firstName: "B" })
        }
      >
        submit
      </button>
    </div>
  ),
}));

describe("SelectSeatPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSWR.mockReturnValue({ data: undefined });
    mockUseSections.mockReturnValue({ sections: [] });
    mockCreateParticipant.mockResolvedValue(undefined);
  });

  it("fetches pairs with the pairs key and passes startingPositions through", () => {
    mockUseSWR.mockReturnValue({ data: [{ initialSeat: "A1EW" }] });
    render(<SelectSeatPage onSeatSelected={vi.fn()} />);

    expect(mockUseSWR).toHaveBeenCalledWith(
      swrKeys.pairs("g1"),
      expect.any(Function),
    );
    expect(screen.getByTestId("starting-count")).toHaveTextContent("1");
  });

  it("defaults startingPositions to an empty array when no data", () => {
    render(<SelectSeatPage onSeatSelected={vi.fn()} />);
    expect(screen.getByTestId("starting-count")).toHaveTextContent("0");
  });

  it("opens the bottom sheet when a seat is selected", () => {
    render(<SelectSeatPage onSeatSelected={vi.fn()} />);
    // Sheet hidden initially: no EnterPlayerNames rendered.
    expect(screen.queryByTestId("sheet-seat")).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId("pick-seat"));
    expect(screen.getByTestId("sheet-seat")).toHaveTextContent("A1NS");
  });

  it("closes the sheet when the backdrop is clicked", () => {
    const { container } = render(<SelectSeatPage onSeatSelected={vi.fn()} />);
    fireEvent.click(screen.getByTestId("pick-seat"));
    expect(screen.getByTestId("sheet-seat")).toBeInTheDocument();

    const backdrop = container.querySelector(".bg-black\\/30") as HTMLElement;
    expect(backdrop).toBeInTheDocument();
    fireEvent.click(backdrop);
    expect(screen.queryByTestId("sheet-seat")).not.toBeInTheDocument();
  });

  it("creates a participant and calls onSeatSelected on pair submit", async () => {
    const onSeatSelected = vi.fn();
    render(<SelectSeatPage onSeatSelected={onSeatSelected} />);

    fireEvent.click(screen.getByTestId("pick-seat"));
    fireEvent.click(screen.getByTestId("submit-pair"));

    await waitFor(() =>
      expect(mockCreateParticipant).toHaveBeenCalledWith("g1", {
        type: "PAIR",
        initialSeat: "A1NS",
        player1: { firstName: "A" },
        player2: { firstName: "B" },
      }),
    );
    await waitFor(() => expect(onSeatSelected).toHaveBeenCalledWith("A1NS"));
  });

  it("wires up the participants socket->SWR sync", () => {
    render(<SelectSeatPage onSeatSelected={vi.fn()} />);
    expect(mockUseSocketSWRSync).toHaveBeenCalled();
    // The mapper argument should build the pairs key + participants data.
    const mapper = mockUseSocketSWRSync.mock.calls[0][1] as (p: {
      participants: unknown;
    }) => { key: string; data: unknown };
    expect(mapper({ participants: [1, 2] })).toEqual({
      key: swrKeys.pairs("g1"),
      data: [1, 2],
    });
  });

  it("uses the pairs fetcher to unwrap the { pairs } response", async () => {
    render(<SelectSeatPage onSeatSelected={vi.fn()} />);
    const fetcherArg = mockUseSWR.mock.calls[0][1] as (
      url: string,
    ) => Promise<unknown>;
    const { fetcher } = await import("@/lib/fetcher");
    (fetcher as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      pairs: [{ initialSeat: "A1NS" }],
    });
    await expect(fetcherArg("/x")).resolves.toEqual([
      { initialSeat: "A1NS" },
    ]);
  });
});
