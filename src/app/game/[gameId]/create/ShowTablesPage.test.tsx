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

// Sections list is configurable per test.
let currentSections = [
  {
    section: "A",
    label: "A",
    tables: 2,
    ordinal: 0,
    selectedMovement: null,
  },
];
vi.mock("@/hooks/sections", () => ({
  useSections: () => ({ sections: currentSections, isLoading: false }),
}));

const mockEmit = vi.fn();
vi.mock("@/lib/socket", () => ({
  getSocket: () => ({ emit: mockEmit }),
}));

vi.mock("@/lib/director-token", () => ({
  getDirectorToken: () => "token",
}));

const mockUseStartCheck = vi.fn();
vi.mock("@/hooks/start-check", () => ({
  useStartCheck: () => mockUseStartCheck(),
}));

const mockStartGame = vi.fn(async (...args: unknown[]) => {
  void args;
});
vi.mock("@/lib/game-service", () => ({
  startGame: (...args: unknown[]) => mockStartGame(...args),
}));

vi.mock("@/lib/fetcher", () => ({
  fetcher: vi.fn(),
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
    mockUseStartCheck.mockReturnValue({
      canStart: false,
      problems: [],
      sitOutSeat: null,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("disables Start Game and shows reasons when not valid", () => {
    mockUseStartCheck.mockReturnValue({
      canStart: false,
      problems: [
        {
          code: "MULTIPLE_EMPTY_POSITIONS",
          message: "More than one pair is missing.",
        },
      ],
      sitOutSeat: null,
    });

    render(<ShowTablesPage />);

    const startButton = screen.getByRole("button", { name: "Start Game" });
    expect(startButton).toBeDisabled();
    expect(
      screen.getByText("More than one pair is missing."),
    ).toBeInTheDocument();
  });

  it("enables Start Game and starts the game when valid", async () => {
    mockUseStartCheck.mockReturnValue({
      canStart: true,
      problems: [],
      sitOutSeat: null,
    });

    render(<ShowTablesPage />);

    const startButton = screen.getByRole("button", { name: "Start Game" });
    expect(startButton).toBeEnabled();

    fireEvent.click(startButton);

    await waitFor(() => expect(mockStartGame).toHaveBeenCalledWith("g1"));
    await waitFor(() => expect(mockMutateGame).toHaveBeenCalled());
  });

  it("alerts and recovers when starting the game throws", async () => {
    mockUseStartCheck.mockReturnValue({
      canStart: true,
      problems: [],
      sitOutSeat: null,
    });
    mockStartGame.mockRejectedValueOnce(new Error("nope"));
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});

    render(<ShowTablesPage />);
    fireEvent.click(screen.getByRole("button", { name: "Start Game" }));

    await waitFor(() => expect(alertSpy).toHaveBeenCalledWith("nope"));
  });

  it("alerts a generic message when the start error is not an Error", async () => {
    mockUseStartCheck.mockReturnValue({
      canStart: true,
      problems: [],
      sitOutSeat: null,
    });
    mockStartGame.mockRejectedValueOnce("bad");
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});

    render(<ShowTablesPage />);
    fireEvent.click(screen.getByRole("button", { name: "Start Game" }));

    await waitFor(() =>
      expect(alertSpy).toHaveBeenCalledWith("Failed to start game"),
    );
  });

  it("ignores start clicks when the game cannot start", () => {
    mockUseStartCheck.mockReturnValue({
      canStart: false,
      problems: [],
      sitOutSeat: null,
    });

    render(<ShowTablesPage />);
    fireEvent.click(screen.getByRole("button", { name: "Start Game" }));
    expect(mockStartGame).not.toHaveBeenCalled();
  });

  it("ignores a second start click while a start is already in flight", async () => {
    mockUseStartCheck.mockReturnValue({
      canStart: true,
      problems: [],
      sitOutSeat: null,
    });
    // Keep the first start pending so `starting` stays true.
    let resolveStart: () => void = () => {};
    mockStartGame.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          resolveStart = resolve;
        }),
    );

    render(<ShowTablesPage />);
    const startButton = screen.getByRole("button", { name: "Start Game" });

    fireEvent.click(startButton);
    // Second click while starting === true should be ignored.
    fireEvent.click(startButton);

    expect(mockStartGame).toHaveBeenCalledTimes(1);

    resolveStart();
    await waitFor(() => expect(mockMutateGame).toHaveBeenCalled());
  });

  it("shows the sit-out note when one pair short", () => {
    mockUseStartCheck.mockReturnValue({
      canStart: true,
      problems: [],
      sitOutSeat: "A3EW",
    });

    render(<ShowTablesPage />);

    expect(screen.getByText(/A3EW will sit out/)).toBeInTheDocument();
  });

  it("renders the setup tab bar passed via the tabs slot", () => {
    render(<ShowTablesPage tabs={<div>tab bar</div>} />);
    expect(screen.getByText("tab bar")).toBeInTheDocument();
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

  it("renders section headings and labels when multiple sections exist", () => {
    currentSections = [
      { section: "A", label: "A", tables: 1, ordinal: 0, selectedMovement: null },
      {
        section: "B",
        label: "Blue",
        tables: 1,
        ordinal: 1,
        selectedMovement: null,
      },
    ];

    render(<ShowTablesPage />);

    expect(screen.getByText("Section A")).toBeInTheDocument();
    expect(screen.getByText(/Section B — Blue/)).toBeInTheDocument();
  });
});
