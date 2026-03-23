import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import MovementTables from "@/components/movement/MovementTables";
import { generateMitchell } from "@/movement/mitchell";

const meta: Meta<typeof MovementTables> = {
  title: "Components/Movement/MovementTables",
  component: MovementTables,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<typeof MovementTables>;

export const Default: Story = {
  args: {
    name: "Monday PM Pairs",
    tables: generateMitchell({
      tables: 9,
      rounds: 9,
      boardsPerRound: 3,
      arrowSwitchRounds: 0,
    }),
  },
};
