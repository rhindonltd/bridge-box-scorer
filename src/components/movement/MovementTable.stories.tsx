import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import MovementTable from "@/components/movement/MovementTable";

const meta: Meta<typeof MovementTable> = {
  title: "Components/Movement/MovementTable",
  component: MovementTable,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<typeof MovementTable>;

export const Default: Story = {
  args: {
    table: {
      table: 1,
      rounds: [
        {
          round: 1,
          boards: [1, 2, 3],
          participants: {
            nsId: "2",
            ewId: "3",
          },
        },
        {
          round: 2,
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
