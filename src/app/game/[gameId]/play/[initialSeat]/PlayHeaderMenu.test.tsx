import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockUseAssignment = vi.fn();
vi.mock("@/context/AssignmentContext", () => ({
  useAssignment: () => mockUseAssignment(),
}));

// The menu derives the Pair Details section/pair labels from the game and its
// sections; stub both. Defaults: a single-section two-winner Mitchell pairs
// game (overridden per test as needed).
const mockUseGame = vi.fn();
vi.mock("@/context/GameContext", () => ({
  useGame: () => mockUseGame(),
}));

const mockUseSections = vi.fn();
vi.mock("@/hooks/sections", () => ({
  useSections: () => mockUseSections(),
}));

// PlayHeaderMenu now renders the director play→manage switch, which uses the
// router; stub it so no real navigation is attempted.
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

// Stub the two dialogs so we assert only the menu wiring (which one opens),
// not their internals (and so no socket call is made).
vi.mock("./ChangeDeviceButton", () => ({
  ChangeDeviceButton: ({ open }: { open: boolean }) =>
    open ? <div data-testid="change-device-dialog" /> : null,
}));
// Capture the dialog's props so we can assert the derived section/pair labels
// without rendering the real dialog.
const pairDetailsProps = vi.fn();
vi.mock("./PairDetailsDialog", () => ({
  PairDetailsDialog: (props: {
    open: boolean;
    section: string | null;
    pairLabel: string | null;
  }) => {
    pairDetailsProps(props);
    return props.open ? (
      <div data-testid="pair-details-dialog">
        <span data-testid="pd-section">{props.section ?? "—"}</span>
        <span data-testid="pd-pair">{props.pairLabel ?? "—"}</span>
      </div>
    ) : null;
  },
}));

import { PlayHeaderMenu } from "./PlayHeaderMenu";

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
    // Default: a single-section standard (two-winner) Mitchell pairs game.
    mockUseGame.mockReturnValue({
      game: { gameType: "PAIRS", eventFormat: "STANDARD" },
    });
    mockUseSections.mockReturnValue({
      sections: [
        {
          section: "A",
          label: "A",
          tables: 4,
          ordinal: 0,
          selectedMovement: {
            source: "MITCHELL",
            mitchell: { tables: 4, rounds: 8, boardsPerRound: 3 },
          },
        },
      ],
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

  it("opens the change-device dialog from its menu item", async () => {
    const user = userEvent.setup();
    render(<PlayHeaderMenu gameId="g1" seat="A1NS" />);

    expect(screen.queryByTestId("change-device-dialog")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Menu" }));
    await user.click(screen.getByRole("menuitem", { name: "Change device" }));

    expect(screen.getByTestId("change-device-dialog")).toBeInTheDocument();
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

  it("still opens Pair details when no pair is loaded yet", async () => {
    // No pair yet (still loading): the dialog opens and shows its loading state.
    mockUseAssignment.mockReturnValue({ assignment: null, pair: null });
    const user = userEvent.setup();
    render(<PlayHeaderMenu gameId="g1" seat="A1NS" />);

    await user.click(screen.getByRole("button", { name: "Menu" }));
    await user.click(screen.getByRole("menuitem", { name: "Pair details" }));

    expect(screen.getByTestId("pair-details-dialog")).toBeInTheDocument();
  });

  async function openPairDetails(seat = "A1NS") {
    const user = userEvent.setup();
    render(<PlayHeaderMenu gameId="g1" seat={seat} />);
    await user.click(screen.getByRole("button", { name: "Menu" }));
    await user.click(screen.getByRole("menuitem", { name: "Pair details" }));
  }

  it("keeps the direction in the pair number for a two-winner Mitchell game", async () => {
    // Default mocks: single-section standard Mitchell (two-winner).
    await openPairDetails("A1NS");
    expect(screen.getByTestId("pd-pair")).toHaveTextContent("1NS");
    // Single section → no section shown.
    expect(screen.getByTestId("pd-section")).toHaveTextContent("—");
  });

  it("drops the direction for a one-winner (arrow-switched) pairs game", async () => {
    mockUseSections.mockReturnValue({
      sections: [
        {
          section: "A",
          label: "A",
          tables: 4,
          ordinal: 0,
          selectedMovement: {
            source: "MITCHELL",
            mitchell: {
              tables: 4,
              rounds: 8,
              boardsPerRound: 3,
              arrowSwitchRounds: 1,
            },
          },
        },
      ],
    });

    await openPairDetails("A1NS");
    expect(screen.getByTestId("pd-pair")).toHaveTextContent("1");
    expect(screen.getByTestId("pd-pair")).not.toHaveTextContent("1NS");
  });

  it("keeps the direction for a teams game", async () => {
    mockUseGame.mockReturnValue({
      game: { gameType: "TEAMS", eventFormat: "STANDARD" },
    });
    mockUseSections.mockReturnValue({
      sections: [
        {
          section: "A",
          label: "A",
          tables: 4,
          ordinal: 0,
          selectedMovement: {
            source: "ROUND_ROBIN_TEAMS",
            roundRobinTeams: { teams: 4, rounds: 3, boardsPerRound: 6 },
          },
        },
      ],
    });

    await openPairDetails("A2EW");
    expect(screen.getByTestId("pd-pair")).toHaveTextContent("2EW");
  });

  it("shows the section for a multi-section game", async () => {
    const mitchell = {
      source: "MITCHELL" as const,
      mitchell: { tables: 4, rounds: 8, boardsPerRound: 3 },
    };
    mockUseSections.mockReturnValue({
      sections: [
        { section: "A", label: "A", tables: 4, ordinal: 0, selectedMovement: mitchell },
        { section: "B", label: "B", tables: 4, ordinal: 1, selectedMovement: mitchell },
      ],
    });

    await openPairDetails("B3NS");
    // The pair's own section (B), looked up from its seat — not just the first.
    expect(screen.getByTestId("pd-section")).toHaveTextContent("B");
    expect(screen.getByTestId("pd-pair")).toHaveTextContent("3NS");
  });
});
