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
          boards: [1, 2, 3],
          participants: {
            nsId: "2",
            ewId: "3",
          },
        },
        {
          table: 2,
          boards: [4, 5, 6],
          participants: {
            nsId: "4",
            ewId: "5",
          },
        },
      ],
    },
  },
};
