import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import type { Pair } from "@/model/participants";

// ---- mocks ----

vi.mock("@/context/GameContext", () => ({
  useRequiredGame: () => ({
    game: { gameId: "g1", tables: 2 },
  }),
}));

// SWR returns whatever the current test sets as pairs data, and captures the
// component's fetcher so a test can exercise it directly. `useSWRConfig().mutate`
// is captured so the optimistic table-resize update can be asserted.
let currentPairs: Pair[] = [];
let capturedFetcher: ((url: string) => Promise<Pair[]>) | null = null;
const mockMutate = vi.fn();
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
  useSWRConfig: () => ({ mutate: mockMutate }),
}));

// Capture the sync selector so a test can invoke it directly.
let syncSelector:
  ((p: { participants: Pair[] }) => { key: string; data: Pair[] }) | null =
  null;
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
const mockSetSectionSwissMovement = vi.fn().mockResolvedValue(undefined);
vi.mock("@/lib/section-service", () => ({
  updateSectionTables: (...args: unknown[]) => mockUpdateSectionTables(...args),
  setSectionSwissMovement: (...args: unknown[]) =>
    mockSetSectionSwissMovement(...args),
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
      {
        section: "A",
        label: "A",
        tables: 2,
        ordinal: 0,
        selectedMovement: null,
      },
    ];
    currentSelected = "A";
    mockUpdateSectionTables.mockResolvedValue(undefined);
    mockSetSectionSwissMovement.mockResolvedValue(undefined);
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

    // Occupied seats render inside a tappable table card (which opens the
    // management dialog).
    expect(
      screen.getByRole("button", { name: "Manage table 1" }),
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

  it("resizes a section through the number stepper (HTTP) with an optimistic cache update", async () => {
    render(<ShowTablesPage />);

    const increment = screen.getByRole("button", { name: "Increase Tables" });
    fireEvent.pointerDown(increment);
    fireEvent.pointerUp(increment);

    await waitFor(() =>
      expect(mockUpdateSectionTables).toHaveBeenCalledWith("g1", "A", 3),
    );

    // Optimistic update: the sections cache is patched immediately (before the
    // server round-trip) with revalidate: false so the grid doesn't flicker.
    const optimistic = mockMutate.mock.calls.find(
      (c) => c[0] === "/api/games/g1/sections" && typeof c[1] === "function",
    );
    expect(optimistic).toBeTruthy();
    const updater = optimistic![1] as (d: {
      sections: { section: string; tables: number }[];
    }) => { sections: { section: string; tables: number }[] };
    const patched = updater({
      // A non-matching section (B) is left untouched; A is bumped to 3.
      sections: [
        { section: "A", tables: 2 } as never,
        { section: "B", tables: 4 } as never,
      ],
    });
    expect(patched.sections[0]).toMatchObject({ section: "A", tables: 3 });
    expect(patched.sections[1]).toMatchObject({ section: "B", tables: 4 });
    expect(optimistic![2]).toMatchObject({ revalidate: false });

    // When the cache is empty the updater passes the (undefined) value through
    // unchanged rather than fabricating a sections envelope.
    expect(
      (updater as (d?: { sections: unknown[] }) => unknown)(undefined),
    ).toBeUndefined();
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

    // On failure the optimistic value is rolled back by revalidating the
    // sections key (a bare mutate with no data/options).
    expect(
      mockMutate.mock.calls.some(
        (c) => c[0] === "/api/games/g1/sections" && c.length === 1,
      ),
    ).toBe(true);
  });

  it("uses a generic message when the resize rejects with a non-Error", async () => {
    mockUpdateSectionTables.mockRejectedValueOnce("nope");
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});

    render(<ShowTablesPage />);
    const increment = screen.getByRole("button", { name: "Increase Tables" });
    fireEvent.pointerDown(increment);
    fireEvent.pointerUp(increment);

    await waitFor(() =>
      expect(alertSpy).toHaveBeenCalledWith("Failed to update tables"),
    );
  });

  it("renders nothing section-specific when the selected section is missing", () => {
    // `selected` points at a section that isn't in the list -> currentSection
    // is undefined, so the grid/stepper are not rendered and no movement
    // warning is shown.
    currentSelected = "Z";

    render(<ShowTablesPage />);

    expect(screen.queryByLabelText("Tables")).not.toBeInTheDocument();
    expect(
      screen.queryByTestId("movement-warning-banner"),
    ).not.toBeInTheDocument();
  });

  it("evicts a pair after confirmation via the HTTP service (from the dialog)", async () => {
    currentPairs = [pairAt("A1NS")];
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);

    render(<ShowTablesPage />);

    // Open the table's management dialog, then evict the NS pair.
    fireEvent.click(screen.getByRole("button", { name: "Manage table 1" }));
    fireEvent.click(
      await screen.findByRole("button", { name: "Evict North / South pair" }),
    );
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
    fireEvent.click(screen.getByRole("button", { name: "Manage table 1" }));
    fireEvent.click(
      await screen.findByRole("button", { name: "Evict North / South pair" }),
    );

    await waitFor(() => expect(alertSpy).toHaveBeenCalledWith("cannot evict"));
  });

  it("uses a generic message when the eviction rejects with a non-Error", async () => {
    currentPairs = [pairAt("A1NS")];
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    mockEvictParticipant.mockRejectedValueOnce("nope");

    render(<ShowTablesPage />);
    fireEvent.click(screen.getByRole("button", { name: "Manage table 1" }));
    fireEvent.click(
      await screen.findByRole("button", { name: "Evict North / South pair" }),
    );

    await waitFor(() =>
      expect(alertSpy).toHaveBeenCalledWith("Failed to evict participant"),
    );
  });

  it("does not evict when the director cancels the confirm", async () => {
    currentPairs = [pairAt("A1NS")];
    vi.spyOn(window, "confirm").mockReturnValue(false);

    render(<ShowTablesPage />);
    fireEvent.click(screen.getByRole("button", { name: "Manage table 1" }));
    fireEvent.click(
      await screen.findByRole("button", { name: "Evict North / South pair" }),
    );

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
    expect(screen.getAllByText("Boards 1–3 (Copy A)").length).toBeGreaterThan(
      0,
    );
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
      {
        section: "A",
        label: "A",
        tables: 2,
        ordinal: 0,
        selectedMovement: null,
      },
      {
        section: "B",
        label: "Blue",
        tables: 4,
        ordinal: 1,
        selectedMovement: null,
      },
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

  describe("Swiss stationary toggle", () => {
    function swissSection(stationaryPairs: number[] = []) {
      return [
        {
          section: "A",
          label: "A",
          tables: 2,
          ordinal: 0,
          selectedMovement: {
            source: "SWISS",
            swiss: { tables: 2, stationaryPairs },
          } as never,
        },
      ];
    }

    it("marks a NS pair stationary (adds its id) via the modal", async () => {
      currentSections = swissSection([]);
      currentPairs = [pairAt("A1NS")];
      mockMovementTables = 2;

      render(<ShowTablesPage />);

      fireEvent.click(screen.getByRole("button", { name: "Manage table 1" }));
      // The stationary toggle for the NS pair (table 1, ns=true -> pairId 1).
      // The Toggle renders "No"/"Yes" buttons; clicking either fires the
      // handler, which flips membership regardless of the value passed.
      fireEvent.click(await screen.findByRole("button", { name: "Yes" }));

      await waitFor(() =>
        expect(mockSetSectionSwissMovement).toHaveBeenCalledWith("g1", "A", {
          tables: 2,
          stationaryPairs: [1],
        }),
      );
    });

    it("un-marks a stationary EW pair (removes its id) via the modal", async () => {
      // EW pair at table 1 has id tables + 1 = 3; already stationary.
      currentSections = swissSection([3]);
      currentPairs = [pairAt("A1EW")];
      mockMovementTables = 2;

      render(<ShowTablesPage />);

      fireEvent.click(screen.getByRole("button", { name: "Manage table 1" }));
      // Single occupied pair (EW) -> one toggle; click "No" to un-mark.
      fireEvent.click(await screen.findByRole("button", { name: "No" }));

      await waitFor(() =>
        expect(mockSetSectionSwissMovement).toHaveBeenCalledWith("g1", "A", {
          tables: 2,
          stationaryPairs: [],
        }),
      );
    });

    it("alerts when saving the stationary change fails", async () => {
      currentSections = swissSection([]);
      currentPairs = [pairAt("A1NS")];
      mockMovementTables = 2;
      const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
      mockSetSectionSwissMovement.mockRejectedValueOnce(new Error("boom"));

      render(<ShowTablesPage />);
      fireEvent.click(screen.getByRole("button", { name: "Manage table 1" }));
      fireEvent.click(await screen.findByRole("button", { name: "Yes" }));

      await waitFor(() => expect(alertSpy).toHaveBeenCalledWith("boom"));
    });

    it("handles a swiss spec with no stationaryPairs field", async () => {
      currentSections = [
        {
          section: "A",
          label: "A",
          tables: 2,
          ordinal: 0,
          // No stationaryPairs key -> the `?? []` default kicks in.
          selectedMovement: {
            source: "SWISS",
            swiss: { tables: 2 },
          } as never,
        },
      ];
      currentPairs = [pairAt("A1NS")];
      mockMovementTables = 2;

      render(<ShowTablesPage />);
      fireEvent.click(screen.getByRole("button", { name: "Manage table 1" }));
      fireEvent.click(await screen.findByRole("button", { name: "Yes" }));

      await waitFor(() =>
        expect(mockSetSectionSwissMovement).toHaveBeenCalledWith("g1", "A", {
          tables: 2,
          stationaryPairs: [1],
        }),
      );
    });

    it("keeps the stationary-pairs list sorted when adding a third id", async () => {
      // Already-stationary ids 4 and 1; toggling table 1 NS (id 1) removes it,
      // but toggling table 2 NS (id 2) adds it, forcing the sort comparator to
      // order [4, 1, 2] -> [1, 2, 4].
      currentSections = swissSection([4, 1]);
      currentPairs = [pairAt("A2NS")];
      mockMovementTables = 2;

      render(<ShowTablesPage />);
      fireEvent.click(screen.getByRole("button", { name: "Manage table 2" }));
      // Table 2 NS -> pairId 2, not currently stationary, so it is added.
      fireEvent.click(await screen.findByRole("button", { name: "Yes" }));

      await waitFor(() =>
        expect(mockSetSectionSwissMovement).toHaveBeenCalledWith("g1", "A", {
          tables: 2,
          stationaryPairs: [1, 2, 4],
        }),
      );
    });

    it("uses a generic message when the stationary save rejects with a non-Error", async () => {
      currentSections = swissSection([]);
      currentPairs = [pairAt("A1NS")];
      mockMovementTables = 2;
      const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
      mockSetSectionSwissMovement.mockRejectedValueOnce("nope");

      render(<ShowTablesPage />);
      fireEvent.click(screen.getByRole("button", { name: "Manage table 1" }));
      fireEvent.click(await screen.findByRole("button", { name: "Yes" }));

      await waitFor(() =>
        expect(alertSpy).toHaveBeenCalledWith("Failed to update stationary"),
      );
    });
  });

  it("closes the table dialog when Done is pressed", async () => {
    currentPairs = [pairAt("A1NS")];

    render(<ShowTablesPage />);
    fireEvent.click(screen.getByRole("button", { name: "Manage table 1" }));
    expect(await screen.findByText("Table 1")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Done" }));

    await waitFor(() =>
      expect(screen.queryByText("Table 1")).not.toBeInTheDocument(),
    );
  });

  it("falls back to no table in the dialog when the opened table no longer exists", async () => {
    // Open a table, then shrink the section so the opened table number is gone.
    // The dialog's `tables.find(...) ?? null` fallback should resolve to null,
    // closing the dialog rather than showing a stale table.
    currentPairs = [pairAt("A2NS")];

    const { rerender } = render(<ShowTablesPage />);
    fireEvent.click(screen.getByRole("button", { name: "Manage table 2" }));
    expect(await screen.findByText("Table 2")).toBeInTheDocument();

    // Section now has a single table; table 2 no longer exists.
    currentSections = [
      {
        section: "A",
        label: "A",
        tables: 1,
        ordinal: 0,
        selectedMovement: null,
      },
    ];
    rerender(<ShowTablesPage />);

    await waitFor(() =>
      expect(screen.queryByText("Table 2")).not.toBeInTheDocument(),
    );
  });
});
