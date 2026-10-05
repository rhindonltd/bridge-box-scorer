import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";

import { SwissSetupDialog } from "./SwissSetupDialog";

const meta: Meta<typeof SwissSetupDialog> = {
  title: "Manage/Sections/SwissSetupDialog",
  component: SwissSetupDialog,
  parameters: { layout: "fullscreen" },
  tags: ["autodocs"],
  args: {
    open: true,
    tables: 5,
    saving: false,
    onCancel: fn(),
    onConfirm: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof SwissSetupDialog>;

/**
 * Fresh setup: the odd-pair handling defaults to a bye, so the per-round plan
 * is hidden until "2 half matches" is chosen.
 */
export const Default: Story = {};

/**
 * Re-opening a saved movement that uses a bye for the odd pair — the plan stays
 * hidden (no per-round builder for a bye event).
 */
export const ByeHandling: Story = {
  args: {
    initial: {
      tables: 5,
      rounds: 7,
      boardsPerRound: 3,
      oddHandling: "BYE",
    },
  },
};

/**
 * A "2 half matches" event: the per-round plan builder is visible, every round
 * defaulting to a half match (the director can toggle any round to a bye).
 */
export const HalfMatchesEveryRound: Story = {
  args: {
    initial: {
      tables: 5,
      rounds: 7,
      boardsPerRound: 3,
      oddHandling: "HALF_MATCHES",
      oddRoundPlan: Array(7).fill("HALF_MATCHES"),
    },
  },
};

/**
 * A mixed per-round plan: some rounds a bye, some a half match — the EBU
 * recommendation varies the choice across the event.
 */
export const MixedPlan: Story = {
  args: {
    initial: {
      tables: 5,
      rounds: 6,
      boardsPerRound: 3,
      oddHandling: "HALF_MATCHES",
      oddRoundPlan: [
        "BYE",
        "HALF_MATCHES",
        "HALF_MATCHES",
        "BYE",
        "HALF_MATCHES",
        "BYE",
      ],
    },
  },
};
