import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from "@testing-library/react";
import type { Pair } from "@/model/participants";

// ---- mocks ----

// The game's combinedRanking drives the Tables screen's "Combined ranking
// across sections" toggle (shown only for a multi-section game). mutateGame is
// the optimistic updater useCombinedRanking calls.
let currentCombinedRanking = true;
let currentGameExtra: Record<string, unknown> = {};
const mockMutateGame = vi.fn();
vi.mock("@/context/GameContext", () => ({
  useRequiredGame: () => ({
    game: {
      gameId: "g1",
      tables: 2,
      combinedRanking: currentCombinedRanking,
      ...currentGameExtra,
    },
    mutateGame: mockMutateGame,
  }),
}));

// SWR returns whatever the current test sets as pairs data, and captures the
// component's fetcher so a test can exercise it directly. `useSWRConfig().mutate`
// is captured so the optimistic table-resize update can be asserted.
//
// The expected-late subscription is backed by a small stateful store so a test
// can observe the optimistic flip: `mockMutate` applies the updater to
// `expectedLateStore` (mirroring SWR's cache), and a re-render reads the new
// value back. This matches how the real page reflects the toggle before the
// server round-trip lands.
let currentPairs: Pair[] = [];
let capturedFetcher: ((url: string) => Promise<Pair[]>) | null = null;
let capturedLateFetcher: ((url: string) => Promise<string[]>) | null = null;
let expectedLateUndefined = false;
// The expected-late cache holds a plain seat-string array (not a Set) — see
// ShowTablesPage's expectedLateFetcher for why — and the page derives a Set
// from it for membership checks.
let expectedLateStore: string[] = [];
// What a bare `mutate(key)` revalidation (a fresh server read) would return.
// Defaults to mirroring the optimistic store so success reconciles cleanly;
// a test can point this at a stale value to model the server read racing the
// write (the real "toggle snaps back" bug).
let expectedLateServerValue: (() => string[]) | null = null;
const mockMutate = vi.fn((key?: string, updater?: unknown, _opts?: unknown) => {
  if (typeof key === "string" && key.includes("expected-late-seats")) {
    if (typeof updater === "function") {
      // Optimistic cache update.
      expectedLateStore = (updater as (c?: string[]) => string[])(
        expectedLateStore,
      );
    } else {
      // Bare revalidation: re-read from the "server".
      expectedLateStore = expectedLateServerValue
        ? expectedLateServerValue()
        : expectedLateStore;
    }
    notifySwrSubscribers();
  }
  return Promise.resolve();
});
// Subscribers that should re-render when the mocked SWR cache changes (as real
// SWR does when `mutate` updates a key). `mockMutate` bumps a version counter
// and notifies them, so an optimistic update is observable in the rendered UI.
const swrListeners = new Set<() => void>();
function notifySwrSubscribers() {
  for (const listener of swrListeners) listener();
}
vi.mock("swr", async () => {
  const { useEffect, useState } = await import("react");

  // Subscribe a hook instance to the mock cache so a mutate() triggers a
  // re-render, the way real SWR notifies cache subscribers. Named with the
  // `use` prefix so it is a legitimate custom hook (rules-of-hooks).
  function useSwrMockSubscription() {
    const [, force] = useState(0);
    useEffect(() => {
      const listener = () => force((n) => n + 1);
      swrListeners.add(listener);
      return () => {
        swrListeners.delete(listener);
      };
    }, []);
  }

  function useSwrMock(
    key: string | null,
    fetcher: (url: string) => Promise<Pair[]>,
  ) {
    useSwrMockSubscription();

    // The page mounts several useSWR calls: pairs, the expected-late seat list,
    // and the selected-movement-name lookup (null key when no SPEC movement).
    // The expected-late subscription yields the seat-string array (the page
    // derives a Set from it); the pairs subscription carries the configured
    // pairs data and its fetcher is captured for the fetcher-unwrap test.
    if (key != null && key.includes("expected-late-seats")) {
      capturedLateFetcher = fetcher as never;
      return { data: expectedLateUndefined ? undefined : expectedLateStore };
    }
    if (key != null) {
      capturedFetcher = fetcher;
      return { data: currentPairs };
    }
    return { data: undefined };
  }

  return {
    default: useSwrMock,
    useSWRConfig: () => ({ mutate: mockMutate }),
  };
});

