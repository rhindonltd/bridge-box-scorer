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
  N: ["AS"],
  E: [],
  S: [],
  W: [],
};

vi.mock("@/context/TravellerContext", () => ({
  TravellerProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="traveller-provider">{children}</div>
  ),
  useTravellerContext: () => ({
    instances: [],
    deal: existingDeal,
    isLoading: false,
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
      <button
        onClick={() =>
          onSubmit({ N: [], E: [], S: [], W: [] } as Deal)
        }
      >
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
  });

  it("shows the fetched boards on the select step", () => {
    render(<EnterDealsWizard onDealSaved={vi.fn()} />);
    expect(screen.getByTestId("boards").textContent).toBe("1,2,3");
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
});
