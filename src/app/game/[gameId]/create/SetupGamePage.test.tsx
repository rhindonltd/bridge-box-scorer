import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ---- mocks ----

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/context/GameContext", () => ({
  useRequiredGame: () => ({ game: { gameId: "g1" } }),
}));

// The real goTo pushes a `?step=` param; the component recomputes `step` from
// that param on the next render. The mock mirrors that by advancing
// `currentStep`, so a test can navigate (recording a "previous step") and then
// re-render to observe the new view — which is what the back-arrow
// "return to the previous setup screen" behaviour depends on.
const mockGoTo = vi.fn((next: string) => {
  currentStep = next;
});
let currentStep = "tables";
vi.mock("@/hooks/flow", () => ({
  createFlow: () => ({}),
  useFlow: () => ({ step: currentStep, goTo: mockGoTo }),
}));

vi.mock("./ShowTablesPage", () => ({
  ShowTablesPage: ({
    menu,
    onEditMovement,
    backAction,
  }: {
    menu?: React.ReactNode;
    onEditMovement?: () => void;
    backAction?: () => void;
  }) => (
    <div>
      {menu}
      <div>tables-view</div>
      <button onClick={() => onEditMovement?.()}>edit-movement</button>
      <button onClick={() => backAction?.()} disabled={!backAction}>
        tables-back
      </button>
    </div>
  ),
}));

vi.mock("./StartGameScreen", () => ({
  StartGameScreen: ({ menu }: { menu?: React.ReactNode }) => (
    <div>
      {menu}
      <div>start-game-view</div>
    </div>
  ),
}));

