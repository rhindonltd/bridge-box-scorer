import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { fn } from "storybook/test";
import { SelectTablePage } from "@/components/pages/player/SelectTablePage";

const meta: Meta<typeof SelectTablePage> = {
  title: "Pages/Player/SelectTablePage",
  component: SelectTablePage,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  args: {
    selectTable: fn(),
  },
};

export default meta;

type Story = StoryObj<typeof SelectTablePage>;

export const Default: Story = {
  args: {
    tables: 8,
  },
};
