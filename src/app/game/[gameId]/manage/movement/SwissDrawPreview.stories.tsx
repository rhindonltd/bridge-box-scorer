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
  },
  advisoryInputs: {
    tables: 2,
    playedOpponents: [],
    hadBye: [],
    directionCounts: [],
    stationary: [],
  },
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

/** A draw whose 1v3 pairing repeats an earlier round — advisory shown. */
export const WithRepeatAdvisory: Story = {
  args: {
    preview: {
      ...basePreview,
      advisoryInputs: { ...basePreview.advisoryInputs, playedOpponents: ["1-3"] },
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
      },
    },
  },
};

/** A failed commit surfaces an inline error. */
export const CommitError: Story = {
  args: { error: "Could not save the draw." },
};