vi.mock("./EditEventDetailsPage", () => ({
  EditEventDetailsPage: ({ onDone }: { onDone: () => void }) => (
    <div>
      <div>edit-event-details-view</div>
      <button onClick={onDone}>edit-done</button>
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
    headerTitle,
    headerRight,
    backAction,
    children,
  }: {
    headerTitle?: string;
    headerRight?: React.ReactNode;
    backAction?: () => void;
    children: React.ReactNode;
  }) => (
    <div>
      {headerRight}
      {backAction && (
        <button onClick={() => backAction()}>{`${headerTitle}-back`}</button>
      )}
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

  it("navigates to the tables step when the Tables item is chosen", async () => {
    // Start on a different step so choosing Tables actually invokes its
    // onSelect handler.
    currentStep = "timer";
    render(<SetupGamePage />);

    await openSetupMenu();
    await userEvent.click(screen.getByRole("menuitem", { name: "Tables" }));
    expect(mockGoTo).toHaveBeenCalledWith("tables");
  });

  it("opens the editable event-details screen from the Tables back action", async () => {
    render(<SetupGamePage />);

    // Back from Tables shows the (prefilled) event-details editor, not the
    // blank create form, and does not leave the setup flow.
    await userEvent.click(screen.getByRole("button", { name: "tables-back" }));
    expect(screen.getByText("edit-event-details-view")).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
    expect(mockGoTo).not.toHaveBeenCalled();

    // Finishing the editor returns to the setup view.
    await userEvent.click(screen.getByRole("button", { name: "edit-done" }));
    expect(screen.getByText("tables-view")).toBeInTheDocument();
  });

  it("jumps to the movements step from the Tables view's edit-movement action", async () => {
    render(<SetupGamePage />);

    await userEvent.click(
      screen.getByRole("button", { name: "edit-movement" }),
    );
    expect(mockGoTo).toHaveBeenCalledWith("movements");
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
    expect(
      screen.getByRole("menuitem", { name: "Tables" }),
    ).toBeInTheDocument();
  });

  it("redirects away from manage-sections when the game is single-section", () => {
    mockSectionCount = 1;
    currentStep = "manage-sections";
    render(<SetupGamePage />);

    expect(screen.queryByText("manage-sections-view")).toBeNull();
    expect(mockGoTo).toHaveBeenCalledWith("movements");
  });

  it("navigates to the start step when the Start Game item is chosen", async () => {
    render(<SetupGamePage />);

    await openSetupMenu();
    await userEvent.click(screen.getByRole("menuitem", { name: "Start Game" }));
    expect(mockGoTo).toHaveBeenCalledWith("start");
  });

  it("renders the Start Game view on the start step", async () => {
    currentStep = "start";
    render(<SetupGamePage />);

    expect(screen.getByText("start-game-view")).toBeInTheDocument();
    await openSetupMenu();
    expect(
      screen.getByRole("menuitem", { name: "Start Game" }),
    ).toHaveAttribute("aria-current", "true");
  });

  it("shows Start Game in the menu even for a single-section game", async () => {
    mockSectionCount = 1;
    render(<SetupGamePage />);

    await openSetupMenu();
    expect(
      screen.getByRole("menuitem", { name: "Start Game" }),
    ).toBeInTheDocument();
  });

  it("returns to the main menu when the Return to main menu item is chosen", async () => {
    render(<SetupGamePage />);

    await openSetupMenu();
    await userEvent.click(
      screen.getByRole("menuitem", { name: "Return to main menu" }),
    );
    expect(mockPush).toHaveBeenCalledWith("/");
    // It leaves the flow rather than navigating within it.
    expect(mockGoTo).not.toHaveBeenCalled();
  });
});

describe("SetupGamePage setup back arrow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentStep = "tables";
    mockSectionCount = 2;
  });

  // The "previous step" lives in a ref on a single mounted component, so these
  // tests keep ONE render and advance the view with rerender() after each
  // navigation (the goTo mock has already updated `currentStep`). Mounting a
  // second component would reset the ref and lose the recorded previous step.

  it("returns Movement's back arrow to Tables when the director came from Tables", async () => {
    // Start on Tables, then open Movement from the menu — recording Tables as
    // the screen just left.
    const { rerender } = render(<SetupGamePage />);
    await openSetupMenu();
    await userEvent.click(screen.getByRole("menuitem", { name: "Movement" }));
    expect(mockGoTo).toHaveBeenLastCalledWith("movements");

    // The goTo mock advanced the step to Movement; re-render the same instance
    // to show that view.
    rerender(<SetupGamePage />);
    expect(screen.getByText("sections-view")).toBeInTheDocument();

    // Back from Movement goes to Tables (the screen it came from), not the
    // event-details editor.
    await userEvent.click(screen.getByRole("button", { name: "Movement-back" }));
    expect(mockGoTo).toHaveBeenLastCalledWith("tables");
    expect(screen.queryByText("edit-event-details-view")).toBeNull();
  });

  it("returns Movement's back arrow to Timer when the director came from Timer", async () => {
    currentStep = "timer";
    const { rerender } = render(<SetupGamePage />);

    // Timer → Movement, recording Timer as the previous screen.
    await openSetupMenu();
    await userEvent.click(screen.getByRole("menuitem", { name: "Movement" }));
    rerender(<SetupGamePage />);
    expect(screen.getByText("sections-view")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Movement-back" }));
    expect(mockGoTo).toHaveBeenLastCalledWith("timer");
    expect(screen.queryByText("edit-event-details-view")).toBeNull();
  });

  it("returns Timer's back arrow to Tables when the director came from Tables", async () => {
    const { rerender } = render(<SetupGamePage />);

    // Tables → Timer, recording Tables as the previous screen.
    await openSetupMenu();
    await userEvent.click(screen.getByRole("menuitem", { name: "Timer" }));
    rerender(<SetupGamePage />);
    expect(screen.getByText(/timer-view/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Timer-back" }));
    expect(mockGoTo).toHaveBeenLastCalledWith("tables");
    expect(screen.queryByText("edit-event-details-view")).toBeNull();
  });

  it("returns Tables' back arrow to Movement when the director came from Movement", async () => {
    currentStep = "movements";
    const { rerender } = render(<SetupGamePage />);

    // Movement → Tables, recording Movement as the previous screen.
    await openSetupMenu();
    await userEvent.click(screen.getByRole("menuitem", { name: "Tables" }));
    rerender(<SetupGamePage />);
    expect(screen.getByText("tables-view")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "tables-back" }));
    expect(mockGoTo).toHaveBeenLastCalledWith("movements");
    expect(screen.queryByText("edit-event-details-view")).toBeNull();
  });

  it("exits to the event-details editor on a second back rather than bouncing", async () => {
    // Tables → Movement, so Movement's back returns to Tables.
    const { rerender } = render(<SetupGamePage />);
    await openSetupMenu();
    await userEvent.click(screen.getByRole("menuitem", { name: "Movement" }));
    rerender(<SetupGamePage />);

    // First back: Movement → Tables.
    await userEvent.click(screen.getByRole("button", { name: "Movement-back" }));
    expect(mockGoTo).toHaveBeenLastCalledWith("tables");
    rerender(<SetupGamePage />);
    expect(screen.getByText("tables-view")).toBeInTheDocument();

    // Second back does NOT bounce back to Movement; it opens the event-details
    // editor instead. The two navigations so far are the menu "Movement" click
    // and the first back to Tables — this second back triggers no further
    // navigation.
    await userEvent.click(screen.getByRole("button", { name: "tables-back" }));
    expect(screen.getByText("edit-event-details-view")).toBeInTheDocument();
    expect(mockGoTo).toHaveBeenCalledTimes(2);
    expect(mockGoTo).not.toHaveBeenLastCalledWith("movements");
  });

  it("falls back to the event-details editor when there is no previous setup screen", async () => {
    // No navigation has happened, so Tables' back arrow has no sibling screen
    // to return to and opens the (prefilled) event-details editor instead.
    render(<SetupGamePage />);

    await userEvent.click(screen.getByRole("button", { name: "tables-back" }));
    expect(screen.getByText("edit-event-details-view")).toBeInTheDocument();
    expect(mockGoTo).not.toHaveBeenCalled();
  });

  it("falls back to the event-details editor when the previous screen was Manage sections", async () => {
    currentStep = "manage-sections";
    const { rerender } = render(<SetupGamePage />);

    // Manage sections → Movement, recording Manage sections as the previous
    // screen. It is not one of the three interchangeable setup screens, so
    // Movement's back arrow has no sibling to return to and opens the
    // event-details editor.
    await openSetupMenu();
    await userEvent.click(screen.getByRole("menuitem", { name: "Movement" }));
    rerender(<SetupGamePage />);
    expect(screen.getByText("sections-view")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Movement-back" }));
    expect(screen.getByText("edit-event-details-view")).toBeInTheDocument();
  });
});
