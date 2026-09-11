import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import type { Pair } from "@/model/participants";

// ---- mocks ----

const mockMutateGame = vi.fn();
vi.mock("@/context/GameContext", () => ({
  useRequiredGame: () => ({
    game: { gameId: "g1", tables: 2 },
    mutateGame: mockMutateGame,
  }),
}));

// SWR returns whatever the current test sets as pairs data, and captures the
// component's fetcher so a test can exercise it directly.
let currentPairs: Pair[] = [];
let capturedFetcher: ((url: string) => Promise<Pair[]>) | null = null;
vi.mock("swr", () => ({
  default: (key: string | null, fetcher: (url: string) => Promise<Pair[]>) => {
    // The page mounts more than one useSWR (pairs + the selected-movement-name
    // lookup, which passes a null key when no SPEC movement is chosen). Only the
    // pairs subscription carries a live string key here, so capture that one's
    // fetcher and back it with the configured pairs data.
    if (key != null) {
      capturedFetcher = fetcher;
      return { data: currentPairs };
    }
    return { data: undefined };
  },
}));

// Capture the sync selector so a test can invoke it directly.
let syncSelector:
  | ((p: { participants: Pair[] }) => { key: string; data: Pair[] })
  | null = null;
vi.mock("@/hooks/socket-swr-sync", () => ({
  useSocketSWRSync: (
    _event: unknown,
    selector: (p: { participants: Pair[] }) => {
      key: string;
      data: Pair[];
    },
  ) => {
    syncSelector = selector;
  },
}));

// Sections list + current selection are configurable per test. useSetupSections
// is mocked so the page's own grid/stepper/start behaviour is under test; the
// pills and add-section modal are covered by their own suites.
let currentSections = [
  {
    section: "A",
    label: "A",
    tables: 2,
    ordinal: 0,
    selectedMovement: null,
  },
];
let currentSelected = "A";
const mockSetSelected = vi.fn();
vi.mock("@/components/manage/sections/useSetupSections", () => ({
  useSetupSections: () => ({
    sections: currentSections,
    selected: currentSelected,
    setSelected: mockSetSelected,
    pills: <div data-testid="section-pills" />,
    modal: <div data-testid="section-modal" />,
  }),
}));



vi.mock("@/lib/director-token", () => ({
  getDirectorToken: () => "token",
}));

vi.mock("@/lib/fetcher", () => ({
  fetcher: vi.fn(),
}));

// Table resize now goes through the HTTP section-service.
const mockUpdateSectionTables = vi.fn().mockResolvedValue(undefined);
vi.mock("@/lib/section-service", () => ({
  updateSectionTables: (...args: unknown[]) => mockUpdateSectionTables(...args),
}));

// Eviction now goes through the HTTP participant-service.
const mockEvictParticipant = vi.fn().mockResolvedValue(undefined);
vi.mock("@/lib/participant-service", () => ({
  evictParticipant: (...args: unknown[]) => mockEvictParticipant(...args),
}));

// Movement resolution: stationary highlighting + board placement. Default to
// empty; tests override. `mockMovementTables` is reported back so the page can
// reason about mismatches, but the hook itself applies the gate, so tests just
// set the maps they expect.
let mockStationary = new Map<number, { ns: boolean; ew: boolean }>();
let mockPlacement = new Map<
  number,
  {
    boardStart: number;
    boardEnd: number;
    boardCopy?: string;
    sharesWith?: number[];
    relayWith?: number;
  }
>();
let mockMovementTables = 0;
vi.mock("@/hooks/stationary-pairs", () => ({
  useMovementResolution: () => ({
    stationary: mockStationary,
    placement: mockPlacement,
    movementTables: mockMovementTables,
  }),
}));

import { fetcher } from "@/lib/fetcher";
import { ShowTablesPage } from "./ShowTablesPage";

function makePlayer(name: string) {
  return { id: name, firstName: name, lastName: name } as never;
}

function pairAt(seat: string): Pair {
  return {
    type: "PAIR",
    initialSeat: seat as never,
    player1: makePlayer(`${seat}-1`),
    player2: makePlayer(`${seat}-2`),
  } as Pair;
}

