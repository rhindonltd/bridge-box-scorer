import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";

import { SetupMenuPage } from "./SetupMenuPage";

const meta: Meta<typeof SetupMenuPage> = {
  title: "App/Create/SetupMenuPage",
  component: SetupMenuPage,
  parameters: { layout: "fullscreen", nextjs: { appDirectory: true } },
  args: {
    onGameDetailsClick: fn(),
    onTablesClick: fn(),
    onMovementClick: fn(),
    onTimerClick: fn(),
    onStartGameClick: fn(),
    onDeleteGameClick: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof SetupMenuPage>;

export const Default: Story = {};
