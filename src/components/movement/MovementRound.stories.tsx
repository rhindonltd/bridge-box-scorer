import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import MovementRound from "@/components/movement/MovementRound";

const meta: Meta<typeof MovementRound> = {
  title: "Components/Movement/MovementRound",
  component: MovementRound,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<typeof MovementRound>;

export const Default: Story = {
  args: {
    round: {
      round: 1,
      tables: [
        {
          table: 1,
          pair: {
            ns: 2,
            ew: 3,
            boards: [1, 2, 3],
          },
        },
        {
          table: 2,
          pair: {
            ns: 4,
            ew: 5,
            boards: [4, 5, 6],
          },
        },
      ],
    },
  },
};
