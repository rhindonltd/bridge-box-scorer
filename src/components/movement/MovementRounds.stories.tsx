import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import MovementRounds from "@/components/movement/MovementRounds";
import { generateMitchell } from "@/movement/mitchell";
import { groupByRound } from "@/movement/shared";

const meta: Meta<typeof MovementRounds> = {
  title: "Components/Movement/MovementRounds",
  component: MovementRounds,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<typeof MovementRounds>;

export const Default: Story = {
  args: {
    rounds: groupByRound(
      generateMitchell({
        tables: 9,
        rounds: 9,
        boardsPerRound: 3,
        arrowSwitchRounds: 0,
      }),
    ),
  },
};
