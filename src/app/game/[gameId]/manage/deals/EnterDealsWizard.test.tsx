import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import type { Deal } from "@/model/common";

const mockEmitWithAck = vi.fn();

let swrState: { data: unknown; isLoading: boolean };
vi.mock("swr", () => ({
  default: () => ({ data: swrState.data, isLoading: swrState.isLoading }),
}));

vi.mock("@/lib/fetcher", () => ({ fetcher: vi.fn() }));
vi.mock("@/swr/swr-keys", () => ({
  swrKeys: { boards: (id: string) => `/api/games/${id}/boards` },
}));

vi.mock("@/context/GameContext", () => ({
  useRequiredGame: () => ({ game: { gameId: "g1" } }),
}));

vi.mock("@/lib/socket", () => ({
  emitWithAck: (...args: unknown[]) => mockEmitWithAck(...args),
}));

vi.mock("@/lib/director-token", () => ({
  getDirectorToken: () => "dir-tok",
}));

// GamePageLayout is stubbed to expose the back action as a button so the
// deal-entry step's onBack (return to board select) can be exercised.
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
      <h1>{headerTitle}</h1>
      {backAction && <button onClick={backAction}>back-action</button>}
      {children}
    </div>
  ),
}));

vi.mock("@/app/game/[gameId]/manage/travellers/SelectBoardPage", () => ({
  SelectBoardPage: ({
    boards,
    onBoardSelected,
  }: {
    boards: number[];
    onBoardSelected: (n: number) => void;
  }) => (
    <div>
      <span data-testid="boards">{boards.join(",")}</span>
      <button onClick={() => onBoardSelected(3)}>pick-board</button>
    </div>
  ),
}));

const existingDeal: Deal = {
  N: ["SA"],
  E: [],
  S: [],
  W: [],
};

let mockTravellerLoading = false;
vi.mock("@/context/TravellerContext", () => ({
  TravellerProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="traveller-provider">{children}</div>
  ),
  useTravellerContext: () => ({
    instances: [],
    deal: existingDeal,
    isLoading: mockTravellerLoading,
  }),
}));

// Stub DealEntry to expose the board, whether it was prefilled, and a save.
vi.mock("@/components/deal/DealEntry", () => ({
  DealEntry: ({
    boardNumber,
    initialDeal,
    onSubmit,
  }: {
    boardNumber: number;
    initialDeal: Deal | null;
    onSubmit: (deal: Deal) => void;
  }) => (
    <div>
      <span data-testid="entry-board">{boardNumber}</span>
      <span data-testid="entry-prefilled">{String(initialDeal !== null)}</span>
      <button onClick={() => onSubmit({ N: [], E: [], S: [], W: [] } as Deal)}>
        save-deal
      </button>
    </div>
  ),
}));

import { EnterDealsWizard } from "./EnterDealsWizard";
import { SocketEvents } from "@/socket/socket-events";

describe("EnterDealsWizard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    swrState = { data: { boards: [1, 2, 3] }, isLoading: false };
    mockEmitWithAck.mockResolvedValue(null);
    mockTravellerLoading = false;
  });

  it("shows the fetched boards on the select step", () => {
    render(<EnterDealsWizard onDealSaved={vi.fn()} />);
    expect(screen.getByTestId("boards").textContent).toBe("1,2,3");
  });

  it("shows an empty board list before the fetch resolves", () => {
    swrState = { data: undefined, isLoading: true };
    render(<EnterDealsWizard onDealSaved={vi.fn()} />);
    // `boardsData?.boards ?? []` yields no boards yet.
    expect(screen.getByTestId("boards").textContent).toBe("");
  });

  it("opens the deal-entry step for the chosen board, prefilled with the existing deal", () => {
    render(<EnterDealsWizard onDealSaved={vi.fn()} />);
    fireEvent.click(screen.getByText("pick-board"));

    expect(screen.getByTestId("traveller-provider")).toBeInTheDocument();
    expect(screen.getByTestId("entry-board").textContent).toBe("3");
    expect(screen.getByTestId("entry-prefilled").textContent).toBe("true");
  });

  it("emits DEAL_OVERRIDE with the director token and calls onDealSaved", async () => {
    const onDealSaved = vi.fn();
    render(<EnterDealsWizard onDealSaved={onDealSaved} />);
    fireEvent.click(screen.getByText("pick-board"));
    fireEvent.click(screen.getByText("save-deal"));

    await waitFor(() => expect(mockEmitWithAck).toHaveBeenCalled());
    expect(mockEmitWithAck).toHaveBeenCalledWith(
      SocketEvents.DEAL_OVERRIDE,
      expect.objectContaining({
        gameId: "g1",
        directorToken: "dir-tok",
        boardNumber: 3,
      }),
    );
    await waitFor(() => expect(onDealSaved).toHaveBeenCalled());
  });

  it("shows an error banner and returns to board select when saving fails", async () => {
    mockEmitWithAck.mockRejectedValue(new Error("boom"));
    render(<EnterDealsWizard onDealSaved={vi.fn()} />);
    fireEvent.click(screen.getByText("pick-board"));
    fireEvent.click(screen.getByText("save-deal"));

    expect(await screen.findByText("boom")).toBeInTheDocument();
    expect(screen.getByTestId("boards")).toBeInTheDocument();
  });

  it("returns to board select via the deal-entry back action", () => {
    render(<EnterDealsWizard onDealSaved={vi.fn()} />);
    fireEvent.click(screen.getByText("pick-board"));
    expect(screen.getByTestId("entry-board")).toBeInTheDocument();

    fireEvent.click(screen.getByText("back-action"));
    // Back on the board-select step: the entry grid is gone, boards are shown.
    expect(screen.queryByTestId("entry-board")).not.toBeInTheDocument();
    expect(screen.getByTestId("boards")).toBeInTheDocument();
  });

  it("uses a generic error message when saving rejects with a non-Error", async () => {
    mockEmitWithAck.mockRejectedValue("nope");
    render(<EnterDealsWizard onDealSaved={vi.fn()} />);
    fireEvent.click(screen.getByText("pick-board"));
    fireEvent.click(screen.getByText("save-deal"));

    expect(
      await screen.findByText("Failed to save the deal"),
    ).toBeInTheDocument();
  });

  it("shows a spinner while the board's existing deal loads", () => {
    mockTravellerLoading = true;
    const { container } = render(<EnterDealsWizard onDealSaved={vi.fn()} />);
    fireEvent.click(screen.getByText("pick-board"));

    // The deal-entry grid isn't shown yet; a spinner is rendered in its place.
    expect(screen.queryByTestId("entry-board")).not.toBeInTheDocument();
    expect(container.querySelector(".animate-spin")).toBeTruthy();
  });
});
