import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

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

// The picker renders its own content only — it is embedded in the setup page's
// layout, so there is no nested page header to stub.
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
    boardsInPlay: 16,
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
    boardsInPlay: 24,
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

  it("shows a Section sub-heading and an empty-state when no recommendations", () => {
    mockRecommendations.mockReturnValue([]);
    render(
      <SectionMovementPicker
        gameId="g1"
        section="A"
        tables={8}
        onDone={vi.fn()}
      />,
    );
    // Multi-section defaults to true, so the section is named.
    expect(screen.getByText("Section A")).toBeInTheDocument();
    expect(
      screen.getByText(/No recommended movements are available/),
    ).toBeInTheDocument();
  });

  it("omits the Section sub-heading for a single-section game", () => {
    mockRecommendations.mockReturnValue([]);
    render(
      <SectionMovementPicker
        gameId="g1"
        section="A"
        tables={8}
        multiSection={false}
      />,
    );
    expect(screen.queryByText("Section A")).not.toBeInTheDocument();
    expect(
      screen.getByText(/No recommended movements are available/),
    ).toBeInTheDocument();
  });

  it("groups movements by boards a pair plays, ascending, with no 'Recommended Movements' heading", () => {
    // generatedRec plays 16 boards, dbRec plays 24.
    mockRecommendations.mockReturnValue([dbRec(), generatedRec()]);
    render(
      <SectionMovementPicker gameId="g1" section="A" tables={8} />,
    );

    expect(
      screen.queryByText("Recommended Movements"),
    ).not.toBeInTheDocument();

    const headings = screen.getAllByRole("heading", { level: 2 });
    const groupHeadings = headings
      .map((h) => h.textContent)
      .filter((t) => t?.includes("boards"));
    expect(groupHeadings).toEqual(["16 boards", "24 boards"]);
  });

  it("groups multiple movements sharing the same boards-a-pair count together", () => {
    // Two movements both playing 16 boards -> single group with both cards.
    const rec2: RecommendedMovement = { ...generatedRec(), name: "Skip Mitchell" };
    mockRecommendations.mockReturnValue([generatedRec(), rec2]);
    render(<SectionMovementPicker gameId="g1" section="A" tables={8} />);

    const groupHeadings = screen
      .getAllByRole("heading", { level: 2 })
      .map((h) => h.textContent)
      .filter((t) => t?.includes("boards"));
    expect(groupHeadings).toEqual(["16 boards"]);
    expect(screen.getByRole("button", { name: "Mitchell" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Skip Mitchell" }),
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

  it("shows a back control that calls onDone when provided", () => {
    mockRecommendations.mockReturnValue([]);
    const onDone = vi.fn();
    render(
      <SectionMovementPicker
        gameId="g1"
        section="A"
        tables={8}
        onDone={onDone}
      />,
    );
    const back = screen.getByRole("button", { name: /back to sections/i });
    fireEvent.click(back);
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it("renders no back control when onDone is omitted (setup root)", () => {
    mockRecommendations.mockReturnValue([]);
    render(<SectionMovementPicker gameId="g1" section="A" tables={8} />);
    expect(
      screen.queryByRole("button", { name: /back to sections/i }),
    ).not.toBeInTheDocument();
  });

  it("shows an Add Section button only when onAddSection is provided and calls it", () => {
    mockRecommendations.mockReturnValue([]);
    const { rerender } = render(
      <SectionMovementPicker gameId="g1" section="A" tables={8} />,
    );
    expect(
      screen.queryByRole("button", { name: "Add Section" }),
    ).not.toBeInTheDocument();

    const onAddSection = vi.fn();
    rerender(
      <SectionMovementPicker
        gameId="g1"
        section="A"
        tables={8}
        onAddSection={onAddSection}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Add Section" }));
    expect(onAddSection).toHaveBeenCalledTimes(1);
  });

  it("does not throw when a movement is chosen with no onDone", async () => {
    mockRecommendations.mockReturnValue([generatedRec()]);
    render(<SectionMovementPicker gameId="g1" section="A" tables={8} />);

    fireEvent.click(screen.getByRole("button", { name: "Mitchell" }));

    await waitFor(() =>
      expect(setSectionMitchellMovement).toHaveBeenCalledWith("g1", "A", {
        tables: 8,
        rounds: 8,
        boardsPerRound: 2,
      }),
    );
  });

  it("handles SWR returning no data yet", () => {
    mockUseSWR.mockReturnValue({ data: undefined });
    mockRecommendations.mockReturnValue([]);
    render(<SectionMovementPicker gameId="g1" section="A" tables={8} />);
    // recommendationsFromSpecMap is called with an empty array fallback.
    expect(mockRecommendations).toHaveBeenCalledWith(8, []);
    expect(
      screen.getByText(/No recommended movements are available/),
    ).toBeInTheDocument();
  });

  it("uses a generic message when a non-Error is thrown while persisting", async () => {
    mockRecommendations.mockReturnValue([generatedRec()]);
    vi.mocked(setSectionMitchellMovement).mockRejectedValueOnce("string boom");
    const alertSpy = vi.fn();
    vi.stubGlobal("alert", alertSpy);

    render(<SectionMovementPicker gameId="g1" section="A" tables={8} />);
    fireEvent.click(screen.getByRole("button", { name: "Mitchell" }));

    await waitFor(() =>
      expect(alertSpy).toHaveBeenCalledWith("Failed to set movement"),
    );
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
