import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import SelectTable from "./SelectTable";

const meta: Meta<typeof SelectTable> = {
  title: "Components/Player/Lobby/SelectTable",
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
    eventName: "Monday PM Pairs",
    tables: 8,
  },
};

export const FewTables: Story = {
  args: {
    eventName: "Monday PM Pairs",
    tables: 3,
  },
};

export const ManyTables: Story = {
  args: {
    eventName: "Monday PM Pairs",
    tables: 16,
  },
};
