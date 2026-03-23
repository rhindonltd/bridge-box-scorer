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
          ns: 2,
          ew: 3,
          boards: [1, 2, 3],
        },
        {
          ns: 4,
          ew: 5,
          boards: [4, 5, 6],
        },
      ],
    },
  },
};