describe("ShowTablesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentPairs = [];
    syncSelector = null;
    capturedFetcher = null;
    currentSections = [
      { section: "A", label: "A", tables: 2, ordinal: 0, selectedMovement: null },
    ];
    currentSelected = "A";
    mockUpdateSectionTables.mockResolvedValue(undefined);
    mockEvictParticipant.mockResolvedValue(undefined);
    mockStationary = new Map();
    mockPlacement = new Map();
    mockMovementTables = 0;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the setup menu passed via the menu slot", () => {
    render(<ShowTablesPage menu={<div>setup menu</div>} />);
    expect(screen.getByText("setup menu")).toBeInTheDocument();
  });

  it("maps participants into occupied tables and exposes a sync selector", () => {
    currentPairs = [pairAt("A1NS"), pairAt("A1EW")];

    render(<ShowTablesPage />);

    // Occupied seat renders an evict control for that player.
    expect(
      screen.getByLabelText("Evict North player"),
    ).toBeInTheDocument();

    // Sync selector maps a PARTICIPANTS event to the pairs cache key.
    expect(syncSelector).toBeTypeOf("function");
    const next = [pairAt("A2NS")];
    expect(syncSelector!({ participants: next })).toEqual({
      key: expect.any(String),
      data: next,
    });
  });

  it("unwraps the pairs payload through its SWR fetcher", async () => {
    render(<ShowTablesPage />);

    expect(capturedFetcher).toBeTypeOf("function");
    const next = [pairAt("A1NS")];
    vi.mocked(fetcher).mockResolvedValueOnce({ pairs: next });

    await expect(capturedFetcher!("/api/pairs")).resolves.toEqual(next);
    expect(fetcher).toHaveBeenCalledWith("/api/pairs");
  });

  it("resizes a section through the number stepper (HTTP) and refreshes", async () => {
    render(<ShowTablesPage />);

    const increment = screen.getByRole("button", { name: "Increase Tables" });
    fireEvent.pointerDown(increment);
    fireEvent.pointerUp(increment);

    await waitFor(() =>
      expect(mockUpdateSectionTables).toHaveBeenCalledWith("g1", "A", 3),
    );
    await waitFor(() => expect(mockMutateGame).toHaveBeenCalled());
  });

  it("alerts when a resize is rejected (e.g. shrink guard)", async () => {
    mockUpdateSectionTables.mockRejectedValueOnce(
      new Error("Cannot remove a table with seated participants"),
    );
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});

    render(<ShowTablesPage />);
    const increment = screen.getByRole("button", { name: "Increase Tables" });
    fireEvent.pointerDown(increment);
    fireEvent.pointerUp(increment);

    await waitFor(() =>
      expect(alertSpy).toHaveBeenCalledWith(
        "Cannot remove a table with seated participants",
      ),
    );
  });

  it("evicts a pair after confirmation via the HTTP service", async () => {
    currentPairs = [pairAt("A1NS")];
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);

    render(<ShowTablesPage />);

    fireEvent.click(screen.getByLabelText("Evict North player"));
    expect(confirmSpy).toHaveBeenCalled();
    await waitFor(() =>
      expect(mockEvictParticipant).toHaveBeenCalledWith("g1", "A1NS"),
    );
  });

  it("alerts when the eviction fails", async () => {
    currentPairs = [pairAt("A1NS")];
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    mockEvictParticipant.mockRejectedValueOnce(new Error("cannot evict"));

    render(<ShowTablesPage />);
    fireEvent.click(screen.getByLabelText("Evict North player"));

    await waitFor(() =>
      expect(alertSpy).toHaveBeenCalledWith("cannot evict"),
    );
  });

  it("does not evict when the director cancels the confirm", () => {
    currentPairs = [pairAt("A1NS")];
    vi.spyOn(window, "confirm").mockReturnValue(false);

    render(<ShowTablesPage />);
    fireEvent.click(screen.getByLabelText("Evict North player"));

    expect(mockEvictParticipant).not.toHaveBeenCalled();
  });

  it("renders the section pills and add-section modal", () => {
    render(<ShowTablesPage />);

    expect(screen.getByTestId("section-pills")).toBeInTheDocument();
    expect(screen.getByTestId("section-modal")).toBeInTheDocument();
  });

  it("highlights stationary pairs from the movement", () => {
    // Table 1 has a stationary NS pair; the grid should show its badges.
    mockStationary = new Map([[1, { ns: true, ew: false }]]);

    render(<ShowTablesPage />);

    // North + South of the stationary NS pair -> two "Stationary" badges.
    expect(screen.getAllByText("Stationary")).toHaveLength(2);
  });

  it("shows each table's board placement when a movement is resolved", () => {
    mockMovementTables = 2;
    mockPlacement = new Map([
      [1, { boardStart: 1, boardEnd: 2 }],
      [2, { boardStart: 3, boardEnd: 4 }],
    ]);

    render(<ShowTablesPage />);

    expect(screen.getByText("Boards 1–2")).toBeInTheDocument();
    expect(screen.getByText("Boards 3–4")).toBeInTheDocument();
  });

  it("shows copy, share, and relay notes on the placement", () => {
    mockMovementTables = 2;
    mockPlacement = new Map([
      [1, { boardStart: 1, boardEnd: 3, boardCopy: "A", sharesWith: [2] }],
      [2, { boardStart: 1, boardEnd: 3, boardCopy: "A", relayWith: 1 }],
    ]);

    render(<ShowTablesPage />);

    // Copy label appears alongside the boards.
    expect(screen.getAllByText("Boards 1–3 (Copy A)").length).toBeGreaterThan(0);
    // Share and relay lines.
    expect(screen.getByText("Shares with table 2")).toBeInTheDocument();
    expect(screen.getByText("Relay → table 1")).toBeInTheDocument();
  });

  it("shows no board placement when the movement is not resolved", () => {
    // Empty placement map (no movement / table-count mismatch).
    render(<ShowTablesPage />);

    expect(screen.queryByText(/^Boards? /)).not.toBeInTheDocument();
    expect(screen.queryByText(/Shares with/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Relay/)).not.toBeInTheDocument();
  });

  it("shows a 'select a movement' banner when the section has no movement", () => {
    // Default section has selectedMovement: null.
    const onEditMovement = vi.fn();
    render(<ShowTablesPage onEditMovement={onEditMovement} />);

    const banner = screen.getByTestId("movement-warning-banner");
    expect(banner).toHaveTextContent("Select a movement for this section.");

    fireEvent.click(banner);
    expect(onEditMovement).toHaveBeenCalledOnce();
  });

  it("shows an 'update the movement' banner when the movement no longer fits the table count", () => {
    currentSections = [
      {
        section: "A",
        label: "A",
        tables: 2,
        ordinal: 0,
        selectedMovement: { source: "MITCHELL" } as never,
      },
    ];
    // Movement resolves to a different table count than the section (2).
    mockMovementTables = 3;

    const onEditMovement = vi.fn();
    render(<ShowTablesPage onEditMovement={onEditMovement} />);

    const banner = screen.getByTestId("movement-warning-banner");
    expect(banner).toHaveTextContent("no longer fits its table count");

    fireEvent.click(banner);
    expect(onEditMovement).toHaveBeenCalledOnce();
  });

  it("hides the banner when a movement is selected and fits the table count", () => {
    currentSections = [
      {
        section: "A",
        label: "A",
        tables: 2,
        ordinal: 0,
        selectedMovement: { source: "MITCHELL" } as never,
      },
    ];
    // Movement matches the section's table count.
    mockMovementTables = 2;

    render(<ShowTablesPage />);

    expect(
      screen.queryByTestId("movement-warning-banner"),
    ).not.toBeInTheDocument();
  });

  it("shows the selected movement name summary when a movement fits", () => {
    currentSections = [
      {
        section: "A",
        label: "A",
        tables: 2,
        ordinal: 0,
        selectedMovement: {
          source: "MITCHELL",
          mitchell: { tables: 2, rounds: 2, boardsPerRound: 2 },
        } as never,
      },
    ];
    mockMovementTables = 2;

    const onEditMovement = vi.fn();
    render(<ShowTablesPage onEditMovement={onEditMovement} />);

    const summary = screen.getByTestId("selected-movement-summary");
    expect(summary).toHaveTextContent("Standard Mitchell");

    fireEvent.click(summary);
    expect(onEditMovement).toHaveBeenCalledOnce();
  });

  it("hides the movement summary while a warning is shown", () => {
    currentSections = [
      {
        section: "A",
        label: "A",
        tables: 2,
        ordinal: 0,
        selectedMovement: {
          source: "MITCHELL",
          mitchell: { tables: 3, rounds: 3, boardsPerRound: 2 },
        } as never,
      },
    ];
    // Movement resolves to a different table count -> warning, not summary.
    mockMovementTables = 3;

    render(<ShowTablesPage />);

    expect(
      screen.queryByTestId("selected-movement-summary"),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId("movement-warning-banner")).toBeInTheDocument();
  });

  it("shows only the selected section's grid and stepper", async () => {
    currentSections = [
      { section: "A", label: "A", tables: 2, ordinal: 0, selectedMovement: null },
      { section: "B", label: "Blue", tables: 4, ordinal: 1, selectedMovement: null },
    ];
    currentSelected = "B";

    render(<ShowTablesPage />);

    // The stepper reflects section B's table count, and resizing targets B.
    expect(screen.getByLabelText("Tables")).toHaveValue(4);
    const increment = screen.getByRole("button", { name: "Increase Tables" });
    fireEvent.pointerDown(increment);
    fireEvent.pointerUp(increment);

    await waitFor(() =>
      expect(mockUpdateSectionTables).toHaveBeenCalledWith("g1", "B", 5),
    );
  });
});
