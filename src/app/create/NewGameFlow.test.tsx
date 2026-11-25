import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const mockPush = vi.fn();
const mockParams = vi.hoisted(() => ({ step: null as string | null }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => ({
    get: (key: string) => (key === "step" ? mockParams.step : null),
  }),
}));

const mockBack = vi.fn();
const mockUseBackNavigation = vi.fn((_fallback: string) => ({
  onBack: mockBack,
}));
vi.mock("@/hooks/useBackNavigation", () => ({
  useBackNavigation: (fallback: string) => mockUseBackNavigation(fallback),
}));

vi.mock("@/app/create/CreateGamePage", () => ({
  CreateGamePage: ({ onBack }: { onBack?: () => void }) => (
    <div>
      <span>details-form</span>
      <button onClick={onBack}>form-back</button>
    </div>
  ),
}));

vi.mock("@/app/game/[gameId]/create/SetupMenuPage", () => ({
  SetupMenuPage: ({
    draft,
    onGameDetailsClick,
  }: {
    draft?: boolean;
    onGameDetailsClick: () => void;
  }) => (
    <div>
      <span>{draft ? "draft-menu" : "menu"}</span>
      <button onClick={onGameDetailsClick}>Game Details</button>
    </div>
  ),
}));

import { NewGameFlow } from "./NewGameFlow";

describe("NewGameFlow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockParams.step = null;
  });

  it("shows the draft Set Up Game menu, whose Game Details opens the form", () => {
    render(<NewGameFlow />);

    expect(screen.getByText("draft-menu")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Game Details" }));
    expect(mockPush).toHaveBeenCalledWith("/create/new?step=details");
  });

  it("shows the details form on the details step, whose back returns to the menu", () => {
    mockParams.step = "details";
    render(<NewGameFlow />);

    expect(screen.getByText("details-form")).toBeInTheDocument();
    expect(mockUseBackNavigation).toHaveBeenCalledWith("/create/new");
    fireEvent.click(screen.getByRole("button", { name: "form-back" }));
    expect(mockBack).toHaveBeenCalledTimes(1);
  });
});
