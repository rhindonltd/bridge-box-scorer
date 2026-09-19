import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

const mockReplace = vi.fn();
const mockVerify = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace, push: vi.fn(), back: vi.fn() }),
}));

vi.mock("@/lib/director-token", () => ({
  verifyDirectorTokenWithServer: (...args: unknown[]) => mockVerify(...args),
}));

import { DirectorGuard } from "./DirectorGuard";

describe("DirectorGuard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders children only after the server confirms the director token", async () => {
    mockVerify.mockResolvedValue(true);

    render(
      <DirectorGuard gameId="g1">
        <span data-testid="child">secret</span>
      </DirectorGuard>,
    );

    // Nothing rendered until the async check resolves.
    expect(screen.queryByTestId("child")).not.toBeInTheDocument();

    await waitFor(() =>
      expect(screen.getByTestId("child")).toBeInTheDocument(),
    );
    expect(mockVerify).toHaveBeenCalledWith("g1");
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("ignores a superseded verification when the gameId changes mid-check", async () => {
    // First check for g1 is left pending; a rerender for g2 supersedes it.
    let resolveFirst: (v: boolean) => void = () => {};
    mockVerify
      .mockImplementationOnce(
        () => new Promise<boolean>((res) => (resolveFirst = res)),
      )
      .mockResolvedValueOnce(true);

    const { rerender } = render(
      <DirectorGuard gameId="g1">
        <span data-testid="child">secret</span>
      </DirectorGuard>,
    );

    rerender(
      <DirectorGuard gameId="g2">
        <span data-testid="child">secret</span>
      </DirectorGuard>,
    );

    // The g2 check resolves true -> authorized.
    await waitFor(() =>
      expect(screen.getByTestId("child")).toBeInTheDocument(),
    );

    // The stale g1 check now resolves; its result is discarded (no redirect,
    // still authorized).
    resolveFirst(false);
    await Promise.resolve();
    expect(screen.getByTestId("child")).toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("renders nothing and redirects when the token is invalid", async () => {
    mockVerify.mockResolvedValue(false);

    render(
      <DirectorGuard gameId="g2">
        <span data-testid="child">secret</span>
      </DirectorGuard>,
    );

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/manage"));
    // The protected content must never render for an invalid token.
    expect(screen.queryByTestId("child")).not.toBeInTheDocument();
  });
});
