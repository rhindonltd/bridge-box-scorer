import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ---- mocks ----

vi.mock("@/context/GameContext", () => ({
  useRequiredGame: () => ({ game: { gameId: "g1" } }),
}));

const mockGoTo = vi.fn();
let currentStep = "tables";
vi.mock("@/hooks/flow", () => ({
  createFlow: () => ({}),
  useFlow: () => ({ step: currentStep, goTo: mockGoTo }),
}));

vi.mock("./ShowTablesPage", () => ({
  ShowTablesPage: ({ menu }: { menu?: React.ReactNode }) => (
    <div>
      {menu}
      <div>tables-view</div>
    </div>
  ),
}));

vi.mock("@/components/manage/sections/MovementStep", () => ({
  MovementStep: () => <div>sections-view</div>,
}));

vi.mock("@/components/manage/sections/ManageSectionsScreen", () => ({
  ManageSectionsScreen: () => <div>manage-sections-view</div>,
}));

// Section count drives whether the "Manage sections" menu item appears.
let mockSectionCount = 2;
vi.mock("@/hooks/sections", () => ({
  useSections: () => ({
    sections: Array.from({ length: mockSectionCount }, (_, i) => ({
      section: String.fromCharCode(65 + i),
    })),
    isLoading: false,
  }),
}));

vi.mock("@/app/game/[gameId]/manage/timer/TimerSetup", () => ({
  TimerSetup: ({ embedded }: { embedded?: boolean }) => (
    <div>timer-view {embedded ? "embedded" : "standalone"}</div>
  ),
}));

// Render both the header slot and the body so the setup menu is reachable
// regardless of which step owns the layout.
vi.mock("@/components/layout/GamePageLayout", () => ({
  GamePageLayout: ({
    headerRight,
    children,
  }: {
    headerRight?: React.ReactNode;
    children: React.ReactNode;
  }) => (
    <div>
      {headerRight}
      {children}
    </div>
  ),
}));

import { SetupGamePage } from "./SetupGamePage";

async function openSetupMenu() {
  await userEvent.click(screen.getByRole("button", { name: "Setup menu" }));
}

describe("SetupGamePage setup menu", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentStep = "tables";
    mockSectionCount = 2;
  });

  it("renders the setup menu and Tables view on the tables step", async () => {
    render(<SetupGamePage />);

    expect(screen.getByText("tables-view")).toBeInTheDocument();
    await openSetupMenu();
    expect(screen.getByRole("menuitem", { name: "Tables" })).toHaveAttribute(
      "aria-current",
      "true",
    );
  });

  it("navigates to the movements step when the Movement item is chosen", async () => {
    render(<SetupGamePage />);

    await openSetupMenu();
    await userEvent.click(screen.getByRole("menuitem", { name: "Movement" }));
    expect(mockGoTo).toHaveBeenCalledWith("movements");
  });

  it("shows the sections view and marks Movement active on the movements step", async () => {
    currentStep = "movements";
    render(<SetupGamePage />);

    expect(screen.getByText("sections-view")).toBeInTheDocument();
    await openSetupMenu();
    expect(screen.getByRole("menuitem", { name: "Movement" })).toHaveAttribute(
      "aria-current",
      "true",
    );
  });

  it("navigates to the timer step when the Timer item is chosen", async () => {
    render(<SetupGamePage />);

    await openSetupMenu();
    await userEvent.click(screen.getByRole("menuitem", { name: "Timer" }));
    expect(mockGoTo).toHaveBeenCalledWith("timer");
  });

  it("renders the embedded timer view and marks Timer active on the timer step", async () => {
    currentStep = "timer";
    render(<SetupGamePage />);

    expect(screen.getByText(/timer-view/)).toHaveTextContent("embedded");
    await openSetupMenu();
    expect(screen.getByRole("menuitem", { name: "Timer" })).toHaveAttribute(
      "aria-current",
      "true",
    );
  });

  it("navigates to manage-sections when the Manage sections item is chosen", async () => {
    render(<SetupGamePage />);

    await openSetupMenu();
    await userEvent.click(
      screen.getByRole("menuitem", { name: "Manage sections" }),
    );
    expect(mockGoTo).toHaveBeenCalledWith("manage-sections");
  });

  it("renders the manage-sections view on the manage-sections step", async () => {
    currentStep = "manage-sections";
    render(<SetupGamePage />);

    expect(screen.getByText("manage-sections-view")).toBeInTheDocument();
    await openSetupMenu();
    expect(
      screen.getByRole("menuitem", { name: "Manage sections" }),
    ).toHaveAttribute("aria-current", "true");
  });

  it("hides the Manage sections item for a single-section game", async () => {
    mockSectionCount = 1;
    render(<SetupGamePage />);

    await openSetupMenu();
    expect(
      screen.queryByRole("menuitem", { name: "Manage sections" }),
    ).toBeNull();
    // The other items remain.
    expect(screen.getByRole("menuitem", { name: "Tables" })).toBeInTheDocument();
  });

  it("redirects away from manage-sections when the game is single-section", () => {
    mockSectionCount = 1;
    currentStep = "manage-sections";
    render(<SetupGamePage />);

    expect(screen.queryByText("manage-sections-view")).toBeNull();
    expect(mockGoTo).toHaveBeenCalledWith("movements");
  });
});
