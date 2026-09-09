import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
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
  default: (_key: string, fetcher: (url: string) => Promise<Pair[]>) => {
    capturedFetcher = fetcher;
    return { data: currentPairs };
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

const mockEmit = vi.fn();
vi.mock("@/lib/socket", () => ({
  getSocket: () => ({ emit: mockEmit }),
}));

vi.mock("@/lib/director-token", () => ({
  getDirectorToken: () => "token",
}));

vi.mock("@/lib/fetcher", () => ({
  fetcher: vi.fn(),
}));

// Stationary-pair highlighting: default to none; a test overrides it.
let mockStationary = new Map<number, { ns: boolean; ew: boolean }>();
vi.mock("@/hooks/stationary-pairs", () => ({
  useStationaryPairs: () => mockStationary,
}));

import { SocketEvents } from "@/socket/socket-events";
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
    mockStationary = new Map();
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

  it("resizes a section through the number stepper", () => {
    render(<ShowTablesPage />);

    const increment = screen.getByRole("button", { name: "+" });
    fireEvent.mouseDown(increment);
    fireEvent.mouseUp(increment);

    expect(mockEmit).toHaveBeenCalledWith(
      SocketEvents.UPDATE_TABLES,
      expect.objectContaining({
        gameId: "g1",
        section: "A",
        tables: 3,
        directorToken: "token",
      }),
      expect.any(Function),
    );
    // The ack callback triggers a game refresh.
    const ack = mockEmit.mock.calls[0][2] as () => void;
    ack();
    expect(mockMutateGame).toHaveBeenCalled();
  });

  it("evicts a pair after confirmation and alerts on failure", () => {
    currentPairs = [pairAt("A1NS")];
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});

    render(<ShowTablesPage />);

    fireEvent.click(screen.getByLabelText("Evict North player"));
    expect(confirmSpy).toHaveBeenCalled();
    expect(mockEmit).toHaveBeenCalledWith(
      SocketEvents.EVICT_PARTICIPANT,
      expect.objectContaining({ gameId: "g1", directorToken: "token" }),
      expect.any(Function),
    );

    // Simulate a failed eviction ack.
    const evictCall = mockEmit.mock.calls.find(
      (c) => c[0] === SocketEvents.EVICT_PARTICIPANT,
    )!;
    const ack = evictCall[2] as (r: {
      success: boolean;
      error?: string;
    }) => void;
    ack({ success: false, error: "cannot evict" });
    expect(alertSpy).toHaveBeenCalledWith("cannot evict");
  });

  it("does nothing on a successful eviction ack", () => {
    currentPairs = [pairAt("A1NS")];
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});

    render(<ShowTablesPage />);
    fireEvent.click(screen.getByLabelText("Evict North player"));

    const evictCall = mockEmit.mock.calls.find(
      (c) => c[0] === SocketEvents.EVICT_PARTICIPANT,
    )!;
    const ack = evictCall[2] as (r: { success: boolean }) => void;
    ack({ success: true });
    expect(alertSpy).not.toHaveBeenCalled();
  });

  it("does not evict when the director cancels the confirm", () => {
    currentPairs = [pairAt("A1NS")];
    vi.spyOn(window, "confirm").mockReturnValue(false);

    render(<ShowTablesPage />);
    fireEvent.click(screen.getByLabelText("Evict North player"));

    expect(
      mockEmit.mock.calls.some(
        (c) => c[0] === SocketEvents.EVICT_PARTICIPANT,
      ),
    ).toBe(false);
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

  it("shows only the selected section's grid and stepper", () => {
    currentSections = [
      { section: "A", label: "A", tables: 2, ordinal: 0, selectedMovement: null },
      { section: "B", label: "Blue", tables: 4, ordinal: 1, selectedMovement: null },
    ];
    currentSelected = "B";

    render(<ShowTablesPage />);

    // The stepper reflects section B's table count, and resizing targets B.
    const increment = screen.getByRole("button", { name: "+" });
    fireEvent.mouseDown(increment);
    fireEvent.mouseUp(increment);

    expect(mockEmit).toHaveBeenCalledWith(
      SocketEvents.UPDATE_TABLES,
      expect.objectContaining({ section: "B", tables: 5 }),
      expect.any(Function),
    );
  });
});
