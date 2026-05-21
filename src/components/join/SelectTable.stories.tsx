import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import SelectTable from "./SelectTable";

const meta: Meta<typeof SelectTable> = {
  title: "Components/JoinGame/SelectTable",
  component: SelectTable,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<typeof SelectTable>;

export const Default: Story = {
  args: {
    tables: 8,
    assignedPairs: [
      {
        tableNumber: 4,
        pairDirection: "NS",
      },
      {
        tableNumber: 6,
        pairDirection: "NS",
      },
      {
        tableNumber: 6,
        pairDirection: "EW",
      },
    ],
  },
};

export const FewTables: Story = {
  args: {
    tables: 3,
    assignedPairs: [],
  },
};

export const ManyTables: Story = {
  args: {
    tables: 16,
    assignedPairs: [],
  },
};
