import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const mockUseGameStarted = vi.fn();
const mockUseResultsComplete = vi.fn();
vi.mock("@/hooks/game-started", () => ({
  useGameStarted: () => mockUseGameStarted(),
}));
vi.mock("@/hooks/results-complete", () => ({
  useResultsComplete: () => mockUseResultsComplete(),
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
  ResultsCompleteGuard,
} from "./StateGuards";

const lastProps = () => guardProps[guardProps.length - 1];

describe("StateGuards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    guardProps.length = 0;
    mockUseGameStarted.mockReturnValue({ started: false, isLoading: false });
    mockUseResultsComplete.mockReturnValue({
      allResultsIn: false,
      isLoading: false,
    });
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

  describe("ResultsCompleteGuard", () => {
    it("is allowed once all results are in", () => {
      mockUseResultsComplete.mockReturnValue({
        allResultsIn: true,
        isLoading: false,
      });

      render(
        <ResultsCompleteGuard gameId="g1">
          <span>child</span>
        </ResultsCompleteGuard>,
      );

      expect(lastProps()).toMatchObject({
        allowed: true,
        loading: false,
        redirectTo: "/game/g1/manage",
      });
    });

    it("is not allowed while results are outstanding", () => {
      mockUseResultsComplete.mockReturnValue({
        allResultsIn: false,
        isLoading: false,
      });

      render(
        <ResultsCompleteGuard gameId="g1">
          <span>child</span>
        </ResultsCompleteGuard>,
      );

      expect(lastProps()).toMatchObject({ allowed: false });
    });

    it("forwards the loading flag", () => {
      mockUseResultsComplete.mockReturnValue({
        allResultsIn: false,
        isLoading: true,
      });

      render(
        <ResultsCompleteGuard gameId="g1">
          <span>child</span>
        </ResultsCompleteGuard>,
      );

      expect(lastProps()).toMatchObject({ loading: true });
    });
  });
});
