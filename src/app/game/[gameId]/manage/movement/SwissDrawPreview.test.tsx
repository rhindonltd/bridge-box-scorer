import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SwissDrawPreview } from "./SwissDrawPreview";

const player = (first: string, last: string) => ({
  firstName: first,
  lastName: last,
});

function pairPlayers(a: string, b: string) {
  return { player1: player(a, "X"), player2: player(b, "Y") };
}

/** A 3-table field: tables 1 (1v4) and 2 (2v5) are played, pair 3 sits out. */
function byeAck(over: Record<string, unknown> = {}): any {
  return {
    roundNumber: 3,
    tables: 3,
    seating: [
      { tableNumber: 1, ns: 1, ew: 4 },
      { tableNumber: 2, ns: 2, ew: 5 },
    ],
    sitOutPairId: 3,
    halfMatch: null,
    named: {
      tables: [
        {
          tableNumber: 1,
          nsPairId: 1,
          ewPairId: 4,
          players: {
            N: player("Ann", "One"),
            S: player("Ben", "One"),
            E: player("Cat", "Four"),
            W: player("Dan", "Four"),
          },
        },
        {
          // Unseated players: names fall back to a dash.
          tableNumber: 2,
          nsPairId: 2,
          ewPairId: 5,
          players: { N: null, S: null, E: null, W: null },
        },
      ],
      bye: { pairId: 3, players: pairPlayers("Eve", "Fay") },
      halfMatch: null,
    },
    advisoryInputs: {
      tables: 3,
      playedOpponents: [],
      hadBye: [],
      directionCounts: [],
      stationary: [],
    },
    standings: [
      { id: 1, name: "s1", total: 12.5, rank: 1, tied: false },
      { id: 3, name: "s3", total: 7, rank: 2, tied: false },
    ],
    hadUnavoidableRepeat: false,
    hadStationaryConflict: false,
    ...over,
  };
}

/** A complete 3-table field with nobody sitting out (structurally valid). */
function fullAck(): any {
  return byeAck({
    sitOutPairId: null,
    seating: [
      { tableNumber: 1, ns: 1, ew: 4 },
      { tableNumber: 2, ns: 2, ew: 5 },
      { tableNumber: 3, ns: 3, ew: 6 },
    ],
  });
}

