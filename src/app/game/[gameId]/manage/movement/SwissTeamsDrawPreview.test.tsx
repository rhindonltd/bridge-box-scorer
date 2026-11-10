import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SwissTeamsDrawPreview } from "./SwissTeamsDrawPreview";

const nt = (id: number, name: string) => ({ teamId: id, name });

/** 4 teams: matches 1v3 and 2v4. */
function matchesAck(over: Record<string, unknown> = {}): any {
  return {
    roundNumber: 2,
    teams: 4,
    matches: [
      { a: 1, b: 3 },
      { a: 2, b: 4 },
    ],
    byeTeamId: null,
    triple: null,
    named: {
      matches: [
        { a: nt(1, "Sharks"), b: nt(3, "Owls") },
        { a: nt(2, "Dragons"), b: nt(4, "Eagles") },
      ],
      bye: null,
      triple: null,
    },
    standings: [
      { id: 1, name: "s1", total: 30, rank: 1, tied: false },
      { id: 3, name: "s3", total: 25.4, rank: 2, tied: false },
    ],
    repeatMatchKeys: [],
    advisoryInputs: { teams: 4, playedOpponents: [] },
    hadUnavoidableRepeat: false,
    ...over,
  };
}

/** 5 teams: matches 1v3, 2v4 plus team 5 sitting out. */
function byeAck(over: Record<string, unknown> = {}): any {
  return matchesAck({
    teams: 5,
    byeTeamId: 5,
    named: {
      matches: [
        { a: nt(1, "Sharks"), b: nt(3, "Owls") },
        { a: nt(2, "Dragons"), b: nt(4, "Eagles") },
      ],
      bye: nt(5, "Foxes"),
      triple: null,
    },
    advisoryInputs: { teams: 5, playedOpponents: [] },
    ...over,
  });
}

/** 5 teams: match 1v3 plus a triple 2/4/5. */
function tripleAck(kind: "SHORT" | "LONG" | undefined): any {
  return matchesAck({
    teams: 5,
    matches: [{ a: 1, b: 3 }],
    triple: { a: 2, b: 4, c: 5, kind },
    named: {
      matches: [{ a: nt(1, "Sharks"), b: nt(3, "Owls") }],
      bye: null,
      // Team 5 has no resolved name -> falls back to "Team 5".
      triple: { a: nt(2, "Dragons"), b: nt(4, "Eagles"), c: nt(5, "Team 5") },
    },
    advisoryInputs: { teams: 5, playedOpponents: [] },
  });
}

function setup(preview: any, over: Record<string, unknown> = {}) {
  const props = {
    committing: false,
    error: null as string | null,
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
    ...over,
  };
  render(<SwissTeamsDrawPreview preview={preview} {...(props as any)} />);
  return props;
}

