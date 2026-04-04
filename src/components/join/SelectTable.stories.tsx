import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import SelectTable from "./SelectTable";

const meta: Meta<typeof SelectTable> = {
  title: "Components/JoinGame/SelectTable",
  component: SelectTable,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  argTypes: {
    selectTable: { action: "table selected" },
  },
};

export default meta;

type Story = StoryObj<typeof SelectTable>;

export const Default: Story = {
  args: {
    tables: 8,
    assigned: [
      {
        table: 4,
        direction: "NS",
      },
      {
        table: 6,
        direction: "NS",
      },
      {
        table: 6,
        direction: "EW",
      },
    ],
  },
};

export const FewTables: Story = {
  args: {
    tables: 3,
    assigned: [],
  },
};

export const ManyTables: Story = {
  args: {
    tables: 16,
    assigned: [],
  },
};
