import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";

const mockUseSWR = vi.fn();
vi.mock("swr", () => ({
  default: (...args: unknown[]) => mockUseSWR(...args),
}));

vi.mock("@/lib/fetcher", () => ({ fetcher: vi.fn() }));

vi.mock("@/lib/section-service", () => ({
  setSectionMitchellMovement: vi.fn(),
  setSectionMovementSpec: vi.fn(),
}));

const mockRecommendations = vi.fn();
vi.mock("@/movement/recommendations/spec-map-recommendations", () => ({
  recommendationsFromSpecMap: (...args: unknown[]) =>
    mockRecommendations(...args),
}));

// Stub the layout + card so the test focuses on the picker's selection logic.
vi.mock("@/components/layout/GamePageLayout", () => ({
  GamePageLayout: ({
    children,
    headerTitle,
  }: {
    children: ReactNode;
    headerTitle: string;
  }) => (
    <div>
      <span data-testid="title">{headerTitle}</span>
      {children}
    </div>
  ),
}));

vi.mock("@/app/game/[gameId]/create/RecommendedMovementCard", () => ({
  RecommendedMovementCard: ({
    movement,
    onSelect,
  }: {
    movement: { name: string };
    onSelect: () => void;
  }) => <button onClick={onSelect}>{movement.name}</button>,
}));

import {
  setSectionMitchellMovement,
  setSectionMovementSpec,
} from "@/lib/section-service";
import type { RecommendedMovement } from "@/movement/recommendations/recommendation-types";
import { SectionMovementPicker } from "./SectionMovementPicker";

function generatedRec(): RecommendedMovement {
  return {
    family: "MITCHELL",
    name: "Mitchell",
    rounds: 8,
    boardsPerRound: 2,
    boardsPerPair: 16,
    copies: 1,
    pros: [],
    cons: [],
    source: "generated",
    specRef: {
      source: "generated",
      spec: { tables: 8, rounds: 8, boardsPerRound: 2 },
    },
  };
}

function dbRec(): RecommendedMovement {
  return {
    family: "HOWELL",
    name: "Howell",
    rounds: 6,
    boardsPerRound: 4,
    boardsPerPair: 24,
    copies: 1,
    pros: [],
    cons: [],
    source: "db",
    specRef: { source: "db", id: 42, type: "2" },
  };
}

describe("SectionMovementPicker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSWR.mockReturnValue({ data: [] });
    vi.stubGlobal("alert", vi.fn());
  });

  it("shows the section title and an empty-state when no recommendations", () => {
    mockRecommendations.mockReturnValue([]);
    render(
      <SectionMovementPicker
        gameId="g1"
        section="A"
        tables={8}
        onDone={vi.fn()}
      />,
    );
    expect(screen.getByTestId("title").textContent).toContain("Section A");
    expect(
      screen.getByText(/No recommended movements are available/),
    ).toBeInTheDocument();
  });

  it("persists a generated Mitchell and calls onDone", async () => {
    mockRecommendations.mockReturnValue([generatedRec()]);
    const onDone = vi.fn();
    render(
      <SectionMovementPicker
        gameId="g1"
        section="A"
        tables={8}
        onDone={onDone}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Mitchell" }));

    await waitFor(() =>
      expect(setSectionMitchellMovement).toHaveBeenCalledWith("g1", "A", {
        tables: 8,
        rounds: 8,
        boardsPerRound: 2,
      }),
    );
    expect(setSectionMovementSpec).not.toHaveBeenCalled();
    expect(onDone).toHaveBeenCalled();
  });

  it("persists a seeded (db) spec by id + boardsPerRound and calls onDone", async () => {
    mockRecommendations.mockReturnValue([dbRec()]);
    const onDone = vi.fn();
    render(
      <SectionMovementPicker
        gameId="g1"
        section="B"
        tables={6}
        onDone={onDone}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Howell" }));

    await waitFor(() =>
      expect(setSectionMovementSpec).toHaveBeenCalledWith("g1", "B", 42, 4),
    );
    expect(onDone).toHaveBeenCalled();
  });

  it("alerts and does not call onDone when persisting fails", async () => {
    mockRecommendations.mockReturnValue([generatedRec()]);
    vi.mocked(setSectionMitchellMovement).mockRejectedValueOnce(
      new Error("shrink guard"),
    );
    const alertSpy = vi.fn();
    vi.stubGlobal("alert", alertSpy);
    const onDone = vi.fn();

    render(
      <SectionMovementPicker
        gameId="g1"
        section="A"
        tables={8}
        onDone={onDone}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Mitchell" }));

    await waitFor(() => expect(alertSpy).toHaveBeenCalledWith("shrink guard"));
    expect(onDone).not.toHaveBeenCalled();
  });
});
