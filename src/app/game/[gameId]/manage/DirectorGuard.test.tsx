import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

const mockReplace = vi.fn();
const mockIsDirectorFor = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace, push: vi.fn(), back: vi.fn() }),
}));

vi.mock("@/lib/director-token", () => ({
  isDirectorFor: (...args: unknown[]) => mockIsDirectorFor(...args),
}));

import { DirectorGuard } from "./DirectorGuard";

describe("DirectorGuard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders children when authorized as director", () => {
    mockIsDirectorFor.mockReturnValue(true);

    render(
      <DirectorGuard gameId="g1">
        <span data-testid="child">secret</span>
      </DirectorGuard>,
    );

    expect(mockIsDirectorFor).toHaveBeenCalledWith("g1");
    expect(screen.getByTestId("child")).toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("renders nothing and redirects when not authorized", async () => {
    mockIsDirectorFor.mockReturnValue(false);

    render(
      <DirectorGuard gameId="g2">
        <span data-testid="child">secret</span>
      </DirectorGuard>,
    );

    expect(screen.queryByTestId("child")).not.toBeInTheDocument();
    await waitFor(() =>
      expect(mockReplace).toHaveBeenCalledWith("/manage"),
    );
  });
});
