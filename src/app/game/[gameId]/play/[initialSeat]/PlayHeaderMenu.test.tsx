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

// Stub the two dialogs so we assert only the menu wiring (which one opens),
// not their internals (and so no socket call is made).
vi.mock("./ChangeDeviceButton", () => ({
  ChangeDeviceButton: ({ open }: { open: boolean }) =>
    open ? <div data-testid="change-device-dialog" /> : null,
}));
vi.mock("./PairDetailsDialog", () => ({
  PairDetailsDialog: ({ open }: { open: boolean }) =>
    open ? <div data-testid="pair-details-dialog" /> : null,
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
