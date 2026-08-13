import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { DisplayLeaderboardPage } from "./DisplayLeaderboardPage";

const meta: Meta<typeof DisplayLeaderboardPage> = {
  title: "Pages/Display/DisplayLeaderboardPage",
  component: DisplayLeaderboardPage,
  parameters: {
    layout: "fullscreen",
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<typeof DisplayLeaderboardPage>;

export const Default: Story = {};
