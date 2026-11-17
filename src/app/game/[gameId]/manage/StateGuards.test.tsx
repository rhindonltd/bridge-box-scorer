import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const mockUseGameStarted = vi.fn();
const mockGame = vi.fn();
vi.mock("@/context/GameContext", () => ({
  useRequiredGame: () => ({ game: mockGame() }),
}));
vi.mock("@/hooks/game-started", () => ({
  useGameStarted: () => mockUseGameStarted(),
}));

// Capture the props GameStateGuard receives so we can assert how each wrapper
// maps state onto allowed/loading/redirectTo without rendering the real guard.
const guardProps: Array<Record<string, unknown>> = [];
vi.mock("./GameStateGuard", () => ({
  GameStateGuard: (props: Record<string, unknown>) => {
    guardProps.push(props);
    return <div data-testid="guard">{props.children as React.ReactNode}</div>;
  },
}));

import {
  StartedGuard,
  NotStartedGuard,
  NotFinalisedGuard,
} from "./StateGuards";

const lastProps = () => guardProps[guardProps.length - 1];

describe("StateGuards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    guardProps.length = 0;
    mockUseGameStarted.mockReturnValue({ started: false, isLoading: false });
    mockGame.mockReturnValue({ finalisedAt: null });
  });

  describe("StartedGuard", () => {
    it("is allowed when the game has started and redirects to manage", () => {
      mockUseGameStarted.mockReturnValue({ started: true, isLoading: false });

      render(
        <StartedGuard gameId="g1">
          <span>child</span>
        </StartedGuard>,
      );

      expect(lastProps()).toMatchObject({
        allowed: true,
        loading: false,
        redirectTo: "/game/g1/manage",
      });
      expect(screen.getByText("child")).toBeInTheDocument();
    });

    it("is not allowed before the game has started", () => {
      mockUseGameStarted.mockReturnValue({ started: false, isLoading: false });

      render(
        <StartedGuard gameId="g1">
          <span>child</span>
        </StartedGuard>,
      );

      expect(lastProps()).toMatchObject({ allowed: false, loading: false });
    });

    it("forwards the loading flag", () => {
      mockUseGameStarted.mockReturnValue({ started: false, isLoading: true });

      render(
        <StartedGuard gameId="g1">
          <span>child</span>
        </StartedGuard>,
      );

      expect(lastProps()).toMatchObject({ loading: true });
    });
  });

  describe("NotStartedGuard", () => {
    it("is allowed before the game has started", () => {
      mockUseGameStarted.mockReturnValue({ started: false, isLoading: false });

      render(
        <NotStartedGuard gameId="g1">
          <span>child</span>
        </NotStartedGuard>,
      );

      expect(lastProps()).toMatchObject({
        allowed: true,
        loading: false,
        redirectTo: "/game/g1/manage",
      });
    });

    it("is not allowed once the game has started", () => {
      mockUseGameStarted.mockReturnValue({ started: true, isLoading: false });

      render(
        <NotStartedGuard gameId="g1">
          <span>child</span>
        </NotStartedGuard>,
      );

      expect(lastProps()).toMatchObject({ allowed: false });
    });
  });

  it("NotStartedGuard can redirect somewhere other than the manage menu", () => {
    mockUseGameStarted.mockReturnValue({ started: true, isLoading: false });
    render(
      <NotStartedGuard gameId="g1" redirectTo="/">
        <span>child</span>
      </NotStartedGuard>,
    );
    expect(lastProps()).toMatchObject({ allowed: false, redirectTo: "/" });
  });

  describe("NotFinalisedGuard", () => {
    it("allows an open game", () => {
      render(
        <NotFinalisedGuard gameId="g1">
          <span>content</span>
        </NotFinalisedGuard>,
      );
      expect(lastProps().allowed).toBe(true);
      expect(lastProps().loading).toBe(false);
    });

    it("redirects a finalised game to its export page", () => {
      mockGame.mockReturnValue({ finalisedAt: "2026-01-01T00:00:00Z" });
      render(
        <NotFinalisedGuard gameId="g1">
          <span>content</span>
        </NotFinalisedGuard>,
      );
      expect(lastProps().allowed).toBe(false);
      expect(lastProps().redirectTo).toBe("/game/g1/export");
    });
  });
});
