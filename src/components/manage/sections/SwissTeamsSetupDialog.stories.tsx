import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";

import { SwissTeamsSetupDialog } from "./SwissTeamsSetupDialog";

const meta: Meta<typeof SwissTeamsSetupDialog> = {
  title: "Manage/Sections/SwissTeamsSetupDialog",
  component: SwissTeamsSetupDialog,
  parameters: { layout: "fullscreen" },
  tags: ["autodocs"],
  args: {
    open: true,
    teams: 5,
    saving: false,
    onCancel: fn(),
    onConfirm: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof SwissTeamsSetupDialog>;

/**
 * Fresh setup for an odd field: the odd-team handling defaults to a bye, so the
 * per-round triple plan is hidden until "Triple" is chosen.
 */
export const Default: Story = {};

/**
 * An even field (6 teams): the odd-team options are hidden entirely — every
 * round pairs cleanly.
 */
export const EvenField: Story = {
  args: { teams: 6 },
};

/**
 * Re-opening a saved movement that byes the odd team — the triple plan stays
 * hidden (no per-round builder for a bye event).
 */
export const ByeHandling: Story = {
  args: {
    initial: {
      teams: 5,
      rounds: 7,
      boardsPerRound: 6,
      oddHandling: "BYE",
    },
  },
};

/**
 * A triple event with every round a SHORT triple — the per-round plan builder
 * is visible, each round defaulting to a short triple.
 */
export const ShortTripleEveryRound: Story = {
  args: {
    initial: {
      teams: 5,
      rounds: 7,
      boardsPerRound: 6,
      oddHandling: "TRIPLE",
      oddRoundPlan: Array(7).fill("SHORT"),
    },
  },
};

/**
 * A mixed per-round plan: a bye, some short triples, and a long triple spanning
 * two adjacent rounds (group 0).
 */
export const MixedPlan: Story = {
  args: {
    initial: {
      teams: 5,
      rounds: 6,
      boardsPerRound: 6,
      oddHandling: "TRIPLE",
      oddRoundPlan: [
        "BYE",
        "SHORT",
        { kind: "LONG", group: 0 },
        { kind: "LONG", group: 0 },
        "SHORT",
        "BYE",
      ],
    },
  },
};
