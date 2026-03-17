import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { fn } from "storybook/test";
import SelectNumberOfTablesPage from "@/components/pages/director/SelectNumberOfTablesPage";

const meta: Meta<typeof SelectNumberOfTablesPage> = {
  title: "Pages/Director/Section/SelectNumberOfTablesPage",
  component: SelectNumberOfTablesPage,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  args: {
    onConfirm: fn(),
  },
};

export default meta;

type Story = StoryObj<typeof SelectNumberOfTablesPage>;

export const Default: Story = {
  args: {
    title: "Monday PM Pairs",
  },
};
