import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";

import { SetupMenuPage } from "./SetupMenuPage";
import { withGame } from "@storybook/decorators/GameDecorator";
import { mockGame } from "@/mocks/fixtures/game";

const meta: Meta<typeof SetupMenuPage> = {
  title: "App/Create/SetupMenuPage",
  component: SetupMenuPage,
  // A saved game's menu sits in the game-aware layout, whose header reads the
  // game.
  decorators: [withGame(mockGame)],
  parameters: { layout: "fullscreen", nextjs: { appDirectory: true } },
  args: {
    onGameDetailsClick: fn(),
    onTablesClick: fn(),
    onMovementClick: fn(),
    onTimerClick: fn(),
    onStartGameClick: fn(),
    onShareAccessClick: fn(),
    onDeleteGameClick: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof SetupMenuPage>;

export const Default: Story = {};
