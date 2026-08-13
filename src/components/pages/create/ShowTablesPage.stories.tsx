import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { ShowTablesPage } from "./ShowTablesPage";

const meta: Meta<typeof ShowTablesPage> = {
  title: "Pages/Create/ShowTablesPage",
  component: ShowTablesPage,
  parameters: {
    layout: "fullscreen",
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<typeof ShowTablesPage>;

export const Default: Story = {};
