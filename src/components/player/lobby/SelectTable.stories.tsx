import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import SelectTable from "./SelectTable";

const meta: Meta<typeof SelectTable> = {
  title: "Player/Lobby/SelectTable",
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
  },
};

export const FewTables: Story = {
  args: {
    tables: 3,
  },
};

export const ManyTables: Story = {
  args: {
    tables: 16,
  },
};