/** A half-match round: pair 1 (anchor) at table 1; 4 then 6 take the other seat. */
function halfMatchAck(over: Record<string, unknown> = {}): any {
  const pair = (id: number, a: string, b: string) => ({
    pairId: id,
    players: pairPlayers(a, b),
  });
  return byeAck({
    sitOutPairId: null,
    seating: [{ tableNumber: 2, ns: 2, ew: 5 }],
    halfMatch: {
      group: { anchor: 1, halfOneOpponent: 4, halfTwoOpponent: 6 },
      anchorTable: 1,
      anchorDirection: "NS",
    },
    named: {
      tables: [
        {
          tableNumber: 2,
          nsPairId: 2,
          ewPairId: 5,
          players: { N: null, S: null, E: null, W: null },
        },
      ],
      bye: null,
      halfMatch: {
        anchorTable: 1,
        anchorDirection: "NS",
        anchor: pair(1, "Ann", "Ben"),
        halfOneOpponent: pair(4, "Cat", "Dan"),
        halfTwoOpponent: { pairId: 6, players: { player1: null, player2: null } },
      },
    },
    ...over,
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
  render(<SwissDrawPreview preview={preview} {...(props as any)} />);
  return props;
}

describe("SwissDrawPreview", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows names, dashes for unseated players, and a fallback for unnamed pairs", () => {
    setup(byeAck({ seating: [{ tableNumber: 1, ns: 1, ew: 4 }, { tableNumber: 2, ns: 2, ew: 9 }] }));
    expect(screen.getByText("Ann One")).toBeInTheDocument();
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
    // Pair 9 has no resolved names.
    expect(screen.getByText("Pair 9")).toBeInTheDocument();
  });

  it("shows running totals and omits them for pairs without one", () => {
    setup(byeAck());
    expect(screen.getByText("12.50 VP")).toBeInTheDocument();
    // Sitting-out pair 3 has a total too.
    expect(screen.getByText("7.00 VP")).toBeInTheDocument();
  });

  it("shows the sit-out slot without a total when the pair has none", () => {
    setup(byeAck({ standings: [] }));
    expect(screen.getByText("Sitting out (bye)")).toBeInTheDocument();
    expect(screen.queryByText(/ VP$/)).not.toBeInTheDocument();
  });

  it("swaps two pairs and commits the edited seating", () => {
    const p = setup(fullAck());
    fireEvent.click(screen.getByText("Ann One"));
    expect(screen.getByText("Ann One").closest("button")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    fireEvent.click(screen.getByText("Cat Four"));
    fireEvent.click(screen.getByTestId("draw-confirm"));
    expect(p.onConfirm).toHaveBeenCalledWith(
      [
        { tableNumber: 1, ns: 4, ew: 1 },
        { tableNumber: 2, ns: 2, ew: 5 },
        { tableNumber: 3, ns: 3, ew: 6 },
      ],
      null,
      null,
    );
  });

  it("deselects a pair when it is tapped twice", () => {
    const p = setup(fullAck());
    const chip = screen.getByText("Ann One").closest("button")!;
    fireEvent.click(chip);
    fireEvent.click(chip);
    expect(chip).toHaveAttribute("aria-pressed", "false");
    // A fresh pick followed by the other pair still swaps (selection was cleared).
    fireEvent.click(screen.getByText("Cat Four"));
    fireEvent.click(screen.getByText("Ann One"));
    fireEvent.click(screen.getByTestId("draw-confirm"));
    expect(p.onConfirm.mock.calls[0][0][0]).toEqual({
      tableNumber: 1,
      ns: 4,
      ew: 1,
    });
  });

  it("gives the bye to a selected pair", () => {
    setup(byeAck());
    // The slot is inert until a pair is picked.
    expect(screen.getByTestId("draw-bye")).toBeDisabled();
    fireEvent.click(screen.getByText("Ann One"));
    expect(
      screen.getByText("Tap to give the bye to the selected pair"),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("draw-bye"));
    // Pair 1 now sits out; pair 3 (the old bye) took its seat at table 1.
    expect(screen.getByTestId("draw-bye")).toHaveTextContent("Ann One");
    expect(screen.getByTestId("table-card-1")).toHaveTextContent("Eve X");
    expect(screen.getByTestId("draw-bye")).toBeDisabled();
  });

  it("mentions the bye slot in the instructions only when a pair sits out", () => {
    setup(byeAck());
    expect(screen.getByText(/sit-out slot to give it the bye/)).toBeInTheDocument();
  });

  it("omits the bye slot and its instructions when nobody sits out", () => {
    setup(
      byeAck({
        sitOutPairId: null,
        seating: [
          { tableNumber: 1, ns: 1, ew: 4 },
          { tableNumber: 2, ns: 2, ew: 5 },
          { tableNumber: 3, ns: 3, ew: 6 },
        ],
      }),
    );
    expect(screen.queryByTestId("draw-bye")).not.toBeInTheDocument();
    expect(screen.queryByText(/sit-out slot/)).not.toBeInTheDocument();
  });

  it("flags a repeat opponent, a repeat bye and a stationary conflict", () => {
    setup(
      byeAck({
        advisoryInputs: {
          tables: 3,
          playedOpponents: ["1-4"],
          hadBye: [3],
          directionCounts: [],
          // Pair 2 is stationary at table 5 NS, but is seated at table 2.
          stationary: [[2, { tableNumber: 5, direction: "NS" }]],
        },
      }),
    );
    const box = screen.getByTestId("draw-advisories");
    expect(box).toHaveTextContent(/repeats an earlier-round opponent/);
    expect(box).toHaveTextContent(/stationary pair is not at its home seat/);
    expect(box).toHaveTextContent(/already had a bye/);
    expect(screen.getByTestId("table-card-1")).toHaveAttribute(
      "data-problem",
      "true",
    );
  });

  it("has no advisories box for a clean draw", () => {
    setup(byeAck());
    expect(screen.queryByTestId("draw-advisories")).not.toBeInTheDocument();
  });

  it("flags a misplaced stationary EW pair and two stationary pairs meeting", () => {
    setup(
      byeAck({
        advisoryInputs: {
          tables: 3,
          playedOpponents: [],
          hadBye: [],
          directionCounts: [],
          stationary: [
            [4, { tableNumber: 1, direction: "NS" }],
            [2, { tableNumber: 2, direction: "NS" }],
            [5, { tableNumber: 2, direction: "EW" }],
          ],
        },
      }),
    );
    expect(screen.getByTestId("draw-advisories")).toHaveTextContent(
      /stationary pair is not at its home seat, or two stationary pairs meet/,
    );
    expect(screen.getAllByText("Stationary").length).toBeGreaterThan(0);
  });

  it("disables OK when the seating is structurally invalid", () => {
    // Pair 6 is nowhere in the draw.
    setup(byeAck());
    expect(screen.getByTestId("draw-confirm")).toBeDisabled();
  });

  it("locks stationary pairs from selection and swapping", () => {
    setup(
      byeAck({
        advisoryInputs: {
          tables: 3,
          playedOpponents: [],
          hadBye: [],
          directionCounts: [],
          stationary: [[1, { tableNumber: 1, direction: "NS" }]],
        },
      }),
    );
    const chip = screen.getByText("Ann One").closest("button")!;
    expect(chip).toBeDisabled();
    fireEvent.click(chip);
    expect(screen.getByTestId("draw-bye")).toBeDisabled();
  });

  it("wires Cancel and shows an in-flight commit", () => {
    const p = setup(byeAck(), { committing: true });
    expect(screen.getByTestId("draw-confirm")).toHaveTextContent("Saving…");
    expect(screen.getByTestId("draw-cancel")).toBeDisabled();
    expect(p.onCancel).not.toHaveBeenCalled();
  });

  it("calls onCancel and shows an error", () => {
    const p = setup(byeAck(), { error: "Round changed" });
    expect(screen.getByTestId("draw-error")).toHaveTextContent("Round changed");
    fireEvent.click(screen.getByTestId("draw-cancel"));
    expect(p.onCancel).toHaveBeenCalled();
  });

  describe("half-match round", () => {
    it("shows the group read-only with first-name labels", () => {
      setup(halfMatchAck());
      const card = screen.getByTestId("draw-half-match");
      expect(card).toHaveTextContent("2 half matches — table 1");
      // Named anchor/first-half use first names; the unnamed second half falls
      // back to its pair id.
      expect(card).toHaveTextContent(
        "Ann & Ben plays the whole round at table 1: Cat & Dan in the first half, then Pair 6 swaps in for the second half.",
      );
      expect(card).toHaveTextContent("Anchor (plays both halves)");
      expect(card).toHaveTextContent("First half");
      expect(card).toHaveTextContent("Second half");
    });

    it("allows OK despite the group not being in the seating, and echoes it back", () => {
      const ack = halfMatchAck();
      const p = setup(ack);
      expect(screen.getByTestId("draw-confirm")).toBeEnabled();
      fireEvent.click(screen.getByTestId("draw-confirm"));
      expect(p.onConfirm).toHaveBeenCalledWith(
        ack.seating,
        null,
        ack.halfMatch,
      );
    });

    it("falls back to pair ids when the group has no names at all", () => {
      const ack = halfMatchAck();
      ack.named.halfMatch = null;
      setup(ack);
      expect(screen.getByTestId("draw-half-match")).toHaveTextContent(
        /Pair & plays the whole round at table 1: Pair & in the first half, then Pair & swaps in/,
      );
    });
  });

  it("falls back to dashes for a bye pair with no resolved players", () => {
    const ack = byeAck();
    ack.named.bye = { pairId: 3, players: { player1: null, player2: null } };
    setup(ack);
    expect(screen.getByTestId("draw-bye")).toHaveTextContent("—");
  });

  it("copes with a draw that has no named bye", () => {
    const ack = byeAck();
    ack.named.bye = null;
    setup(ack);
    expect(screen.getByTestId("draw-bye")).toHaveTextContent("Pair 3");
  });
});
