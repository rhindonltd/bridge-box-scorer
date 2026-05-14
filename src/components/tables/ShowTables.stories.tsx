import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import ShowTables from "./ShowTables";

const meta: Meta<typeof ShowTables> = {
  title: "Components/Tables/ShowTables",
  component: ShowTables,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<typeof ShowTables>;

export const Default: Story = {
  args: {
    tables: 5,
  },
};