describe("SwissTeamsDrawPreview", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows matches with names, whole-number totals and no total when missing", () => {
    setup(matchesAck());
    expect(screen.getByText("Sharks")).toBeInTheDocument();
    expect(screen.getByText("30 VP")).toBeInTheDocument();
    // A fractional total is rounded defensively.
    expect(screen.getByText("25 VP")).toBeInTheDocument();
    expect(screen.queryByText(/ VP$/, { selector: "[data-none]" })).toBeNull();
    expect(screen.getAllByTestId("teams-match")).toHaveLength(2);
  });

  it("falls back to 'Team N' for an unnamed team", () => {
    const ack = matchesAck();
    ack.named.matches[1].b = nt(4, "Eagles");
    ack.matches[1] = { a: 2, b: 9 };
    setup(ack);
    expect(screen.getByText("Team 9")).toBeInTheDocument();
  });

  it("swaps two teams and commits the edit", () => {
    const p = setup(matchesAck());
    fireEvent.click(screen.getByText("Sharks"));
    expect(screen.getByText("Sharks").closest("button")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    fireEvent.click(screen.getByText("Dragons"));
    fireEvent.click(screen.getByTestId("draw-confirm"));
    expect(p.onConfirm).toHaveBeenCalledWith(
      [
        { a: 1, b: 4 },
        { a: 2, b: 3 },
      ],
      null,
      null,
    );
  });

  it("lets the second team of a match and of a triple comparison be picked", () => {
    const p = setup(tripleAck("SHORT"));
    // Owls is the second team (b) of the match.
    fireEvent.click(screen.getByText("Owls"));
    expect(screen.getByText("Owls").closest("button")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    // Team 5 is the second team (y) of a triple comparison.
    fireEvent.click(screen.getAllByText("Team 5")[0]);
    fireEvent.click(screen.getByTestId("draw-confirm"));
    expect(p.onConfirm.mock.calls[0][0]).toEqual([{ a: 1, b: 5 }]);
  });

  it("deselects a team when tapped twice", () => {
    const p = setup(matchesAck());
    const chip = screen.getByText("Sharks").closest("button")!;
    fireEvent.click(chip);
    fireEvent.click(chip);
    expect(chip).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(screen.getByTestId("draw-confirm"));
    expect(p.onConfirm.mock.calls[0][0]).toEqual([
      { a: 1, b: 3 },
      { a: 2, b: 4 },
    ]);
  });

  it("shows the bye, mentions it in the instructions, and lets it be swapped", () => {
    const p = setup(byeAck());
    expect(screen.getByTestId("teams-bye")).toHaveTextContent("Foxes");
    expect(
      screen.getByText(/including the team sitting out/),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByText("Foxes"));
    fireEvent.click(screen.getByText("Sharks"));
    expect(screen.getByTestId("teams-bye")).toHaveTextContent("Sharks");
    fireEvent.click(screen.getByTestId("draw-confirm"));
    expect(p.onConfirm.mock.calls[0][1]).toBe(1);
  });

  it("renders a short triple, its comparisons, and lets a member be swapped", () => {
    const p = setup(tripleAck("SHORT"));
    expect(screen.getByText(/including the three-way/)).toBeInTheDocument();
    expect(screen.getByText("Three-way (short triple)")).toBeInTheDocument();
    expect(screen.getByText(/each on its own board set/)).toBeInTheDocument();
    expect(screen.getAllByTestId("teams-triple-comparison")).toHaveLength(3);
    // Swap triple member Dragons (2) with Sharks (1) from the match.
    fireEvent.click(screen.getAllByText("Dragons")[0]);
    fireEvent.click(screen.getByText("Sharks"));
    fireEvent.click(screen.getByTestId("draw-confirm"));
    expect(p.onConfirm.mock.calls[0][2]).toEqual(
      expect.objectContaining({ a: 1, b: 4, c: 5 }),
    );
  });

  it("renders a long triple", () => {
    setup(tripleAck("LONG"));
    expect(
      screen.getByText("Three-way (long triple — over two rounds)"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/spread across this round and the next/),
    ).toBeInTheDocument();
  });

  it("flags a repeat match and shows the advisory", () => {
    setup(matchesAck({ advisoryInputs: { teams: 4, playedOpponents: ["1-3"] } }));
    expect(screen.getByTestId("draw-advisories")).toBeInTheDocument();
    expect(screen.getByText("Repeat — check this match")).toBeInTheDocument();
    expect(screen.getAllByTestId("teams-match")[0]).toHaveAttribute(
      "data-problem",
      "true",
    );
  });

  it("shows no advisory for a clean draw", () => {
    setup(matchesAck());
    expect(screen.queryByTestId("draw-advisories")).not.toBeInTheDocument();
  });

  it("disables OK for a structurally invalid round", () => {
    setup(matchesAck({ advisoryInputs: { teams: 6, playedOpponents: [] } }));
    expect(screen.getByTestId("draw-confirm")).toBeDisabled();
  });

  it("shows an in-flight commit, an error, and wires Cancel", () => {
    const p = setup(matchesAck(), { committing: true, error: "Nope" });
    expect(screen.getByTestId("draw-confirm")).toHaveTextContent("Saving…");
    expect(screen.getByTestId("draw-cancel")).toBeDisabled();
    expect(screen.getByTestId("draw-error")).toHaveTextContent("Nope");
    expect(p.onCancel).not.toHaveBeenCalled();
  });

  it("calls onCancel", () => {
    const p = setup(matchesAck());
    fireEvent.click(screen.getByTestId("draw-cancel"));
    expect(p.onCancel).toHaveBeenCalled();
  });
});
