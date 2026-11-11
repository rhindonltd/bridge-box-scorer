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
    actions,
    children,
  }: {
    headerTitle: string;
    backAction?: () => void;
    actions?: React.ReactNode;
    children: React.ReactNode;
  }) => (
    <div>
      <h1>{headerTitle}</h1>
      {backAction && <button onClick={backAction}>back-action</button>}
      {children}
      <div>{actions}</div>
    </div>
  ),
}));

vi.mock("@/app/game/[gameId]/manage/travellers/SelectBoardPage", () => ({
  SelectBoardPage: ({
    boards,
    onBoardSelected,
    actions,
  }: {
    boards: number[];
    onBoardSelected: (n: number) => void;
    actions?: React.ReactNode;
  }) => (
    <div>
      <span data-testid="boards">{boards.join(",")}</span>
      <button onClick={() => onBoardSelected(3)}>pick-board</button>
      {actions}
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

  describe("PBN import", () => {
    /** A legal deal; the parser does not care which board it is for. */
    const DEAL =
      "N:.63.AKQ987.A9732 A8654.KQ5.T.QJT6 J973.J98742.3.K4 KQT2.AT.J6542.85";
    const pbn = (...boards: number[]) =>
      boards.map((n) => `[Board "${n}"]\n[Deal "${DEAL}"]\n`).join("\n");

    function openImport() {
      fireEvent.click(screen.getByText("Import from PBN file"));
    }
    const paste = (text: string) =>
      fireEvent.change(screen.getByLabelText("Or paste PBN text"), {
        target: { value: text },
      });

    it("opens the import step from the board list and returns with back", () => {
      render(<EnterDealsWizard onDealSaved={vi.fn()} />);
      openImport();
      expect(screen.getByLabelText("PBN file")).toBeInTheDocument();

      fireEvent.click(screen.getByText("back-action"));
      expect(screen.getByTestId("boards")).toBeInTheDocument();
    });

    it("emits DEAL_IMPORT_BULK with the director token and the in-event boards", async () => {
      mockEmitWithAck.mockResolvedValue({ saved: 2 });
      render(<EnterDealsWizard onDealSaved={vi.fn()} />);
      openImport();
      paste(pbn(1, 2, 9)); // event boards are 1,2,3; board 9 is skipped
      fireEvent.click(screen.getByRole("button", { name: "Import 2 boards" }));

      await waitFor(() => expect(mockEmitWithAck).toHaveBeenCalled());
      expect(mockEmitWithAck).toHaveBeenCalledWith(
        SocketEvents.DEAL_IMPORT_BULK,
        expect.objectContaining({
          gameId: "g1",
          directorToken: "dir-tok",
          deals: [
            expect.objectContaining({ boardNumber: 1 }),
            expect.objectContaining({ boardNumber: 2 }),
          ],
        }),
      );
    });

    it("shows the done screen, then calls onDealSaved when Done is pressed", async () => {
      mockEmitWithAck.mockResolvedValue({ saved: 2 });
      const onDealSaved = vi.fn();
      render(<EnterDealsWizard onDealSaved={onDealSaved} />);
      openImport();
      paste(pbn(1, 2));
      fireEvent.click(screen.getByRole("button", { name: "Import 2 boards" }));

      expect(await screen.findByText("2 boards imported")).toBeVisible();
      expect(onDealSaved).not.toHaveBeenCalled();

      fireEvent.click(screen.getByRole("button", { name: "Done" }));
      expect(onDealSaved).toHaveBeenCalled();
    });

    it("keeps the pasted text and shows the error when the import fails", async () => {
      mockEmitWithAck.mockRejectedValue(
        new Error("Board 2 is not a complete deal"),
      );
      render(<EnterDealsWizard onDealSaved={vi.fn()} />);
      openImport();
      paste(pbn(1, 2));
      fireEvent.click(screen.getByRole("button", { name: "Import 2 boards" }));

      expect(
        await screen.findByText("Board 2 is not a complete deal"),
      ).toBeInTheDocument();
      expect(screen.getByLabelText("Or paste PBN text")).toHaveValue(pbn(1, 2));
      // Can try again.
      expect(
        screen.getByRole("button", { name: "Import 2 boards" }),
      ).toBeEnabled();
    });

    it("uses a generic message when the import rejects with a non-Error", async () => {
      mockEmitWithAck.mockRejectedValue("nope");
      render(<EnterDealsWizard onDealSaved={vi.fn()} />);
      openImport();
      paste(pbn(1));
      fireEvent.click(screen.getByRole("button", { name: "Import 1 board" }));

      expect(
        await screen.findByText("Failed to import the deals"),
      ).toBeInTheDocument();
    });
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
