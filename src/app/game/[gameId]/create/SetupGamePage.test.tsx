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
  ShowTablesPage: ({ backAction }: { backAction?: () => void }) => (
    <div>
      <div>tables-view</div>
      <button onClick={() => backAction?.()} disabled={!backAction}>
        tables-back
      </button>
    </div>
  ),
}));

vi.mock("./StartGameScreen", () => ({
  StartGameScreen: ({ onBack }: { onBack?: () => void }) => (
    <div>
      <button onClick={() => onBack?.()}>start-back</button>
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

describe("SetupGamePage step pages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentStep = "tables";
  });

  it.each([
    ["tables", /tables-view/],
    ["movements", /sections-view/],
    ["timer", /timer-view/],
    ["start", /start-game-view/],
  ])("renders the %s page", (step, text) => {
    currentStep = step;
    render(<SetupGamePage />);
    expect(screen.getByText(text)).toBeInTheDocument();
  });

  it("embeds the timer", () => {
    currentStep = "timer";
    render(<SetupGamePage />);
    expect(screen.getByText(/timer-view/)).toHaveTextContent("embedded");
  });

  it.each(["tables", "movements", "timer", "start"])(
    "has no hamburger on the %s page",
    (step) => {
      currentStep = step;
      render(<SetupGamePage />);
      expect(
        screen.queryByRole("button", { name: "Setup menu" }),
      ).not.toBeInTheDocument();
    },
  );
});

describe("SetupGamePage setup menu page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentStep = "menu";
  });

  it("lands on the menu with Game Details, Tables, Movement, Timer, Start Game and Delete Game", () => {
    render(<SetupGamePage />);

    for (const name of [
      "Game Details",
      "Tables",
      "Movement",
      "Timer",
      "Start Game",
      "Delete Game",
    ]) {
      expect(screen.getByRole("button", { name })).toBeInTheDocument();
    }
    expect(screen.queryByText("tables-view")).toBeNull();
  });

  it.each([
    ["Tables", "tables"],
    ["Movement", "movements"],
    ["Timer", "timer"],
    ["Start Game", "start"],
  ])("opens the %s page", async (label, step) => {
    render(<SetupGamePage />);

    await userEvent.click(screen.getByRole("button", { name: label }));
    expect(mockGoTo).toHaveBeenCalledWith(step);
  });

  it("opens the delete confirmation from Delete Game", async () => {
    render(<SetupGamePage />);

    await userEvent.click(screen.getByRole("button", { name: "Delete Game" }));
    expect(mockPush).toHaveBeenCalledWith(
      "/game/g1/manage/delete-game?from=setup",
    );
  });

  it("opens Share Director Access from its button, with no hamburger", async () => {
    render(<SetupGamePage />);
    expect(
      screen.queryByRole("button", { name: "Setup options" }),
    ).not.toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("button", { name: "Share Director Access" }),
    );
    expect(mockPush).toHaveBeenCalledWith(
      "/game/g1/manage/share-access?from=setup",
    );
  });

  it("opens the event-details editor and returns to the menu when done", async () => {
    render(<SetupGamePage />);

    await userEvent.click(screen.getByRole("button", { name: "Game Details" }));
    expect(screen.getByText("edit-event-details-view")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "edit-done" }));
    expect(screen.getByRole("button", { name: "Tables" })).toBeInTheDocument();
  });
});

describe("SetupGamePage back arrows", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each([
    ["tables", "tables-back"],
    ["movements", "Movement-back"],
    ["timer", "Timer-back"],
    ["start", "start-back"],
  ])("returns to the setup menu from the %s page", async (step, backName) => {
    currentStep = step;
    render(<SetupGamePage />);

    await userEvent.click(screen.getByRole("button", { name: backName }));
    expect(mockGoTo).toHaveBeenCalledWith("menu");
  });
});
