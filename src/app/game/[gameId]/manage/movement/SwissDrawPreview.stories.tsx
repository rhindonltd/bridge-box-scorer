import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { SwissDrawPreview } from "@/app/game/[gameId]/manage/movement/SwissDrawPreview";
import type { SwissPreviewAck } from "@/lib/swiss-service";

/** A minimal full Player row for story fixtures. */
let nextPlayerId = 1;
function p(firstName: string, lastName: string) {
  return { id: nextPlayerId++, firstName, lastName, nationalId: null };
}

const basePreview: SwissPreviewAck = {
  roundNumber: 2,
  tables: 2,
  seating: [
    { tableNumber: 1, ns: 1, ew: 3 },
    { tableNumber: 2, ns: 2, ew: 4 },
  ],
  sitOutPairId: null,
  named: {
    tables: [
      {
        tableNumber: 1,
        nsPairId: 1,
        ewPairId: 3,
        players: {
          N: p("Alice", "North"),
          S: p("Bob", "South"),
          E: p("Carol", "East"),
          W: p("Dave", "West"),
        },
      },
      {
        tableNumber: 2,
        nsPairId: 2,
        ewPairId: 4,
        players: {
          N: p("Erin", "North"),
          S: p("Frank", "South"),
          E: p("Gina", "East"),
          W: p("Hugo", "West"),
        },
      },
    ],
    bye: null,
    halfMatch: null,
  },
  halfMatch: null,
  advisoryInputs: {
    tables: 2,
    playedOpponents: [],
    hadBye: [],
    directionCounts: [],
    stationary: [],
  },
  standings: [
    { id: 1, name: "Alice North / Bob South", total: 32.5, rank: 1, tied: false },
    { id: 3, name: "Carol East / Dave West", total: 28.0, rank: 2, tied: false },
    { id: 2, name: "Erin North / Frank South", total: 21.75, rank: 3, tied: false },
    { id: 4, name: "Gina East / Hugo West", total: 18.25, rank: 4, tied: false },
  ],
  hadUnavoidableRepeat: false,
  hadStationaryConflict: false,
};

const meta: Meta<typeof SwissDrawPreview> = {
  title: "App/Manage/Game/Movement/SwissDrawPreview",
  component: SwissDrawPreview,
  parameters: { layout: "fullscreen" },
  tags: ["autodocs"],
  args: {
    preview: basePreview,
    committing: false,
    error: null,
    onConfirm: fn(),
    onCancel: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof SwissDrawPreview>;

/** A clean draw ready to accept. */
export const CleanDraw: Story = {};

/** Committing: the OK button shows its in-flight label. */
export const Committing: Story = {
  args: { committing: true },
};

/**
 * A draw whose 1v3 pairing repeats an earlier round: the advisory shows and
 * table 1 (where pairs 1 and 3 meet) is highlighted with a "Check this table"
 * badge so the director sees exactly which table to review.
 */
export const WithRepeatAdvisory: Story = {
  args: {
    preview: {
      ...basePreview,
      advisoryInputs: { ...basePreview.advisoryInputs, playedOpponents: ["1-3"] },
      hadUnavoidableRepeat: true,
    },
  },
};

/**
 * A stationary pair (pair 1, home at table 1 N/S) is marked with an amber
 * ring + "Stationary" badge and is locked — the director can't select it, swap
 * it, or give it the bye.
 */
export const WithStationaryPair: Story = {
  args: {
    preview: {
      ...basePreview,
      advisoryInputs: {
        ...basePreview.advisoryInputs,
        stationary: [[1, { tableNumber: 1, direction: "NS" }]],
      },
    },
  },
};

/**
 * Both features at once: pair 1 is stationary (amber, locked at table 1) AND a
 * different table has a problem — pairs 2 and 4 (table 2) repeat an earlier
 * opponent, so table 2 is highlighted. Shows the stationary marker and the
 * problem-table highlight side by side on distinct tables.
 */
export const StationaryPairAndProblemTable: Story = {
  args: {
    preview: {
      ...basePreview,
      advisoryInputs: {
        ...basePreview.advisoryInputs,
        stationary: [[1, { tableNumber: 1, direction: "NS" }]],
        // Pairs 2 and 4 (seated together at table 2) have already met.
        playedOpponents: ["2-4"],
      },
      hadUnavoidableRepeat: true,
    },
  },
};

/**
 * The stationary pair's OWN table is the problem: pair 1 is stationary at
 * table 1 and its opponent there (pair 3) has already been played, so table 1
 * is highlighted. The awkward case — the director can't move the stationary
 * pair to resolve the repeat, so they must accept it or re-draw the opponent.
 */
export const StationaryPairIsTheProblem: Story = {
  args: {
    preview: {
      ...basePreview,
      advisoryInputs: {
        ...basePreview.advisoryInputs,
        stationary: [[1, { tableNumber: 1, direction: "NS" }]],
        // Pair 1 (stationary) v pair 3 at table 1 repeats an earlier round.
        playedOpponents: ["1-3"],
      },
      hadUnavoidableRepeat: true,
    },
  },
};

/** An odd field with a bye: the sit-out pair is shown and can be reassigned. */
export const WithBye: Story = {
  args: {
    preview: {
      ...basePreview,
      seating: [{ tableNumber: 1, ns: 1, ew: 3 }],
      sitOutPairId: 2,
      named: {
        tables: [basePreview.named.tables[0]],
        bye: {
          pairId: 2,
          players: { player1: p("Erin", "North"), player2: p("Frank", "South") },
        },
        halfMatch: null,
      },
    },
  },
};

/**
 * An odd field resolved with a 2-half-matches group: three pairs play at the
 * anchor's table (the anchor stays all round; the two others swap in/out at the
 * midpoint). Shown read-only — the group isn't director-editable here. The
 * ordinary field (if any) still renders as swap-able table cards above it.
 */
export const WithHalfMatch: Story = {
  args: {
    preview: {
      ...basePreview,
      // The three group pairs are not in the ordinary seating.
      seating: [],
      sitOutPairId: null,
      halfMatch: {
        group: { anchor: 1, halfOneOpponent: 2, halfTwoOpponent: 3 },
        anchorTable: 1,
        anchorDirection: "NS",
      },
      named: {
        tables: [],
        bye: null,
        halfMatch: {
          anchorTable: 1,
          anchorDirection: "NS",
          anchor: {
            pairId: 1,
            players: { player1: p("Alice", "North"), player2: p("Bob", "South") },
          },
          halfOneOpponent: {
            pairId: 2,
            players: { player1: p("Erin", "North"), player2: p("Frank", "South") },
          },
          halfTwoOpponent: {
            pairId: 3,
            players: { player1: p("Carol", "East"), player2: p("Dave", "West") },
          },
        },
      },
    },
  },
};

/** A failed commit surfaces an inline error. */
export const CommitError: Story = {
  args: { error: "Could not save the draw." },
};
