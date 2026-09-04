import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const mockPlugin = { id: "MP", score: vi.fn(), views: [] };
const mockGetPerBoardPlugin = vi.fn(() => mockPlugin);
vi.mock("@/scoring/plugins/registry", () => ({
  getPerBoardPlugin: (...args: unknown[]) => mockGetPerBoardPlugin(...args),
}));

// Stub the presentational child so we assert only the Traveller's wiring.
vi.mock("@/components/scoring/PerBoardTravellerView", () => ({
  PerBoardTravellerView: (props: {
    plugin: { id: string };
    scored: unknown;
    highlightAssignmentId?: string;
  }) => (
    <div data-testid="per-board">
      <span data-testid="plugin-id">{props.plugin.id}</span>
      <span data-testid="scored">{JSON.stringify(props.scored)}</span>
      <span data-testid="highlight">{String(props.highlightAssignmentId)}</span>
    </div>
  ),
}));

import { Traveller } from "./Traveller";
import type { ScoredBoard } from "@/scoring/traveller/score-traveller";

const scoredBoard = {
  pluginId: "MP",
  board: 1,
  lines: [{ pair: "A1" }],
} as unknown as ScoredBoard;

describe("Traveller", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("resolves the plugin from the scored board and renders the per-board view", () => {
    render(
      <Traveller scoredBoard={scoredBoard} highlightAssignmentId="A1" />,
    );

    expect(mockGetPerBoardPlugin).toHaveBeenCalledWith("MP");
    expect(screen.getByTestId("plugin-id").textContent).toBe("MP");
    expect(screen.getByTestId("scored").textContent).toBe(
      JSON.stringify(scoredBoard.lines),
    );
    expect(screen.getByTestId("highlight").textContent).toBe("A1");
  });
});