// Pre-start by default; the page swaps evict/expected-late for the standing
// controls once the game has started, and locks the structural controls
// (table count, sections, movement). `mockStarted` lets a test flip it.
let mockStarted = false;
vi.mock("@/hooks/game-started", () => ({
  useGameStarted: () => ({ started: mockStarted, isLoading: false }),
}));

vi.mock("@/lib/standing-service", () => ({
  setParticipantStanding: vi.fn().mockResolvedValue(undefined),
  setSeatExpectedLate: vi.fn().mockResolvedValue(undefined),
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
const mockRenameSection = vi.fn().mockResolvedValue(undefined);
const mockDeleteSection = vi.fn().mockResolvedValue(undefined);
vi.mock("@/lib/section-service", () => ({
  updateSectionTables: (...args: unknown[]) => mockUpdateSectionTables(...args),
  setSectionSwissMovement: (...args: unknown[]) =>
    mockSetSectionSwissMovement(...args),
  renameSection: (...args: unknown[]) => mockRenameSection(...args),
  deleteSection: (...args: unknown[]) => mockDeleteSection(...args),
}));

// The combined-ranking toggle persists through game-service; report-error is
// how the shared hooks surface failures.
const mockUpdateCombinedRanking = vi.fn().mockResolvedValue(undefined);
vi.mock("@/lib/game-service", () => ({
  updateCombinedRanking: (...args: unknown[]) =>
    mockUpdateCombinedRanking(...args),
}));

const mockReportError = vi.fn();
vi.mock("@/lib/report-error", () => ({
  reportError: (...args: unknown[]) => mockReportError(...args),
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
import {
  setSeatExpectedLate,
  setParticipantStanding,
} from "@/lib/standing-service";
import { ShowTablesPage } from "./ShowTablesPage";

function makePlayer(name: string) {
  return { id: name, firstName: name, lastName: name } as never;
}

/**
 * Click the on/off button of the "Stationary" toggle inside the open table
 * dialog. Scoped to the Stationary group's accessible name because the pair row
 * now also carries a "Without standing" toggle (another Yes/No pair), so an
 * unscoped `getByRole("button", { name: "Yes" })` would be ambiguous.
 */
async function clickStationary(choice: "Yes" | "No") {
  const group = await screen.findByRole("group", { name: "Stationary" });
  fireEvent.click(within(group).getByRole("button", { name: choice }));
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
    mockStarted = false;
    currentPairs = [];
    syncSelector = null;
    capturedFetcher = null;
    capturedLateFetcher = null;
    expectedLateUndefined = false;
    currentGameExtra = {};
    expectedLateStore = [];
    expectedLateServerValue = null;
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
    currentCombinedRanking = true;
    mockUpdateSectionTables.mockResolvedValue(undefined);
    mockSetSectionSwissMovement.mockResolvedValue(undefined);
    mockRenameSection.mockResolvedValue(undefined);
    mockDeleteSection.mockResolvedValue(undefined);
    mockUpdateCombinedRanking.mockResolvedValue(undefined);
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

  it("marks an empty seat expected-late and reflects the flip in the toggle", async () => {
    // NS seated, EW empty -> the EW row offers the "Expected late" toggle.
    currentPairs = [pairAt("A1NS")];

    render(<ShowTablesPage />);

    fireEvent.click(screen.getByRole("button", { name: "Manage table 1" }));

    // The Expected late toggle starts on "No".
    const group = await screen.findByRole("group", { name: "Expected late" });
    expect(within(group).getByRole("button", { name: "No" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    // Tapping "Yes" persists the empty EW seat and optimistically flips the
    // control to the pressed state.
    fireEvent.click(within(group).getByRole("button", { name: "Yes" }));

    await waitFor(() =>
      expect(setSeatExpectedLate).toHaveBeenCalledWith("g1", "A1EW", true),
    );

    const groupAfter = await screen.findByRole("group", {
      name: "Expected late",
    });
    await waitFor(() =>
      expect(
        within(groupAfter).getByRole("button", { name: "Yes" }),
      ).toHaveAttribute("aria-pressed", "true"),
    );
  });

  it("marks an expected-late seat when the whole table is empty (setup flow)", async () => {
    // Fresh game, nobody seated — the SETUP-3 scenario. Both pairs are empty,
    // so both rows offer an Expected late toggle.
    currentPairs = [];

    render(<ShowTablesPage />);

    fireEvent.click(screen.getByRole("button", { name: "Manage table 1" }));

    const groups = await screen.findAllByRole("group", {
      name: "Expected late",
    });
    expect(groups).toHaveLength(2);

    // Tap "Yes" on the North/South row (the first group).
    fireEvent.click(within(groups[0]).getByRole("button", { name: "Yes" }));

    await waitFor(() =>
      expect(setSeatExpectedLate).toHaveBeenCalledWith("g1", "A1NS", true),
    );

    const groupsAfter = await screen.findAllByRole("group", {
      name: "Expected late",
    });
    await waitFor(() =>
      expect(
        within(groupsAfter[0]).getByRole("button", { name: "Yes" }),
      ).toHaveAttribute("aria-pressed", "true"),
    );
  });

  it("keeps the expected-late flip when the reconcile read races the write (SETUP-3 bug)", async () => {
    // Reproduces the reported "Expected late button doesn't toggle": the flip
    // appears, then an immediate server re-read lands before the write is
    // visible and returns the OLD (empty) set, snapping the toggle back.
    // Model that stale read: a bare revalidation returns empty.
    currentPairs = [pairAt("A1NS")];
    expectedLateServerValue = () => [];

    render(<ShowTablesPage />);
    fireEvent.click(screen.getByRole("button", { name: "Manage table 1" }));

    const group = await screen.findByRole("group", { name: "Expected late" });
    fireEvent.click(within(group).getByRole("button", { name: "Yes" }));

    await waitFor(() =>
      expect(setSeatExpectedLate).toHaveBeenCalledWith("g1", "A1EW", true),
    );

    // The toggle must STAY on "Yes" — the just-made change wins over a racing
    // stale read.
    const groupAfter = await screen.findByRole("group", {
      name: "Expected late",
    });
    await waitFor(() =>
      expect(
        within(groupAfter).getByRole("button", { name: "Yes" }),
      ).toHaveAttribute("aria-pressed", "true"),
    );
  });

  it("renders the section pills and add-section modal", () => {
    render(<ShowTablesPage />);

    expect(screen.getByTestId("section-pills")).toBeInTheDocument();
    expect(screen.getByTestId("section-modal")).toBeInTheDocument();
  });

  describe("section management (multi-section)", () => {
    const twoSections = [
      {
        section: "A",
        label: "Red",
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

    it("hides the combined-ranking toggle, section label, and delete for a single section", () => {
      render(<ShowTablesPage />);

      expect(
        screen.queryByText("Combined ranking across sections"),
      ).not.toBeInTheDocument();
      expect(screen.queryByLabelText("Section label")).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "Delete section" }),
      ).not.toBeInTheDocument();
    });

    it("shows the combined-ranking toggle for a multi-section game and persists a flip", async () => {
      currentSections = twoSections;
      currentCombinedRanking = true;

      render(<ShowTablesPage />);

      const group = screen.getByRole("group", {
        name: "Combined ranking across sections",
      });
      // Flip to "Separate" (combined -> false).
      fireEvent.click(within(group).getByRole("button", { name: "Separate" }));

      // Optimistic update applied, then persisted through game-service.
      expect(mockMutateGame).toHaveBeenCalledWith(
        expect.objectContaining({ combinedRanking: false }),
        false,
      );
      await waitFor(() =>
        expect(mockUpdateCombinedRanking).toHaveBeenCalledWith("g1", false),
      );
    });

    it("rolls back the combined-ranking toggle when the save fails", async () => {
      currentSections = twoSections;
      currentCombinedRanking = true;
      mockUpdateCombinedRanking.mockRejectedValueOnce(new Error("nope"));

      render(<ShowTablesPage />);
      const group = screen.getByRole("group", {
        name: "Combined ranking across sections",
      });
      fireEvent.click(within(group).getByRole("button", { name: "Separate" }));

      // Rolls back to the original value and reports the error.
      await waitFor(() =>
        expect(mockMutateGame).toHaveBeenCalledWith(
          expect.objectContaining({ combinedRanking: true }),
          false,
        ),
      );
      await waitFor(() => expect(mockReportError).toHaveBeenCalled());
    });

    it("renames the selected section on blur of its label field", async () => {
      currentSections = twoSections;
      currentSelected = "B";

      render(<ShowTablesPage />);

      const field = screen.getByLabelText("Section label");
      expect(field).toHaveValue("Blue");
      fireEvent.change(field, { target: { value: "Green" } });
      fireEvent.blur(field);

      await waitFor(() =>
        expect(mockRenameSection).toHaveBeenCalledWith("g1", "B", "Green"),
      );
    });

    it("does not rename when the label is unchanged", () => {
      currentSections = twoSections;
      currentSelected = "B";

      render(<ShowTablesPage />);

      const field = screen.getByLabelText("Section label");
      fireEvent.blur(field);

      expect(mockRenameSection).not.toHaveBeenCalled();
    });

    it("deletes the selected section after confirmation and selects a survivor", async () => {
      currentSections = twoSections;
      currentSelected = "B";
      vi.spyOn(window, "confirm").mockReturnValue(true);

      render(<ShowTablesPage />);

      fireEvent.click(screen.getByRole("button", { name: "Delete section" }));

      await waitFor(() =>
        expect(mockDeleteSection).toHaveBeenCalledWith("g1", "B"),
      );
      // Selection moves to the surviving section (A).
      expect(mockSetSelected).toHaveBeenCalledWith("A");
    });

    it("does not delete when the director cancels the confirm", () => {
      currentSections = twoSections;
      currentSelected = "B";
      vi.spyOn(window, "confirm").mockReturnValue(false);

      render(<ShowTablesPage />);

      fireEvent.click(screen.getByRole("button", { name: "Delete section" }));

      expect(mockDeleteSection).not.toHaveBeenCalled();
    });

    it("reports an error when the delete fails", async () => {
      currentSections = twoSections;
      currentSelected = "B";
      vi.spyOn(window, "confirm").mockReturnValue(true);
      mockDeleteSection.mockRejectedValueOnce(new Error("boom"));

      render(<ShowTablesPage />);
      fireEvent.click(screen.getByRole("button", { name: "Delete section" }));

      await waitFor(() => expect(mockReportError).toHaveBeenCalled());
    });
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
    // Share and relay lines. The "shares" note now renders the label and the
    // table-number list on two separate lines (so a long list wraps cleanly),
    // so assert the label line and that its note carries the table number —
    // scoped to the note so the bare "2" doesn't collide with the table badge.
    const sharesLabel = screen.getByText("Shares with table");
    expect(sharesLabel).toBeInTheDocument();
    expect(sharesLabel.parentElement).toHaveTextContent("2");
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
    // Default section has selectedMovement: null. A single-section event omits
    // the "for this section" qualifier.
    const onEditMovement = vi.fn();
    render(<ShowTablesPage onEditMovement={onEditMovement} />);

    const banner = screen.getByTestId("movement-warning-banner");
    expect(banner).toHaveTextContent("Select a movement.");
    expect(banner).not.toHaveTextContent("for this section");

    fireEvent.click(banner);
    expect(onEditMovement).toHaveBeenCalledOnce();
  });

  it("qualifies the 'select a movement' banner with the section when multi-section", () => {
    // Two sections → the prompt disambiguates which section needs a movement.
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
        label: "B",
        tables: 2,
        ordinal: 1,
        selectedMovement: null,
      },
    ];

    render(<ShowTablesPage />);

    expect(screen.getByTestId("movement-warning-banner")).toHaveTextContent(
      "Select a movement for this section.",
    );
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
      // handler, which flips membership regardless of the value passed. Scope
      // to the "Stationary" group — the row now also has a "Without standing"
      // toggle with its own Yes/No.
      await clickStationary("Yes");

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
      await clickStationary("No");

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
      await clickStationary("Yes");

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
      await clickStationary("Yes");

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
      await clickStationary("Yes");

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
      await clickStationary("Yes");

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

  describe("started: structural controls are locked", () => {
    const twoSections = [
      {
        section: "A",
        label: "Red",
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

    it("hides the table-count stepper once the game has started", () => {
      mockStarted = true;
      render(<ShowTablesPage />);

      // The table count is still shown, but the resize stepper is gone.
      expect(screen.getByText("2 tables")).toBeInTheDocument();
      expect(screen.queryByLabelText("Tables")).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "Increase Tables" }),
      ).not.toBeInTheDocument();
    });

    it("shows the section label as static text (no rename / delete) once started", () => {
      mockStarted = true;
      currentSections = twoSections;
      currentSelected = "B";
      render(<ShowTablesPage />);

      // The label is read-only text, not an editable field, and Delete is gone.
      expect(screen.getByText("Blue")).toBeInTheDocument();
      expect(screen.queryByLabelText("Section label")).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "Delete section" }),
      ).not.toBeInTheDocument();
    });

    it("shows the movement as static text (no Change) once started", () => {
      mockStarted = true;
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

      // The movement is still shown (read-only), but it is not a button and
      // carries no "Change" affordance.
      const summary = screen.getByTestId("selected-movement-summary");
      expect(summary).toHaveTextContent("Standard Mitchell");
      expect(summary.tagName).not.toBe("BUTTON");
      expect(within(summary).queryByText("Change")).not.toBeInTheDocument();
    });

    it("suppresses the movement warning banner once started", () => {
      mockStarted = true;
      // No movement selected would normally show the warning banner.
      render(<ShowTablesPage onEditMovement={vi.fn()} />);

      expect(
        screen.queryByTestId("movement-warning-banner"),
      ).not.toBeInTheDocument();
    });

    it("keeps the Swiss stationary toggle once started, and saves a change", async () => {
      // Marking a pair stationary doesn't change the round structure, so the
      // director can do it mid-event; it applies to rounds drawn from then on.
      mockStarted = true;
      currentSections = [
        {
          section: "A",
          label: "A",
          tables: 2,
          ordinal: 0,
          selectedMovement: {
            source: "SWISS",
            swiss: { tables: 2, stationaryPairs: [] },
          } as never,
        },
      ];
      currentPairs = [pairAt("A1NS")];
      mockMovementTables = 2;

      render(<ShowTablesPage />);
      fireEvent.click(screen.getByRole("button", { name: "Manage table 1" }));

      expect(
        screen.getAllByText(/Applies to rounds drawn from now on/).length,
      ).toBeGreaterThan(0);
      await clickStationary("Yes");
      await waitFor(() =>
        expect(mockSetSectionSwissMovement).toHaveBeenCalledWith("g1", "A", {
          tables: 2,
          stationaryPairs: [1],
        }),
      );
    });
  });

  it("unwraps the expected-late seats payload through its SWR fetcher", async () => {
    render(<ShowTablesPage />);
    vi.mocked(fetcher).mockResolvedValueOnce({ seats: ["A1EW"] });
    await expect(capturedLateFetcher!("/api/late")).resolves.toEqual(["A1EW"]);
  });

  it("renders with no expected-late data loaded yet", () => {
    expectedLateUndefined = true;
    render(<ShowTablesPage />);
    expect(
      screen.getByRole("button", { name: "Manage table 1" }),
    ).toBeVisible();
  });

  it("unmarks an expected-late seat", async () => {
    currentPairs = [pairAt("A1NS")];
    expectedLateStore = ["A1EW"];
    render(<ShowTablesPage />);
    fireEvent.click(screen.getByRole("button", { name: "Manage table 1" }));
    const group = await screen.findByRole("group", { name: "Expected late" });
    fireEvent.click(within(group).getByRole("button", { name: "No" }));
    await waitFor(() =>
      expect(setSeatExpectedLate).toHaveBeenCalledWith("g1", "A1EW", false),
    );
    await waitFor(() => expect(expectedLateStore).toEqual([]));
  });

  it("marks a seat expected-late when the cache has no data yet", async () => {
    currentPairs = [pairAt("A1NS")];
    expectedLateStore = undefined as never;
    render(<ShowTablesPage />);
    fireEvent.click(screen.getByRole("button", { name: "Manage table 1" }));
    const group = await screen.findByRole("group", { name: "Expected late" });
    fireEvent.click(within(group).getByRole("button", { name: "Yes" }));
    await waitFor(() => expect(expectedLateStore).toEqual(["A1EW"]));
  });

  it("alerts and rolls back when marking expected-late fails", async () => {
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    vi.mocked(setSeatExpectedLate).mockRejectedValueOnce(new Error("nope"));
    currentPairs = [pairAt("A1NS")];
    render(<ShowTablesPage />);
    fireEvent.click(screen.getByRole("button", { name: "Manage table 1" }));
    const group = await screen.findByRole("group", { name: "Expected late" });
    fireEvent.click(within(group).getByRole("button", { name: "Yes" }));
    await waitFor(() => expect(alertSpy).toHaveBeenCalledWith("nope"));
  });

  it("reports an error when renaming a section fails", async () => {
    mockRenameSection.mockRejectedValueOnce(new Error("boom"));
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
    render(<ShowTablesPage />);
    const input = screen.getByLabelText("Section label");
    fireEvent.change(input, { target: { value: "Renamed" } });
    fireEvent.blur(input);
    await waitFor(() => expect(mockReportError).toHaveBeenCalled());
  });

  describe("post-start standing changes", () => {
    async function openStandingForm() {
      mockStarted = true;
      currentPairs = [pairAt("A1NS"), pairAt("A1EW")];
      render(<ShowTablesPage />);
      fireEvent.click(screen.getByRole("button", { name: "Manage table 1" }));
      fireEvent.click(
        (await screen.findAllByRole("button", { name: /Change standing/ }))[0],
      );
      fireEvent.click(await screen.findByLabelText("No standing"));
      fireEvent.click(screen.getByRole("button", { name: /^Save/ }));
    }

    it("saves a standing change through the service", async () => {
      await openStandingForm();
      await waitFor(() =>
        expect(setParticipantStanding).toHaveBeenCalledWith("g1", "A1NS", {
          standing: "WITHOUT_STANDING",
        }),
      );
    });

    it("alerts when the standing change fails", async () => {
      const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
      vi.mocked(setParticipantStanding).mockRejectedValueOnce(new Error("bad"));
      await openStandingForm();
      await waitFor(() => expect(alertSpy).toHaveBeenCalledWith("bad"));
    });

    it("hides standing controls for a standard PAIRS game", async () => {
      currentGameExtra = { gameType: "PAIRS", eventFormat: "STANDARD" };
      mockStarted = true;
      currentPairs = [pairAt("A1NS"), pairAt("A1EW")];
      render(<ShowTablesPage />);
      fireEvent.click(screen.getByRole("button", { name: "Manage table 1" }));
      await screen.findAllByText(/A1NS-1/);
      expect(
        screen.queryByRole("button", { name: /Change standing/ }),
      ).not.toBeInTheDocument();
    });

    it("offers standing controls for Swiss PAIRS", async () => {
      currentGameExtra = { gameType: "PAIRS", eventFormat: "SWISS" };
      mockStarted = true;
      currentPairs = [pairAt("A1NS"), pairAt("A1EW")];
      render(<ShowTablesPage />);
      fireEvent.click(screen.getByRole("button", { name: "Manage table 1" }));
      expect(
        (await screen.findAllByRole("button", { name: /Change standing/ }))
          .length,
      ).toBeGreaterThan(0);
    });
  });
});
