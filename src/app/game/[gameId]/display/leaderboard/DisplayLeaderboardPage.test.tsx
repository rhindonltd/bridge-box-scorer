import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

vi.mock("@/context/GameContext", () => ({
  useRequiredGame: () => ({
    game: { gameId: "g1", eventName: "Monday AM Pairs" },
    mutateGame: vi.fn(),
  }),
}));

// Capture what leaderboard the display renders without exercising the scoring
// plugins. Also records the splitColumns prop for the two-column tests.
const leaderboardSpy = vi.fn();
vi.mock("@/components/leaderboard/Leaderboard", () => ({
  Leaderboard: (props: {
    overallScoreAndParticipant: { type: string };
    splitColumns?: number;
  }) => {
    // Record only the leaderboard object so single-arg assertions stay simple;
    // the two-column tests read the split count off the rendered attribute.
    leaderboardSpy(props.overallScoreAndParticipant);
    return (
      <div data-testid="leaderboard" data-split-columns={props.splitColumns}>
        {props.overallScoreAndParticipant.type}
      </div>
    );
  },
}));

/**
 * jsdom has no `matchMedia`; the display uses it to decide whether the screen
 * is wide enough for two columns. This helper installs a stub reporting a
 * fixed match result so the width branch is deterministic in tests.
 */
function stubMatchMedia(matches: boolean) {
  vi.stubGlobal(
    "matchMedia",
    (query: string) =>
      ({
        matches,
        media: query,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
      }) as unknown as MediaQueryList,
  );
}

// The display consumes the leaderboard context; the provider is a passthrough
// and the hook returns the mocked snapshot.
const mockContext = vi.fn();
vi.mock("@/context/LeaderboardContext", () => ({
  LeaderboardProvider: ({ children }: { children: React.ReactNode }) =>
    children,
  useLeaderboardContext: () => mockContext(),
}));

import { DisplayLeaderboardPage } from "./DisplayLeaderboardPage";
import { DisplayLeaderboardView } from "./DisplayLeaderboardView";

/** A leaderboard with `n` participants (used as the row-count proxy). */
function combined(n = 0) {
  return {
    type: "PAIR_MP",
    overallScore: { scoring: "MP" },
    participants: Array.from({ length: n }, (_, i) => ({ id: String(i) })),
  };
}
function sectionLb(section: string, n = 0) {
  return {
    section,
    type: `PAIR_MP_${section}`,
    overallScore: { scoring: "MP" },
    participants: Array.from({ length: n }, (_, i) => ({ id: String(i) })),
  };
}

