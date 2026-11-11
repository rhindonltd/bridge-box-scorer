import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockUseAssignment = vi.fn();
vi.mock("@/context/AssignmentContext", () => ({
  useAssignment: () => mockUseAssignment(),
}));

// PlayHeaderMenu now renders the director play→manage switch, which uses the
// router; stub it so no real navigation is attempted.
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

// Stub the Pair details dialog so we assert only the menu wiring, not its
// internals.
vi.mock("./PairDetailsDialog", () => ({
  PairDetailsDialog: ({ open }: { open: boolean }) =>
    open ? <div data-testid="pair-details-dialog" /> : null,
}));

import { PlayHeaderMenu } from "./PlayHeaderMenu";
import { GameContext } from "@/context/GameContext";

describe("PlayHeaderMenu", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockUseAssignment.mockReturnValue({
      assignment: { type: "PAIR", id: "3" },
      pair: {
        side: "NS",
        players: [
          { id: 1, firstName: "Ann", lastName: "Smith", nationalId: "1001" },
          { id: 2, firstName: "Ben", lastName: "Jones", nationalId: null },
        ],
      },
    });
  });

  it("renders a hamburger trigger labelled Menu", () => {
    render(<PlayHeaderMenu gameId="g1" seat="A1NS" />);
    expect(screen.getByRole("button", { name: "Menu" })).toBeInTheDocument();
  });

  it("reveals Change device and Pair details when opened", async () => {
    const user = userEvent.setup();
    render(<PlayHeaderMenu gameId="g1" seat="A1NS" />);

    await user.click(screen.getByRole("button", { name: "Menu" }));

    expect(
      screen.getByRole("menuitem", { name: "Change device" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("menuitem", { name: "Pair details" }),
    ).toBeInTheDocument();
  });

  it("always offers Handover and routes to the handover screen", async () => {
    // Handover is available for any seated seat (not gated on a pre-marked
    // stand-in): an arriving pair can take over at any time.
    const user = userEvent.setup();
    render(<PlayHeaderMenu gameId="g1" seat="A1NS" />);

    await user.click(screen.getByRole("button", { name: "Menu" }));
    await user.click(screen.getByRole("menuitem", { name: "Handover" }));
    expect(mockPush).toHaveBeenCalledWith("/game/g1/play/A1NS/handover");
  });

  it("offers Scorecard in a pairs event (incl. Swiss Pairs) and routes to it", async () => {
    const user = userEvent.setup();
    for (const eventFormat of ["STANDARD", "SWISS"]) {
      mockPush.mockClear();
      const { unmount } = render(
        <GameContext.Provider
          value={{ game: { gameType: "PAIRS", eventFormat } } as never}
        >
          <PlayHeaderMenu gameId="g1" seat="A1NS" />
        </GameContext.Provider>,
      );
      await user.click(screen.getByRole("button", { name: "Menu" }));
      await user.click(screen.getByRole("menuitem", { name: "Scorecard" }));
      expect(mockPush).toHaveBeenCalledWith("/game/g1/play/A1NS/scorecard");
      unmount();
    }
  });

  it("does not offer Scorecard for a teams event", async () => {
    const user = userEvent.setup();
    render(
      <GameContext.Provider
        value={
          { game: { gameType: "TEAMS", eventFormat: "STANDARD" } } as never
        }
      >
        <PlayHeaderMenu gameId="g1" seat="A1NS" />
      </GameContext.Provider>,
    );
    await user.click(screen.getByRole("button", { name: "Menu" }));
    expect(
      screen.queryByRole("menuitem", { name: "Scorecard" }),
    ).not.toBeInTheDocument();
  });

  it("offers Withdraw in a pairs event and routes to the withdraw screen", async () => {
    const user = userEvent.setup();
    render(
      <GameContext.Provider
        value={
          { game: { gameType: "PAIRS", eventFormat: "STANDARD" } } as never
        }
      >
        <PlayHeaderMenu gameId="g1" seat="A1NS" />
      </GameContext.Provider>,
    );
    await user.click(screen.getByRole("button", { name: "Menu" }));
    await user.click(screen.getByRole("menuitem", { name: "Withdraw" }));
    expect(mockPush).toHaveBeenCalledWith("/game/g1/play/A1NS/withdraw");
  });

  it("does not offer Withdraw for a teams or Swiss event", async () => {
    const user = userEvent.setup();
    for (const game of [
      { gameType: "TEAMS", eventFormat: "STANDARD" },
      { gameType: "PAIRS", eventFormat: "SWISS" },
    ]) {
      const { unmount } = render(
        <GameContext.Provider value={{ game } as never}>
          <PlayHeaderMenu gameId="g1" seat="A1NS" />
        </GameContext.Provider>,
      );
      await user.click(screen.getByRole("button", { name: "Menu" }));
      expect(
        screen.queryByRole("menuitem", { name: "Withdraw" }),
      ).not.toBeInTheDocument();
      unmount();
    }
  });

  it("opens the Change device page from its menu item", async () => {
    const user = userEvent.setup();
    render(<PlayHeaderMenu gameId="g1" seat="A1NS" />);

    await user.click(screen.getByRole("button", { name: "Menu" }));
    await user.click(screen.getByRole("menuitem", { name: "Change device" }));

    // Its own page (like Handover / Withdraw), not a dialog.
    expect(mockPush).toHaveBeenCalledWith("/game/g1/play/A1NS/change-device");
  });

  it("opens the pair-details dialog from its menu item", async () => {
    const user = userEvent.setup();
    render(<PlayHeaderMenu gameId="g1" seat="A1NS" />);

    expect(screen.queryByTestId("pair-details-dialog")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Menu" }));
    await user.click(screen.getByRole("menuitem", { name: "Pair details" }));

    expect(screen.getByTestId("pair-details-dialog")).toBeInTheDocument();
  });

  it("offers 'Manage' in the menu for a director device", async () => {
    localStorage.setItem("director:g1", "tok");
    const user = userEvent.setup();
    render(<PlayHeaderMenu gameId="g1" seat="A1NS" />);

    await user.click(screen.getByRole("button", { name: "Menu" }));
    expect(
      screen.getByRole("menuitem", { name: "Manage" }),
    ).toBeInTheDocument();
  });

  it("does not offer 'Manage' when the device is not a director", async () => {
    const user = userEvent.setup();
    render(<PlayHeaderMenu gameId="g1" seat="A1NS" />);

    await user.click(screen.getByRole("button", { name: "Menu" }));
    expect(screen.queryByRole("menuitem", { name: "Manage" })).toBeNull();
  });

  it("offers 'Share Director Access' to a director and opens the share screen", async () => {
    localStorage.setItem("director:g1", "tok");
    const user = userEvent.setup();
    render(<PlayHeaderMenu gameId="g1" seat="A1NS" />);
    await user.click(screen.getByRole("button", { name: "Menu" }));
    await user.click(
      screen.getByRole("menuitem", { name: "Share Director Access" }),
    );
    expect(mockPush).toHaveBeenCalledWith("/game/g1/manage/share-access");
  });
  it("does not offer 'Share Director Access' when the device is not a director", async () => {
    const user = userEvent.setup();
    render(<PlayHeaderMenu gameId="g1" seat="A1NS" />);
    await user.click(screen.getByRole("button", { name: "Menu" }));
    expect(
      screen.queryByRole("menuitem", { name: "Share Director Access" }),
    ).toBeNull();
  });
  it("navigates to the manage menu from the director 'Manage' item", async () => {
    localStorage.setItem("director:g1", "tok");
    const user = userEvent.setup();
    render(<PlayHeaderMenu gameId="g1" seat="A1NS" />);

    await user.click(screen.getByRole("button", { name: "Menu" }));
    await user.click(screen.getByRole("menuitem", { name: "Manage" }));
    expect(mockPush).toHaveBeenCalledWith("/game/g1/manage");
  });

  it("renders screen-specific extra items and fires their handler", async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(
      <PlayHeaderMenu
        gameId="g1"
        seat="A1NS"
        extraItems={[
          { label: "Results", active: true, onSelect: vi.fn() },
          { label: "Deal", active: false, onSelect },
        ]}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Menu" }));

    // The extra items appear alongside the shared actions.
    expect(
      screen.getByRole("menuitem", { name: "Results" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Deal" })).toBeInTheDocument();

    await user.click(screen.getByRole("menuitem", { name: "Deal" }));
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it("passes a null pairId when no assignment is loaded yet", async () => {
    // No assignment/pair yet (still loading): `assignment?.id ?? null` takes
    // the null fallback branch.
    mockUseAssignment.mockReturnValue({ assignment: null, pair: null });
    const user = userEvent.setup();
    render(<PlayHeaderMenu gameId="g1" seat="A1NS" />);

    await user.click(screen.getByRole("button", { name: "Menu" }));
    await user.click(screen.getByRole("menuitem", { name: "Pair details" }));

    // Dialog still opens; the null pairId branch was exercised on render.
    expect(screen.getByTestId("pair-details-dialog")).toBeInTheDocument();
  });
});
