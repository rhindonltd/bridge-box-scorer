import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

const mockReplace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace, push: vi.fn(), back: vi.fn() }),
}));

import { GameStateGuard } from "./GameStateGuard";

function renderGuard(props: { allowed: boolean; loading: boolean }) {
  return render(
    <GameStateGuard {...props} redirectTo="/game/g1/manage">
      <span data-testid="child">secret</span>
    </GameStateGuard>,
  );
}

describe("GameStateGuard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders children when allowed", () => {
    renderGuard({ allowed: true, loading: false });

    expect(screen.getByTestId("child")).toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("renders nothing and redirects when not allowed", async () => {
    renderGuard({ allowed: false, loading: false });

    expect(screen.queryByTestId("child")).not.toBeInTheDocument();
    await waitFor(() =>
      expect(mockReplace).toHaveBeenCalledWith("/game/g1/manage"),
    );
  });

  it("shows a spinner and does not redirect while loading", () => {
    renderGuard({ allowed: false, loading: true });

    expect(screen.queryByTestId("child")).not.toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