describe("DisplayLeaderboardPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
    // Default: narrow screen -> single column, so the existing tests are
    // unaffected. Two-column tests opt in with stubMatchMedia(true).
    stubMatchMedia(false);
  });

  it("shows only the combined leaderboard when there is a single section", () => {
    mockContext.mockReturnValue({
      leaderboard: combined(),
      sections: [sectionLb("A")],
      isLoading: false,
    });

    render(<DisplayLeaderboardPage />);

    // No toggle tabs for a single section.
    expect(screen.queryByText("Combined")).not.toBeInTheDocument();
    expect(leaderboardSpy).toHaveBeenLastCalledWith(
      expect.objectContaining({ type: "PAIR_MP" }),
    );
  });

  it("offers combined + per-section tabs when multiple sections exist", () => {
    mockContext.mockReturnValue({
      leaderboard: combined(),
      sections: [sectionLb("A"), sectionLb("B")],
      isLoading: false,
    });

    render(<DisplayLeaderboardPage />);

    expect(screen.getByText("Combined")).toBeInTheDocument();
    expect(screen.getByText("Section A")).toBeInTheDocument();
    expect(screen.getByText("Section B")).toBeInTheDocument();
    // Defaults to combined.
    expect(leaderboardSpy).toHaveBeenLastCalledWith(
      expect.objectContaining({ type: "PAIR_MP" }),
    );
  });

  it("shows the event name as the heading, and appends the section when one is selected", () => {
    mockContext.mockReturnValue({
      leaderboard: combined(),
      sections: [sectionLb("A"), sectionLb("B")],
      isLoading: false,
    });

    render(<DisplayLeaderboardPage />);

    // Combined view: just the event name.
    expect(
      screen.getByRole("heading", { name: "Monday AM Pairs" }),
    ).toBeInTheDocument();

    // Selecting a section appends it to the heading.
    fireEvent.click(screen.getByText("Section B"));
    expect(
      screen.getByRole("heading", { name: "Monday AM Pairs — Section B" }),
    ).toBeInTheDocument();
  });

  it("switches to a section's leaderboard when its tab is clicked", () => {
    mockContext.mockReturnValue({
      leaderboard: combined(),
      sections: [sectionLb("A"), sectionLb("B")],
      isLoading: false,
    });

    render(<DisplayLeaderboardPage />);

    fireEvent.click(screen.getByText("Section B"));

    expect(leaderboardSpy).toHaveBeenLastCalledWith(
      expect.objectContaining({ type: "PAIR_MP_B", section: "B" }),
    );

    // Switch back to the Combined tab.
    fireEvent.click(screen.getByText("Combined"));
    expect(leaderboardSpy).toHaveBeenLastCalledWith(
      expect.objectContaining({ type: "PAIR_MP" }),
    );
  });

  it("shows an empty state when there is no leaderboard yet", () => {
    mockContext.mockReturnValue({
      leaderboard: null,
      sections: [],
      isLoading: false,
    });

    render(<DisplayLeaderboardPage />);

    expect(screen.getByText("No Results Yet")).toBeInTheDocument();
  });

  it("shows a spinner while the leaderboard is loading", () => {
    mockContext.mockReturnValue({
      leaderboard: null,
      sections: [],
      isLoading: true,
    });

    const { container } = render(<DisplayLeaderboardPage />);
    expect(container.querySelector(".animate-spin")).toBeTruthy();
  });

  it("falls back to the combined leaderboard when the selected section is missing", () => {
    // Three "sections" so the tab bar shows, but their `section` values differ
    // from what we select, forcing the `?? combined` fallback path.
    mockContext.mockReturnValue({
      leaderboard: combined(),
      sections: [sectionLb("A"), sectionLb("B")],
      isLoading: false,
    });

    const { rerender } = render(<DisplayLeaderboardPage />);

    // Click Section B, then simulate that section disappearing from the
    // snapshot (e.g. a re-scored update) so `find` returns undefined and the
    // component falls back to the combined leaderboard.
    fireEvent.click(screen.getByText("Section B"));
    expect(leaderboardSpy).toHaveBeenLastCalledWith(
      expect.objectContaining({ type: "PAIR_MP_B" }),
    );

    mockContext.mockReturnValue({
      leaderboard: combined(),
      // B removed, but keep >1 section so the view stays "B".
      sections: [sectionLb("A"), sectionLb("C")],
      isLoading: false,
    });
    rerender(<DisplayLeaderboardPage />);

    // View is still "B" but no matching section -> combined fallback.
    expect(leaderboardSpy).toHaveBeenLastCalledWith(
      expect.objectContaining({ type: "PAIR_MP" }),
    );
  });

  describe("two-column layout", () => {
    function renderView(rowCount: number) {
      return render(
        <DisplayLeaderboardView
          eventName="Monday AM Pairs"
          leaderboard={combined(rowCount)}
          sections={[sectionLb("A", rowCount)]}
          isLoading={false}
        />,
      );
    }

    it("stays single-column with few places even on a wide screen", () => {
      stubMatchMedia(true); // wide screen
      renderView(4);
      expect(screen.getByTestId("leaderboard")).toHaveAttribute(
        "data-split-columns",
        "1",
      );
    });

    it("splits into two columns with many places on a wide screen", () => {
      stubMatchMedia(true); // wide screen
      renderView(20);
      expect(screen.getByTestId("leaderboard")).toHaveAttribute(
        "data-split-columns",
        "2",
      );
    });

    it("stays single-column with many places on a narrow screen", () => {
      stubMatchMedia(false); // narrow screen
      renderView(20);
      expect(screen.getByTestId("leaderboard")).toHaveAttribute(
        "data-split-columns",
        "1",
      );
    });
  });

  describe("section rotation", () => {
    // In jsdom the standings have no height, so the auto-scroll has nothing to
    // scroll and advances as soon as the (short) dwell elapses. Uses real
    // timers because the scroll/advance loop is driven by requestAnimationFrame.
    it("auto-advances through Combined and every section once the dwell elapses", async () => {
      render(
        <DisplayLeaderboardView
          eventName="Monday AM Pairs"
          leaderboard={combined()}
          sections={[sectionLb("A"), sectionLb("B")]}
          isLoading={false}
          dwellMs={50}
        />,
      );

      // Starts on Combined.
      expect(leaderboardSpy).toHaveBeenLastCalledWith(
        expect.objectContaining({ type: "PAIR_MP" }),
      );

      // The rotation cycles quickly here (short dwell + rAF), so assert each
      // view is reached at some point rather than that it is the *latest* at a
      // given poll — the latter races with the next rotation under load.
      const rendered = () =>
        leaderboardSpy.mock.calls.map((c) => c[0].type as string);

      await waitFor(() => expect(rendered()).toContain("PAIR_MP_A"));
      await waitFor(() => expect(rendered()).toContain("PAIR_MP_B"));
    });

    it("does not rotate a single-section game", async () => {
      render(
        <DisplayLeaderboardView
          eventName="Monday AM Pairs"
          leaderboard={combined()}
          sections={[sectionLb("A")]}
          isLoading={false}
          dwellMs={50}
        />,
      );
      // Give it well over the dwell; with only one view there is nothing to
      // rotate to, so it stays on Combined.
      await new Promise((r) => setTimeout(r, 250));
      expect(leaderboardSpy).toHaveBeenLastCalledWith(
        expect.objectContaining({ type: "PAIR_MP" }),
      );
    });
  });
});
